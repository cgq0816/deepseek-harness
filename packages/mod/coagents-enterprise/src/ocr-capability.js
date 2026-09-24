import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { skillInstructionBody } from './managed-skills.js'


export const OCR_SKILL_NAME = 'ocr-skill'
export const OCR_TOOL_NAME = 'enterprise_ocr_parse'
export const OCR_SKILL_DESCRIPTION = '使用企业 OCR 服务识别本地 PDF 或图片并生成 Markdown。'

const SKILL_URL = new URL('./skills/ocr-skill/SKILL.md', import.meta.url)
const SKILL_PATH = fileURLToPath(SKILL_URL)

export async function ocrSkillDefinition() {
  const raw = await readFile(SKILL_URL, 'utf8')
  return {
    name: OCR_SKILL_NAME,
    description: OCR_SKILL_DESCRIPTION,
    whenToUse: '用户要求识别、提取或解析 PDF、扫描件或图片中的文字和表格。',
    content: skillInstructionBody(raw),
    source: 'bundled',
    provider: 'coagents-enterprise',
    path: SKILL_PATH,
    resourceBase: { kind: 'directory', path: dirname(SKILL_PATH) },
    invocation: { modelInvocable: true, userInvocable: true },
  }
}

export async function executeOcrParse(runtime, args, exec) {
  return runtime.parseOcr(
    String(args?.file_path || ''),
    args?.timeout_seconds,
    exec,
  )
}

export function ocrToolDefinition(runtime, output) {
  return {
    name: OCR_TOOL_NAME,
    description: '将员工电脑上的 PDF 或图片上传到企业 OCR 服务，等待解析完成，并把完整 Markdown 保存到原文件旁边。',
    parameters: {
      file_path: {
        type: 'string',
        required: true,
        description: 'DSH 附件或工作区中的本地文件绝对路径。仅支持 PDF 和常见图片格式。',
      },
      timeout_seconds: {
        type: 'integer',
        description: '可选的整份文档处理期限，必须为 1 到 7500 秒；省略时由企业服务使用默认上限。',
      },
    },
    output,
    execute: (args, exec) => executeOcrParse(runtime, args, exec),
  }
}
