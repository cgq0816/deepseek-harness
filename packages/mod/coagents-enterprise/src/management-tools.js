const CONNECTOR_ACTIONS = ['search', 'list', 'install', 'enable', 'disable', 'uninstall']
const SKILL_ACTIONS = ['search', 'list', 'install', 'uninstall']

function normalizeAction(value, allowed, resource) {
  const action = String(value || '').trim().toLowerCase()
  if (!allowed.includes(action)) {
    throw new Error(`${resource}操作无效，可选值：${allowed.join('、')}`)
  }
  return action
}

function normalizeQuery(value, resource) {
  const query = String(value || '').trim()
  if (!query) throw new Error(`搜索${resource}时必须提供 query`)
  return query
}

function normalizeId(value, resource) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${resource} ID 无效`)
  return id
}

function withOperation(action, result, extra = {}) {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return { action, ...extra, ...result }
  }
  return { action, ...extra, result }
}

export async function executeConnectorOperation(runtime, args, exec) {
  const action = normalizeAction(args?.action, CONNECTOR_ACTIONS, '连接器')
  if (action === 'search') {
    const query = normalizeQuery(args?.query, '连接器')
    return withOperation(action, await runtime.connectors(query), { query })
  }
  if (action === 'list') return withOperation(action, await runtime.connectors())

  const connectorId = normalizeId(args?.connector_id, '连接器')
  const labels = { install: '安装', enable: '启用', disable: '停用', uninstall: '卸载' }
  await runtime.approveMutation(exec, `允许为当前用户在本机 DSH ${labels[action]}企业连接器 ${connectorId}？`)
  const result = await runtime.connectorAction({ connectorId, action })
  return withOperation(action, result, { connector_id: connectorId })
}

export async function executeSkillOperation(runtime, args, exec) {
  const action = normalizeAction(args?.action, SKILL_ACTIONS, 'Skill')
  if (action === 'search') {
    const query = normalizeQuery(args?.query, 'Skill')
    return withOperation(action, await runtime.skills(query), { query })
  }
  if (action === 'list') return withOperation(action, await runtime.skills())

  const skillId = normalizeId(args?.skill_id, 'Skill')
  if (action === 'install') {
    const version = String(args?.version || '').trim() || undefined
    return withOperation(action, await runtime.installSkill(skillId, version, exec))
  }
  return withOperation(action, await runtime.uninstallSkill(skillId, exec))
}

export function managementToolDefinitions(runtime, output) {
  return [
    {
      name: 'enterprise_connector_operation',
      description: '管理当前用户在本机 DSH 中使用的企业连接器。按照 enterprise-manager Skill 选择 action；搜索后使用返回的准确 ID，修改操作会请求用户批准。',
      parameters: {
        action: {
          type: 'string',
          required: true,
          enum: CONNECTOR_ACTIONS,
          description: 'search 搜索；list 列出可见目录及安装状态；install/enable/disable/uninstall 修改当前用户的本机绑定。',
        },
        query: { type: 'string', description: 'action=search 时必填的名称、描述或标签关键词。' },
        connector_id: { type: 'integer', description: '修改操作必填；必须使用搜索或列表结果返回的准确连接器 ID。' },
      },
      output,
      execute: (args, exec) => executeConnectorOperation(runtime, args, exec),
    },
    {
      name: 'enterprise_skill_operation',
      description: '管理从企业 Skill 中心下发的 DSH 兼容 Skill。按照 enterprise-manager Skill 选择 action；搜索后使用返回的准确 ID，安装和卸载会请求用户批准。',
      parameters: {
        action: {
          type: 'string',
          required: true,
          enum: SKILL_ACTIONS,
          description: 'search 搜索；list 列出可见目录及本机安装状态；install 安装或升级；uninstall 卸载受管副本。',
        },
        query: { type: 'string', description: 'action=search 时必填的名称、描述或标签关键词。' },
        skill_id: { type: 'integer', description: '安装或卸载时必填；必须使用搜索或列表结果返回的准确 Skill ID。' },
        version: { type: 'string', description: 'action=install 时可选；省略时安装最新已发布兼容版本。' },
      },
      output,
      execute: (args, exec) => executeSkillOperation(runtime, args, exec),
    },
  ]
}

export const managementActions = {
  connectors: CONNECTOR_ACTIONS,
  skills: SKILL_ACTIONS,
}
