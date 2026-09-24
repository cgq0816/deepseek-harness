---
name: ocr-skill
description: 使用企业 OCR 服务识别本地 PDF 或图片并生成 Markdown。用户要求识别、提取或解析 PDF、扫描件、表格图片或普通图片内容时使用。
---

# 企业 OCR

本 Skill 是企业插件内置能力，不需要通过 `enterprise-manager` 搜索或安装。

## 使用方式

1. 从当前对话附件或 DSH 工作区取得真实的本地文件路径，不要猜测路径。
2. 仅处理 `.pdf`、`.png`、`.jpg`、`.jpeg`、`.jp2`、`.webp`、`.gif`、`.bmp`。
3. 调用 `enterprise_ocr_parse`，传入 `file_path`。同一文件在一次任务中只提交一次。
4. 工具会把文件上传到企业 OCR 服务，等待处理完成，并将完整 Markdown 保存为 `<原文件>.mineru.md`。
5. `output_truncated=false` 时直接依据 `markdown` 回答。`output_truncated=true` 时说明完整结果位置在 `artifact_path`，不要重新提交 OCR。

## 边界

- 不使用 `sandbox_setup`、Shell、Python、`coagents_sdk` 或沙箱环境变量。
- 不读取企业 Token，不直接请求企业 API 或 MinerU 地址。
- 工具提示尚未登录时，引导用户前往「设置 → 企业」登录。
- 工具返回 `MINERU_NOT_CONFIGURED` 时，说明需要由企业管理员在服务端系统设置中配置并验证 MinerU；DSH 的「设置 → 企业」只负责登录和能力状态，不能配置 MinerU。
- 上传失败、服务未配置、容量不足、超时或格式不支持时，准确说明工具返回的原因，不切换到未知 OCR 服务。
