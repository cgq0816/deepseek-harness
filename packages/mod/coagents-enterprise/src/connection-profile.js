const PROFILE_VERSION = 1


export function normalizeEnterpriseBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw) throw new Error('请填写企业服务地址')

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('企业服务地址必须是有效的 HTTP(S) URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('企业服务地址必须使用 HTTP 或 HTTPS')
  }
  if (parsed.username || parsed.password) {
    throw new Error('企业服务地址不能包含用户名或密码')
  }
  if (parsed.search || parsed.hash) {
    throw new Error('企业服务地址不能包含查询参数或锚点')
  }
  return raw
}

export function normalizeEnterpriseOrgCode(value) {
  const code = String(value || '').trim()
  if (!code) throw new Error('请填写组织编码')
  if (code.length > 50) throw new Error('组织编码不能超过 50 个字符')
  if (/\s/.test(code)) throw new Error('组织编码不能包含空白字符')
  return code
}

export function normalizeConnectionProfile(value) {
  return {
    baseUrl: normalizeEnterpriseBaseUrl(value?.baseUrl),
    orgCode: normalizeEnterpriseOrgCode(value?.orgCode),
  }
}

export class ConnectionProfileStore {
  constructor(credentials, key, defaults) {
    this.credentials = credentials
    this.key = key
    this.defaults = normalizeConnectionProfile(defaults)
  }

  async load() {
    const record = await this.credentials.readRecord(this.key)
    if (record?.kind !== 'grant' || !record.payload || typeof record.payload !== 'object') {
      return { ...this.defaults, source: 'startup' }
    }
    if (Number(record.payload.version) !== PROFILE_VERSION) {
      return { ...this.defaults, source: 'startup' }
    }
    return {
      ...normalizeConnectionProfile(record.payload),
      source: 'saved',
    }
  }

  async save(value) {
    const profile = normalizeConnectionProfile(value)
    await this.credentials.modifyRecord(this.key, async () => ({
      kind: 'grant',
      payload: { version: PROFILE_VERSION, ...profile },
    }))
    return { ...profile, source: 'saved' }
  }

  async reset() {
    await this.credentials.deleteRecord(this.key)
    return { ...this.defaults, source: 'startup' }
  }
}
