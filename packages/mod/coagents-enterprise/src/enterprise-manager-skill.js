import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { skillInstructionBody } from './managed-skills.js'


export const ENTERPRISE_MANAGER_SKILL_NAME = 'enterprise-manager'
export const ENTERPRISE_MANAGER_SKILL_DESCRIPTION = '管理当前用户在本机 DSH 中使用的企业 Skill 与连接器。用户要求搜索、查看、安装、升级、启用、停用或卸载企业 Skill/连接器时使用。'

const SKILL_URL = new URL('./skills/enterprise-manager/SKILL.md', import.meta.url)
const SKILL_PATH = fileURLToPath(SKILL_URL)

export async function enterpriseManagerSkillDefinition() {
  const raw = await readFile(SKILL_URL, 'utf8')
  return {
    name: ENTERPRISE_MANAGER_SKILL_NAME,
    description: ENTERPRISE_MANAGER_SKILL_DESCRIPTION,
    whenToUse: '用户希望发现、安装、升级、启停或卸载企业连接器或 DSH 兼容 Skill。',
    content: skillInstructionBody(raw),
    source: 'bundled',
    provider: 'coagents-enterprise',
    path: SKILL_PATH,
    resourceBase: { kind: 'directory', path: dirname(SKILL_PATH) },
    invocation: { modelInvocable: true, userInvocable: true },
  }
}
