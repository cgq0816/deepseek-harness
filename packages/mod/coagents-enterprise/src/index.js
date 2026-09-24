import { createHash, randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { openAsBlob } from 'node:fs'
import { stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { basename, extname, resolve } from 'node:path'

import { credentialKey, credentialRef } from '@deepseek-ai/dsh-credentials'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import * as mcpClient from '@deepseek-ai/dsh-mcp-client'
import { defineTool } from '@deepseek-ai/dsh-tools'

import {
  ConnectionProfileStore,
  normalizeConnectionProfile,
} from './connection-profile.js'
import { DeviceIdentityStore } from './device-identity.js'
import {
  enterpriseManagerSkillDefinition,
  ENTERPRISE_MANAGER_SKILL_NAME,
} from './enterprise-manager-skill.js'
import { managementToolDefinitions } from './management-tools.js'
import { ManagedSkillStore } from './managed-skills.js'
import {
  OCR_SKILL_NAME,
  ocrSkillDefinition,
  ocrToolDefinition,
} from './ocr-capability.js'
import {
  DSH_RUNTIME_BASELINE,
  ENTERPRISE_PLUGIN_VERSION,
  ENTERPRISE_RELEASE_LABEL,
} from './release-info.js'


export const name = 'coagents-enterprise'
export const inject = ['connection', 'credentials', 'settings', 'skills', 'tools', 'webServer']

const ROUTE = '/coagents-enterprise'
const SESSION_KEY = credentialKey('coagents-enterprise', 'session')
const CONNECTION_PROFILE_KEY = credentialKey('coagents-enterprise', 'connection-profile')
const DEVICE_IDENTITY_KEY = credentialKey('coagents-enterprise', 'device-identity')
const LEGACY_SESSION_KEY = credentialKey('rclaw-enterprise', 'session')
const ACCESS_REF = credentialRef('ENTERPRISE_DESKTOP_ACCESS_TOKEN')
const LEGACY_ACCESS_REF = credentialRef('RCLAW_DESKTOP_ACCESS_TOKEN')
// DSH 0.1.5 validates namespace literals at the Settings service boundary and
// no longer exports the runtime settingsNamespace() branding helper.
const PI_AI_NS = 'llm-pi-ai'
const LOCAL_AGENT_ID = 'dsh-default'
const JSON_LIMIT = 1024 * 1024
const OCR_SUPPORTED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.jp2', '.webp', '.gif', '.bmp'])
const OCR_VISIBLE_MARKDOWN_CHARS = 16_000
const BUNDLED_SKILL_NAMES = new Set([ENTERPRISE_MANAGER_SKILL_NAME, OCR_SKILL_NAME])

const TOOL_OUTPUT = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

function jwtExpiry(token) {
  try {
    const encoded = token.split('.')[1]
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=')
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
    return Number(payload.exp || 0) * 1000
  } catch {
    return 0
  }
}

function pkceChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url')
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendAsset(res, contentType, body) {
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-cache',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendError(res, status, error) {
  sendJson(res, status, { error: error instanceof Error ? error.message : String(error) })
}

function delay(ms, signal) {
  return new Promise((resolveDelay, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new Error('OCR 操作已取消'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason || new Error('OCR 操作已取消'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolveDelay()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function ocrMimeType(extension) {
  if (extension === '.pdf') return 'application/pdf'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.jp2') return 'image/jp2'
  return `image/${extension.slice(1)}`
}

function boundedOcrResult(markdown, artifactPath, extra = {}) {
  const text = String(markdown || '')
  if (!text.trim()) throw new Error('企业 OCR 没有返回可用的 Markdown')
  const truncated = text.length > OCR_VISIBLE_MARKDOWN_CHARS
  return {
    status: 'success',
    markdown: truncated ? text.slice(0, OCR_VISIBLE_MARKDOWN_CHARS) : text,
    markdown_chars: text.length,
    output_truncated: truncated,
    artifact_path: artifactPath,
    ...extra,
  }
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > JSON_LIMIT) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('request body must be a JSON object')
  }
  return parsed
}

function openExternal(url) {
  let command
  let args
  if (process.platform === 'win32') {
    command = 'rundll32.exe'
    args = ['url.dll,FileProtocolHandler', url]
  } else if (process.platform === 'darwin') {
    command = 'open'
    args = [url]
  } else {
    command = 'xdg-open'
    args = [url]
  }
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'code' in payload) {
    if (Number(payload.code) !== 0) throw new Error(String(payload.message || '企业服务请求失败'))
    return payload.data
  }
  return payload
}

class EnterpriseRuntime {
  constructor(ctx, config) {
    this.ctx = ctx
    this.startupProfile = normalizeConnectionProfile({
      baseUrl: config.baseUrl || 'http://127.0.0.1:8000',
      orgCode: config.orgCode || 'default',
    })
    this.baseUrl = this.startupProfile.baseUrl
    this.orgCode = this.startupProfile.orgCode
    this.connectionSource = 'startup'
    this.allowConnectionEditing = config.allowConnectionEditing !== false
    this.connectionStore = new ConnectionProfileStore(
      ctx.credentials,
      CONNECTION_PROFILE_KEY,
      this.startupProfile,
    )
    this.deviceStore = new DeviceIdentityStore(ctx.credentials, DEVICE_IDENTITY_KEY)
    this.clientVersion = String(config.clientVersion || ENTERPRISE_PLUGIN_VERSION).trim()
    this.deviceIdentity = null
    this.deviceName = os.hostname()
    this.platform = process.platform
    this.openBrowser = config.openBrowser !== false
    this.session = null
    this.pending = new Map()
    this.mcpFiber = null
    this.refreshTimer = null
    this.catalogTimer = null
    this.webPort = null
    this.modelCount = 0
    this.lastSyncError = null
    this.mcpConnected = false
    this.skillCatalogReady = false
    this.connectorCatalogReady = false
    this.connectorInstalledCount = 0
    this.connectorEnabledCount = 0
    this.resourceStatusError = null
    this.skillStore = new ManagedSkillStore(dshHomePath())
    this.skillDisposers = new Map()
    this.managerSkillDisposer = null
    this.ocrSkillDisposer = null
    this.toolDisposers = []
  }

  async restoreConnectionProfile() {
    if (!this.allowConnectionEditing) return
    try {
      const profile = await this.connectionStore.load()
      this.baseUrl = profile.baseUrl
      this.orgCode = profile.orgCode
      this.connectionSource = profile.source
    } catch (error) {
      this.ctx.logger.warn(`coagents-enterprise: saved connection profile is invalid: ${error}`)
    }
  }

  async restore() {
    const current = await this.ctx.credentials.readRecord(SESSION_KEY)
    const legacy = current ? null : await this.ctx.credentials.readRecord(LEGACY_SESSION_KEY)
    const record = current || legacy
    const sessionPayload = record?.kind === 'grant' && record.payload && typeof record.payload === 'object'
      ? record.payload
      : null
    this.deviceIdentity = await this.deviceStore.loadOrCreate(sessionPayload?.deviceUuid)
    if (!sessionPayload) return
    this.session = { ...sessionPayload, deviceUuid: this.deviceIdentity.deviceUuid }
    if (!this.session.accessToken || !this.session.refreshToken) {
      this.session = null
      return
    }
    if (this.session.baseUrl !== this.baseUrl || this.session.orgCode !== this.orgCode) {
      this.ctx.logger.info('coagents-enterprise: connection profile changed; clearing the previous session')
      await this.logout()
      return
    }
    try {
      await this.ensureFreshToken()
      await this.registerCurrentDevice()
      await this.activateSession()
    } catch (error) {
      this.session = null
      try {
        await this.ctx.credentials.unset(ACCESS_REF)
        await this.ctx.credentials.unset(LEGACY_ACCESS_REF)
      } catch (clearError) {
        this.ctx.logger.warn(`coagents-enterprise: stale access token could not be cleared: ${clearError}`)
      }
      this.ctx.logger.warn(`coagents-enterprise: saved session could not be restored: ${error}`)
    }
  }

  async persistSession() {
    const payload = { ...this.session }
    await this.ctx.credentials.modifyRecord(SESSION_KEY, async () => ({ kind: 'grant', payload }))
    await this.ctx.credentials.set(ACCESS_REF, payload.accessToken)
    try {
      await this.ctx.credentials.deleteRecord(LEGACY_SESSION_KEY)
      await this.ctx.credentials.unset(LEGACY_ACCESS_REF)
    } catch (error) {
      this.ctx.logger.debug(`coagents-enterprise: legacy credential cleanup skipped: ${error}`)
    }
    this.scheduleRefresh()
    this.scheduleCatalogSync()
  }

  scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    const expiry = jwtExpiry(this.session?.accessToken || '')
    if (!expiry) return
    const delay = Math.max(10_000, expiry - Date.now() - 60_000)
    this.refreshTimer = setTimeout(() => {
      this.refresh().then(async () => {
        await this.syncModelsSafely()
        await this.restartMcp()
        await this.syncEnterpriseResourcesSafely()
      }).catch(error => {
        this.ctx.logger.warn(`coagents-enterprise: token refresh failed: ${error}`)
      })
    }, delay)
  }

  scheduleCatalogSync() {
    if (this.catalogTimer) clearInterval(this.catalogTimer)
    if (!this.session) return
    this.catalogTimer = setInterval(() => {
      this.syncModelsSafely().catch(error => {
        this.ctx.logger.warn(`coagents-enterprise: model catalog sync failed: ${error}`)
      })
      this.syncEnterpriseResourcesSafely().catch(error => {
        this.ctx.logger.warn(`coagents-enterprise: resource status sync failed: ${error}`)
      })
    }, 5 * 60 * 1000)
  }

  async request(path, init = {}, { auth = true } = {}) {
    if (auth) await this.ensureFreshToken()
    const formBody = typeof FormData !== 'undefined' && init.body instanceof FormData
    const headers = {
      accept: 'application/json',
      ...(init.body && !formBody ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    }
    if (auth) {
      headers.authorization = `Bearer ${this.session.accessToken}`
      headers['x-enterprise-device-id'] = this.session.deviceUuid
      // Transitional compatibility for RClaw deployments that have not yet
      // reloaded the neutral Enterprise header aliases.
      headers['x-rclaw-device-id'] = this.session.deviceUuid
    }
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    const text = await response.text()
    let payload
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { message: text || `HTTP ${response.status}` }
    }
    if (!response.ok) throw new Error(String(payload.detail || payload.message || `HTTP ${response.status}`))
    return unwrap(payload)
  }

  async ensureFreshToken() {
    if (!this.session) throw new Error('尚未登录企业账号')
    const expiry = jwtExpiry(this.session.accessToken)
    if (expiry && expiry - Date.now() > 60_000) return
    await this.refresh()
  }

  async refresh() {
    if (!this.session?.refreshToken) throw new Error('企业账号登录已失效')
    const tokens = await this.request('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this.session.refreshToken }),
    }, { auth: false })
    this.session.accessToken = tokens.access_token
    this.session.refreshToken = tokens.refresh_token
    await this.persistSession()
  }

  async revokeSession(session) {
    if (!session?.accessToken && !session?.refreshToken) return
    try {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({
          access_token: session.accessToken || null,
          refresh_token: session.refreshToken || null,
        }),
      }, { auth: false })
    } catch (error) {
      this.ctx.logger.warn(`coagents-enterprise: server session revocation failed: ${error}`)
    }
  }

  async beginLogin(interaction = 'login') {
    if (!['login', 'switch_account'].includes(interaction)) {
      throw new Error('不支持的企业登录操作')
    }
    const verifier = randomBytes(48).toString('base64url')
    const state = randomBytes(24).toString('base64url')
    if (!this.webPort) throw new Error('DSH Web 服务尚未就绪')
    const callback = `http://127.0.0.1:${this.webPort}${ROUTE}/oauth/callback`
    const response = await this.request('/api/v1/auth/desktop/authorize', {
      method: 'POST',
      body: JSON.stringify({
        org_code: this.orgCode,
        return_url: callback,
        code_challenge: pkceChallenge(verifier),
        code_challenge_method: 'S256',
        client_state: state,
        interaction,
      }),
    }, { auth: false })
    this.pending.set(state, { verifier, createdAt: Date.now(), interaction })
    for (const [key, value] of this.pending) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) this.pending.delete(key)
    }
    if (this.openBrowser) openExternal(response.redirect_url)
    return { launched: this.openBrowser, redirectUrl: response.redirect_url, interaction }
  }

  async finishLogin(url) {
    const state = String(url.searchParams.get('state') || '')
    const pending = this.pending.get(state)
    this.pending.delete(state)
    if (!pending) throw new Error('登录请求已失效，请从 DSH 重新发起')
    const authError = url.searchParams.get('auth_error') || url.searchParams.get('sso_error')
    if (authError) throw new Error(`企业账号登录失败：${authError}`)
    const ticket = String(url.searchParams.get('auth_ticket') || url.searchParams.get('sso_ticket') || '')
    if (!ticket) throw new Error('企业身份服务未返回登录票据')
    const previousSession = this.session ? { ...this.session } : null
    const tokens = await this.request('/api/v1/auth/desktop/exchange', {
      method: 'POST',
      body: JSON.stringify({ ticket, code_verifier: pending.verifier }),
    }, { auth: false })
    if (!this.deviceIdentity) {
      this.deviceIdentity = await this.deviceStore.loadOrCreate(previousSession?.deviceUuid)
    }
    this.session = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      deviceUuid: this.deviceIdentity.deviceUuid,
      user: null,
      orgId: null,
      baseUrl: this.baseUrl,
      orgCode: this.orgCode,
    }
    await this.registerCurrentDevice()
    await this.request('/api/v1/desktop/agent-instances', {
      method: 'POST',
      body: JSON.stringify({ local_agent_id: LOCAL_AGENT_ID, display_name: 'DSH 默认 Agent' }),
    })
    await this.persistSession()
    await this.activateSession()
    if (pending.interaction === 'switch_account' && previousSession) {
      await this.revokeSession(previousSession)
    }
  }

  async registerCurrentDevice() {
    if (!this.session) throw new Error('尚未登录企业账号')
    if (!this.deviceIdentity) {
      this.deviceIdentity = await this.deviceStore.loadOrCreate(this.session.deviceUuid)
    }
    this.session.deviceUuid = this.deviceIdentity.deviceUuid
    const registration = await this.request('/api/v1/desktop/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        device_uuid: this.session.deviceUuid,
        device_name: this.deviceName,
        platform: this.platform,
        client_version: this.clientVersion,
      }),
    })
    this.session.user = registration.user
    this.session.orgId = registration.org_id
    this.session.deviceId = registration.id
    this.session.deviceStatus = registration.status
    return registration
  }

  async activateSession() {
    await this.ctx.credentials.set(ACCESS_REF, this.session.accessToken)
    // The model sync writes the profile's `llm-pi-ai` settings, and that write
    // reloads the profile Loader, which awaits every fiber — including this
    // plugin's own, still inside apply(). Running it inline deadlocks startup,
    // so the rest of activation runs once this fiber has settled.
    setTimeout(() => {
      this.completeActivation().catch(error => {
        this.ctx.logger.warn(`coagents-enterprise: deferred activation failed: ${error}`)
      })
    }, 0)
    this.scheduleRefresh()
    this.scheduleCatalogSync()
  }

  async completeActivation() {
    await this.syncModelsSafely()
    await this.restartMcp()
    await this.restoreManagedSkills()
    await this.syncEnterpriseResourcesSafely()
  }

  async syncEnterpriseResourcesSafely() {
    const [skillsResult, connectorsResult] = await Promise.allSettled([
      this.skills(),
      this.connectors(),
    ])
    this.skillCatalogReady = skillsResult.status === 'fulfilled'
    this.connectorCatalogReady = connectorsResult.status === 'fulfilled'
    this.resourceStatusError = null

    if (connectorsResult.status === 'fulfilled') {
      const items = Array.isArray(connectorsResult.value?.items) ? connectorsResult.value.items : []
      this.connectorInstalledCount = items.filter(item => item?.installed).length
      this.connectorEnabledCount = items.filter(item => item?.installed && item?.enabled).length
    } else {
      this.connectorInstalledCount = 0
      this.connectorEnabledCount = 0
    }

    const errors = [skillsResult, connectorsResult]
      .filter(result => result.status === 'rejected')
      .map(result => result.reason instanceof Error ? result.reason.message : String(result.reason))
    if (errors.length > 0) this.resourceStatusError = errors.join('；')
    return this.status()
  }

  async syncModelsSafely() {
    try {
      return await this.syncModels()
    } catch (error) {
      this.lastSyncError = error instanceof Error ? error.message : String(error)
      this.ctx.logger.warn(`coagents-enterprise: model catalog sync failed: ${error}`)
      return { count: 0, error: this.lastSyncError }
    }
  }

  async syncModels() {
    const response = await this.request('/api/v1/desktop/models')
    const items = Array.isArray(response?.items) ? response.items : []
    if (items.length === 0) throw new Error('当前租户没有可用的企业模型')
    const profile = {
      displayName: '企业模型',
      apiKeyEnv: 'ENTERPRISE_DESKTOP_ACCESS_TOKEN',
      api: 'openai-completions',
      baseURL: `${this.baseUrl}/api/v1/desktop/model-gateway/v1`,
      headers: {
        'X-Enterprise-Device-ID': this.session.deviceUuid,
        'X-Enterprise-Agent-ID': LOCAL_AGENT_ID,
        'X-RClaw-Device-ID': this.session.deviceUuid,
        'X-RClaw-Agent-ID': LOCAL_AGENT_ID,
      },
      compat: { supportsDeveloperRole: false, maxTokensField: 'max_tokens' },
      models: items.map(item => ({
        id: item.id,
        name: item.name,
        contextWindow: item.context_window,
        maxTokens: item.max_tokens,
        input: Array.isArray(item.input) ? item.input : ['text'],
      })),
    }
    await this.ctx.settings.mutate(PI_AI_NS, [
      { op: 'set', path: ['providers', 'enterprise'], value: profile },
      { op: 'unset', path: ['providers', 'rclaw'] },
    ])
    this.modelCount = items.length
    this.lastSyncError = null
    return { count: items.length }
  }

  async restartMcp() {
    if (this.mcpFiber) {
      await this.mcpFiber.dispose()
      this.mcpFiber = null
    }
    this.mcpConnected = false
    if (!this.session) return
    this.mcpFiber = this.ctx.plugin(mcpClient, {
      transport: 'streamable-http',
      serverName: 'enterprise',
      url: `${this.baseUrl}/api/v1/desktop/mcp`,
      headers: {
        Authorization: `Bearer ${this.session.accessToken}`,
        'X-Enterprise-Device-ID': this.session.deviceUuid,
        'X-Enterprise-Agent-ID': LOCAL_AGENT_ID,
        'X-RClaw-Device-ID': this.session.deviceUuid,
        'X-RClaw-Agent-ID': LOCAL_AGENT_ID,
      },
      toolCallTimeoutMs: 60_000,
      failOnStartupError: false,
      reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30_000, maxAttempts: 10 },
    })
    await this.mcpFiber
    this.mcpConnected = true
  }

  async connectors(q = null) {
    const params = new URLSearchParams({ local_agent_id: LOCAL_AGENT_ID })
    if (q) params.set('q', String(q))
    const response = await this.request(`/api/v1/desktop/connectors?${params}`)
    const items = Array.isArray(response?.items) ? response.items : []
    this.connectorCatalogReady = true
    this.connectorInstalledCount = items.filter(item => item?.installed).length
    this.connectorEnabledCount = items.filter(item => item?.installed && item?.enabled).length
    return response
  }

  async connectorAction(body) {
    const connectorId = Number(body.connectorId)
    if (!Number.isInteger(connectorId) || connectorId <= 0) throw new Error('连接器 ID 无效')
    const action = String(body.action || '')
    const root = `/api/v1/desktop/agent-instances/${LOCAL_AGENT_ID}/connectors`
    if (action === 'install') {
      await this.request(root, { method: 'POST', body: JSON.stringify({ connector_id: connectorId }) })
    } else if (action === 'enable' || action === 'disable') {
      await this.request(`${root}/${connectorId}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: action === 'enable' }),
      })
    } else if (action === 'uninstall') {
      await this.request(`${root}/${connectorId}`, { method: 'DELETE' })
    } else {
      throw new Error('未知连接器操作')
    }
    await this.restartMcp()
    return this.connectors()
  }

  async skills(q = null) {
    const params = new URLSearchParams({ limit: '100' })
    if (q) params.set('q', String(q))
    const response = await this.request(`/api/v1/desktop/skills?${params}`)
    this.skillCatalogReady = true
    const installed = new Map(
      (await this.skillStore.list())
        .filter(item => Number(item.orgId) === Number(this.session.orgId))
        .map(item => [Number(item.skillId), item]),
    )
    return {
      items: (Array.isArray(response?.items) ? response.items : []).map(item => {
        const local = installed.get(Number(item.id))
        return {
          ...item,
          installed: local !== undefined,
          installed_version: local?.version || null,
        }
      }),
    }
  }

  async approveMutation(exec, reason) {
    const approval = this.ctx.get('approval')
    if (!approval) throw new Error('当前 DSH 预设没有用户审批服务，不能执行受控企业操作')
    if (!exec.agent) throw new Error('该操作必须在 DSH Agent 对话中发起')
    const outcome = await approval.request({
      agent: exec.agent,
      toolName: exec.name,
      callId: exec.callId,
      reason,
      signal: exec.signal,
    })
    if (outcome !== 'allowed-once') throw new Error(`用户未批准操作（${outcome}）`)
  }

  unregisterManagedSkill(name) {
    const dispose = this.skillDisposers.get(name)
    if (!dispose) return
    this.skillDisposers.delete(name)
    dispose()
  }

  async registerEnterpriseManagerSkill() {
    if (this.managerSkillDisposer) return
    this.managerSkillDisposer = this.ctx.skills.register(await enterpriseManagerSkillDefinition())
  }

  async registerOcrSkill() {
    if (this.ocrSkillDisposer) return
    this.ocrSkillDisposer = this.ctx.skills.register(await ocrSkillDefinition())
  }

  async registerManagedSkill(marker) {
    if (BUNDLED_SKILL_NAMES.has(marker.name)) {
      throw new Error(`Skill 名称 ${marker.name} 由企业插件保留`)
    }
    this.unregisterManagedSkill(marker.name)
    const definition = await this.skillStore.readDefinition(marker)
    const dispose = this.ctx.skills.register(definition)
    this.skillDisposers.set(marker.name, dispose)
  }

  async restoreManagedSkills() {
    for (const name of [...this.skillDisposers.keys()]) this.unregisterManagedSkill(name)
    if (!this.session) return
    const installed = await this.skillStore.list()
    for (const marker of installed) {
      if (Number(marker.orgId) !== Number(this.session.orgId)) continue
      try {
        await this.registerManagedSkill(marker)
      } catch (error) {
        this.ctx.logger.warn(`coagents-enterprise: managed Skill ${marker.name} could not be loaded: ${error}`)
      }
    }
  }

  async installSkill(skillId, version, exec) {
    const normalizedId = Number(skillId)
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) throw new Error('Skill ID 无效')
    await this.approveMutation(
      exec,
      `允许从企业 Skill 中心下载并安装 Skill ${normalizedId}${version ? `（${version}）` : ''} 到本机 DSH？`,
    )
    const params = new URLSearchParams()
    if (version) params.set('version', String(version))
    const suffix = params.size > 0 ? `?${params}` : ''
    const pkg = await this.request(`/api/v1/desktop/skills/${normalizedId}/package${suffix}`)
    if (BUNDLED_SKILL_NAMES.has(String(pkg?.name || ''))) {
      throw new Error(`Skill 名称 ${pkg.name} 由企业插件保留`)
    }
    const marker = await this.skillStore.install(pkg, { orgId: this.session.orgId })
    await this.registerManagedSkill(marker)
    return {
      installed: true,
      upgraded: marker.upgraded,
      skill_id: marker.skillId,
      name: marker.name,
      version: marker.version,
      message: `Skill ${marker.name}@${marker.version} 已安装；后续匹配任务会按 DSH 规则先加载该 Skill。`,
    }
  }

  async uninstallSkill(skillId, exec) {
    const normalizedId = Number(skillId)
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) throw new Error('Skill ID 无效')
    const existing = await this.skillStore.getBySkillId(normalizedId, this.session.orgId)
    if (!existing) throw new Error(`本机未安装企业 Skill：${normalizedId}`)
    await this.approveMutation(exec, `允许从本机 DSH 卸载 Skill ${existing.name}@${existing.version}？`)
    await this.skillStore.uninstall(normalizedId, { orgId: this.session.orgId })
    this.unregisterManagedSkill(existing.name)
    return {
      installed: false,
      skill_id: normalizedId,
      name: existing.name,
      version: existing.version,
      message: `Skill ${existing.name} 已从本机卸载。`,
    }
  }

  async parseOcr(filePath, timeoutSeconds, exec) {
    if (!this.session) throw new Error('尚未登录企业账号，请先前往「设置 → 企业」登录')
    const normalizedPath = resolve(String(filePath || '').trim())
    const extension = extname(normalizedPath).toLowerCase()
    if (!OCR_SUPPORTED_EXTENSIONS.has(extension)) {
      throw new Error('企业 OCR 仅支持 PDF 和常见图片格式')
    }
    const fileInfo = await stat(normalizedPath)
    if (!fileInfo.isFile() || fileInfo.size <= 0) throw new Error('OCR 输入文件不存在或为空')
    const parsedTimeout = timeoutSeconds === undefined || timeoutSeconds === null
      ? undefined
      : Number(timeoutSeconds)
    if (parsedTimeout !== undefined && (!Number.isInteger(parsedTimeout) || parsedTimeout <= 0 || parsedTimeout > 7500)) {
      throw new Error('timeout_seconds 必须是 1 到 7500 之间的整数')
    }

    await this.approveMutation(
      exec,
      `允许将本地文件 ${basename(normalizedPath)} 上传到企业 OCR 服务并在原文件旁保存识别结果？`,
    )

    const body = new FormData()
    const mime = ocrMimeType(extension)
    body.append('file', await openAsBlob(normalizedPath, { type: mime }), basename(normalizedPath))
    if (parsedTimeout !== undefined) body.append('timeout_seconds', String(parsedTimeout))
    const headers = {
      'X-Enterprise-Agent-ID': LOCAL_AGENT_ID,
      'X-RClaw-Agent-ID': LOCAL_AGENT_ID,
    }
    const created = await this.request('/api/v1/desktop/ocr/jobs', {
      method: 'POST',
      headers,
      body,
      signal: exec?.signal,
    })
    const jobId = String(created?.job_id || '')
    if (!jobId) throw new Error('企业 OCR 没有返回任务标识')

    const deadline = Date.now() + ((parsedTimeout || 7500) + 30) * 1000
    try {
      while (Date.now() < deadline) {
        const current = await this.request(`/api/v1/desktop/ocr/jobs/${encodeURIComponent(jobId)}`, {
          headers,
          signal: exec?.signal,
        })
        if (current?.terminal) {
          if (current.error) {
            throw new Error(`${current.error.code || 'MINERU_PARSE_FAILED'}：${current.error.message || '企业 OCR 处理失败'}`)
          }
          const result = current.result || {}
          const markdown = String(result.markdown || '')
          const artifactPath = `${normalizedPath}.mineru.md`
          await writeFile(artifactPath, markdown, { encoding: 'utf8', mode: 0o600 })
          return boundedOcrResult(markdown, artifactPath, {
            job_id: jobId,
            page_count: result.page_count ?? null,
          })
        }
        await delay(1000, exec?.signal)
      }
      throw new Error('企业 OCR 等待结果超时')
    } catch (error) {
      try {
        await this.request(`/api/v1/desktop/ocr/jobs/${encodeURIComponent(jobId)}/cancel`, {
          method: 'POST',
          headers,
        })
      } catch {
        // The server deadline and reconciler remain the final cleanup boundary.
      }
      throw error
    }
  }

  registerTools() {
    const definitions = [
      ...managementToolDefinitions(this, TOOL_OUTPUT),
      ocrToolDefinition(this, TOOL_OUTPUT),
    ]
    for (const definition of definitions) {
      const dispose = this.ctx.tools.register(defineTool(definition))
      this.toolDisposers.push(dispose)
    }
  }

  status() {
    const registered = this.session !== null
    return {
      configured: true,
      baseUrl: this.baseUrl,
      orgCode: this.orgCode,
      connectionSource: this.connectionSource,
      connectionEditable: this.allowConnectionEditing,
      pluginVersion: ENTERPRISE_PLUGIN_VERSION,
      dshRuntimeBaseline: DSH_RUNTIME_BASELINE,
      releaseLabel: ENTERPRISE_RELEASE_LABEL,
      device: this.deviceIdentity ? {
        id: this.session?.deviceId || null,
        uuid: this.deviceIdentity.deviceUuid,
        name: this.deviceName,
        platform: this.platform,
        clientVersion: this.clientVersion,
        registered,
        status: registered ? (this.session?.deviceStatus || 'active') : 'local',
      } : null,
      authenticated: this.session !== null,
      user: this.session?.user || null,
      modelCount: this.modelCount,
      modelReady: this.modelCount > 0 && !this.lastSyncError,
      modelError: this.lastSyncError,
      mcpReady: this.mcpConnected,
      managerSkillReady: this.managerSkillDisposer !== null,
      skillCatalogReady: this.skillCatalogReady,
      connectorCatalogReady: this.connectorCatalogReady,
      connectorInstalledCount: this.connectorInstalledCount,
      connectorEnabledCount: this.connectorEnabledCount,
      documentToolsReady: this.mcpConnected,
      ocrReady: this.ocrSkillDisposer !== null && this.toolDisposers.length > 0,
      resourceStatusError: this.resourceStatusError,
      capabilities: {
        models: true,
        skills: true,
        connectors: true,
        documents: true,
        ocr: true,
      },
    }
  }

  async saveConnectionProfile(value) {
    if (!this.allowConnectionEditing) throw new Error('当前安装包由企业统一管理连接配置')
    const profile = normalizeConnectionProfile(value)
    if (
      profile.baseUrl === this.baseUrl
      && profile.orgCode === this.orgCode
      && this.connectionSource === 'saved'
    ) {
      return this.status()
    }
    await this.logout()
    const saved = await this.connectionStore.save(profile)
    this.baseUrl = saved.baseUrl
    this.orgCode = saved.orgCode
    this.connectionSource = saved.source
    this.pending.clear()
    return this.status()
  }

  async resetConnectionProfile() {
    if (!this.allowConnectionEditing) throw new Error('当前安装包由企业统一管理连接配置')
    await this.logout()
    const profile = await this.connectionStore.reset()
    this.baseUrl = profile.baseUrl
    this.orgCode = profile.orgCode
    this.connectionSource = profile.source
    this.pending.clear()
    return this.status()
  }

  async logout() {
    const previousSession = this.session ? { ...this.session } : null
    await this.revokeSession(previousSession)
    if (this.mcpFiber) await this.mcpFiber.dispose()
    this.mcpFiber = null
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = null
    if (this.catalogTimer) clearInterval(this.catalogTimer)
    this.catalogTimer = null
    this.session = null
    this.modelCount = 0
    this.lastSyncError = null
    this.mcpConnected = false
    this.skillCatalogReady = false
    this.connectorCatalogReady = false
    this.connectorInstalledCount = 0
    this.connectorEnabledCount = 0
    this.resourceStatusError = null
    for (const name of [...this.skillDisposers.keys()]) this.unregisterManagedSkill(name)
    await this.ctx.credentials.unset(ACCESS_REF)
    await this.ctx.credentials.unset(LEGACY_ACCESS_REF)
    await this.ctx.credentials.deleteRecord(SESSION_KEY)
    try {
      await this.ctx.credentials.deleteRecord(LEGACY_SESSION_KEY)
    } catch {
      // A legacy record may not exist or may be owned by an old plugin version.
    }
    await this.ctx.settings.mutate(PI_AI_NS, [
      { op: 'unset', path: ['providers', 'enterprise'] },
      { op: 'unset', path: ['providers', 'rclaw'] },
    ])
  }

  async dispose() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    if (this.catalogTimer) clearInterval(this.catalogTimer)
    if (this.mcpFiber) await this.mcpFiber.dispose()
    for (const name of [...this.skillDisposers.keys()]) this.unregisterManagedSkill(name)
    if (this.managerSkillDisposer) this.managerSkillDisposer()
    this.managerSkillDisposer = null
    if (this.ocrSkillDisposer) this.ocrSkillDisposer()
    this.ocrSkillDisposer = null
    for (const dispose of this.toolDisposers.splice(0)) dispose()
  }
}

async function handle(runtime, connection, req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const host = String(req.headers.host || '').toLowerCase()
  const allowedHosts = new Set([
    `127.0.0.1:${runtime.webPort}`,
    `localhost:${runtime.webPort}`,
  ])
  if (!allowedHosts.has(host)) {
    sendError(res, 403, 'invalid local host')
    return
  }
  if (url.pathname === `${ROUTE}/oauth/callback` && req.method === 'GET') {
    try {
      await runtime.finishLogin(url)
      const html = '<!doctype html><meta charset="utf-8"><title>企业账号登录成功</title><body style="font-family:sans-serif;padding:32px"><h2>企业账号登录成功</h2><p>正在返回 DSH…</p><script>if(window.opener){window.opener.location.reload();window.close()}else{window.location.replace("/")}</script></body>'
      sendAsset(res, 'text/html; charset=utf-8', html)
    } catch (error) {
      const html = `<!doctype html><meta charset="utf-8"><title>企业账号登录失败</title><body style="font-family:sans-serif;padding:32px"><h2>企业账号登录失败</h2><p>${String(error).replace(/[<>&]/g, '')}</p></body>`
      res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
    }
    return
  }
  const rejection = connection.requestRejection(req)
  if (rejection) {
    sendError(res, rejection, rejection === 401 ? 'unauthorized browser session' : 'untrusted browser request')
    return
  }
  if (url.pathname === `${ROUTE}/api/status` && req.method === 'GET') {
    sendJson(res, 200, runtime.status())
    return
  }
  if (url.pathname === `${ROUTE}/api/login` && req.method === 'POST') {
    const body = await readJson(req)
    sendJson(res, 200, await runtime.beginLogin(String(body.interaction || 'login')))
    return
  }
  if (url.pathname === `${ROUTE}/api/logout` && req.method === 'POST') {
    await runtime.logout()
    sendJson(res, 200, runtime.status())
    return
  }
  if (url.pathname === `${ROUTE}/api/connection` && req.method === 'PUT') {
    sendJson(res, 200, await runtime.saveConnectionProfile(await readJson(req)))
    return
  }
  if (url.pathname === `${ROUTE}/api/connection` && req.method === 'DELETE') {
    sendJson(res, 200, await runtime.resetConnectionProfile())
    return
  }
  sendError(res, 404, 'not found')
}

export async function apply(ctx, config = {}) {
  const runtime = new EnterpriseRuntime(ctx, config)
  await runtime.restoreConnectionProfile()
  runtime.registerTools()
  await runtime.registerEnterpriseManagerSkill()
  await runtime.registerOcrSkill()
  await runtime.restore()
  runtime.webPort = ctx.webServer.port
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: (req, res) => handle(runtime, ctx.connection, req, res).catch(error => {
      ctx.logger.warn(error)
      if (!res.headersSent) sendError(res, 500, error)
      else res.end()
    }),
  }), 'coagents-enterprise: routes')

  return () => runtime.dispose()
}
