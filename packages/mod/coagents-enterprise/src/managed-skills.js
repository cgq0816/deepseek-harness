import { createHash, randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'


const MARKER = '.enterprise-managed.json'
const LEGACY_MARKER = '.rclaw-managed.json'
const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const SHA256_RE = /^[a-f0-9]{64}$/
const MAX_FILES = 512
const MAX_BYTES = 8 * 1024 * 1024

function absent(error) {
  return error && typeof error === 'object' && error.code === 'ENOENT'
}

function assertPositiveInteger(value, label) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} 无效`)
  return parsed
}

function safeRelativePath(value) {
  const path = String(value || '')
  if (
    !path
    || path.includes('\\')
    || path.startsWith('/')
    || /^[A-Za-z]:/.test(path)
    || path.includes('\0')
  ) throw new Error(`技能包包含不安全路径：${path || '<empty>'}`)
  const parts = path.split('/')
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error(`技能包包含不安全路径：${path}`)
  }
  return path
}

function decodeFile(file) {
  const path = safeRelativePath(file?.path)
  const encoded = String(file?.content_base64 || '')
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error(`技能文件 ${path} 的 Base64 内容无效`)
  }
  const content = Buffer.from(encoded, 'base64')
  const expectedSize = Number(file?.size)
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0 || content.length !== expectedSize) {
    throw new Error(`技能文件 ${path} 的大小校验失败`)
  }
  const expectedHash = String(file?.sha256 || '')
  const actualHash = createHash('sha256').update(content).digest('hex')
  if (!SHA256_RE.test(expectedHash) || actualHash !== expectedHash) {
    throw new Error(`技能文件 ${path} 的完整性校验失败`)
  }
  return { path, content }
}

function validatePackage(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('企业技能包格式无效')
  const skillId = assertPositiveInteger(pkg.id, 'Skill ID')
  const name = String(pkg.name || '')
  if (!NAME_RE.test(name)) throw new Error(`Skill 名称不符合 DSH 规则：${name}`)
  const version = String(pkg.version || '').trim()
  const description = String(pkg.description || '').trim()
  if (!version) throw new Error('Skill 版本不能为空')
  if (!description) throw new Error('Skill 描述不能为空')
  if (!Array.isArray(pkg.files) || pkg.files.length === 0 || pkg.files.length > MAX_FILES) {
    throw new Error(`Skill 文件数量必须在 1 到 ${MAX_FILES} 之间`)
  }
  const files = pkg.files.map(decodeFile)
  const paths = new Set(files.map(file => file.path))
  if (paths.size !== files.length) throw new Error('Skill 包含重复文件路径')
  if (!paths.has('SKILL.md')) throw new Error('Skill 包根目录缺少 SKILL.md')
  const total = files.reduce((sum, file) => sum + file.content.length, 0)
  if (total > MAX_BYTES) throw new Error('DSH Skill 解压后不能超过 8MB')
  const skillMdSha256 = String(pkg.skill_md_sha256 || '')
  const skillMd = files.find(file => file.path === 'SKILL.md')
  const actualSkillMdSha256 = createHash('sha256').update(skillMd.content).digest('hex')
  if (!SHA256_RE.test(skillMdSha256) || skillMdSha256 !== actualSkillMdSha256) {
    throw new Error('Skill 主指令文件的完整性校验失败')
  }
  return {
    skillId,
    name,
    version,
    description,
    displayName: String(pkg.display_name || name),
    packageSha256: String(pkg.package_sha256 || ''),
    skillMdSha256,
    files,
  }
}

function parseMarker(raw) {
  const marker = JSON.parse(raw)
  if (
    marker?.schemaVersion !== 1
    || !NAME_RE.test(String(marker.name || ''))
    || !Number.isSafeInteger(Number(marker.skillId))
    || Number(marker.skillId) <= 0
    || !Number.isSafeInteger(Number(marker.orgId))
    || Number(marker.orgId) <= 0
  ) throw new Error('企业技能管理标记无效')
  return marker
}

export function skillInstructionBody(raw) {
  const text = String(raw || '')
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/)
  return (match ? text.slice(match[0].length) : text).trim()
}

export class ManagedSkillStore {
  constructor(dshHome) {
    this.dshHome = resolve(dshHome)
    this.skillsRoot = join(this.dshHome, 'skills')
    this.workRoot = join(this.dshHome, '.enterprise-managed-skills')
  }

  _skillRoot(name) {
    const root = resolve(this.skillsRoot, name)
    if (!root.startsWith(`${resolve(this.skillsRoot)}${sep}`)) throw new Error('Skill 目标路径无效')
    return root
  }

  async _readMarker(root) {
    try {
      return parseMarker(await readFile(join(root, MARKER), 'utf8'))
    } catch (error) {
      if (!absent(error)) throw error
      return parseMarker(await readFile(join(root, LEGACY_MARKER), 'utf8'))
    }
  }

  async list() {
    let entries
    try {
      entries = await readdir(this.skillsRoot, { withFileTypes: true })
    } catch (error) {
      if (absent(error)) return []
      throw error
    }
    const installed = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      try {
        const root = this._skillRoot(entry.name)
        const marker = await this._readMarker(root)
        if (marker.name !== entry.name) continue
        installed.push({ ...marker, root })
      } catch {
        // User-owned and malformed directories are deliberately not managed.
      }
    }
    return installed.sort((left, right) => left.name.localeCompare(right.name))
  }

  async getBySkillId(skillId, orgId) {
    return (await this.list()).find(item => (
      Number(item.skillId) === Number(skillId) && Number(item.orgId) === Number(orgId)
    )) || null
  }

  async readDefinition(marker) {
    const raw = await readFile(join(marker.root, 'SKILL.md'), 'utf8')
    return {
      name: marker.name,
      description: marker.description,
      content: skillInstructionBody(raw),
      source: `enterprise-managed:${marker.orgId}:${marker.skillId}@${marker.version}`,
      path: join(marker.root, 'SKILL.md'),
      resourceBase: { kind: 'directory', path: marker.root },
    }
  }

  async install(pkg, { orgId }) {
    const normalized = validatePackage(pkg)
    const normalizedOrgId = assertPositiveInteger(orgId, '租户 ID')
    const target = this._skillRoot(normalized.name)
    let previous = null
    try {
      await lstat(target)
      try {
        previous = await this._readMarker(target)
      } catch {
        throw new Error(`本地已存在非企业插件管理的 Skill：${normalized.name}，不会覆盖`)
      }
      if (
        Number(previous.orgId) !== normalizedOrgId
        || Number(previous.skillId) !== normalized.skillId
      ) throw new Error(`本地 Skill 名称已被其他企业 Skill 占用：${normalized.name}`)
    } catch (error) {
      if (!absent(error)) throw error
    }

    await mkdir(this.skillsRoot, { recursive: true, mode: 0o700 })
    await mkdir(this.workRoot, { recursive: true, mode: 0o700 })
    const operation = randomUUID()
    const stage = join(this.workRoot, `stage-${operation}`)
    const backup = join(this.workRoot, `backup-${operation}`)
    await mkdir(stage, { recursive: false, mode: 0o700 })
    let backupCreated = false
    try {
      for (const file of normalized.files) {
        const destination = resolve(stage, ...file.path.split('/'))
        if (!destination.startsWith(`${resolve(stage)}${sep}`)) throw new Error('Skill 文件目标路径无效')
        await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
        await writeFile(destination, file.content, { mode: 0o600 })
      }
      const marker = {
        schemaVersion: 1,
        orgId: normalizedOrgId,
        skillId: normalized.skillId,
        name: normalized.name,
        version: normalized.version,
        description: normalized.description,
        displayName: normalized.displayName,
        packageSha256: normalized.packageSha256,
        skillMdSha256: normalized.skillMdSha256,
        installedAt: new Date().toISOString(),
      }
      await writeFile(join(stage, MARKER), `${JSON.stringify(marker, null, 2)}\n`, { mode: 0o600 })
      if (previous) {
        await rename(target, backup)
        backupCreated = true
      }
      try {
        await rename(stage, target)
      } catch (error) {
        if (backupCreated) await rename(backup, target)
        throw error
      }
      if (backupCreated) await rm(backup, { recursive: true, force: true })
      return { ...marker, root: target, upgraded: previous !== null }
    } finally {
      await rm(stage, { recursive: true, force: true })
    }
  }

  async uninstall(skillId, { orgId }) {
    const installed = await this.getBySkillId(
      assertPositiveInteger(skillId, 'Skill ID'),
      assertPositiveInteger(orgId, '租户 ID'),
    )
    if (!installed) throw new Error(`未安装企业 Skill：${skillId}`)
    const marker = await this._readMarker(installed.root)
    if (
      Number(marker.skillId) !== Number(skillId)
      || Number(marker.orgId) !== Number(orgId)
    ) throw new Error('本地 Skill 管理标记与当前租户不匹配')
    await rm(installed.root, { recursive: true, force: false })
    return installed
  }
}

export const managedSkillMarker = MARKER
