---
description: "企业 bundle 层为 dsh web 或 desktop profile 带来什么，以及 profile 如何选用或移除该层。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-coagents-enterprise

[English](README.md) | 中文

## 概述

本 bundle 层为 dsh 的 web 或 desktop profile 增加企业面：带已保存连接配置的企业登录、两个管理工具、一个 OCR 工具、两个 Skill，以及已安装企业 MCP 服务贡献的连接器工具。profile 通过在 `dsh.profile.bundles` 中列出 `@deepseek-ai/dsh-coagents-enterprise` 选用该层；移除该条目即卸载该层，而依赖仍保持安装。宿主半侧需要 web 组合，因此所有非 web profile 中该行保持未激活并给出警告。

## 目录

- [使用本包](#use-this-package)
- [了解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与暂缓工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

### 在 profile 中选用该层

本包作为 `@deepseek-ai/dsh` 的依赖随 dsh 安装分发，无需 profile 本地安装。出厂 `web` 模板已列出该包（Desktop profile 也从该模板初始化），因此新建的 web 或 Desktop profile 无需任何额外步骤即挂载该层。早于该模板创建的 profile 在其 manifest 的有序 `dsh.profile.bundles` 中列出包名即可选用该层：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@deepseek-ai/dsh-coagents-enterprise"]
    }
  }
}
```

移除该条目会在下一次组合时卸载该层；安装依赖仍然保留，因此重新加入条目无需执行包操作即可恢复。被选用但 `dsh.bundle.patch` 无法读取的 bundle 会在 stderr 报告并跳过，且不改变 manifest。

### 获得的能力

一个宿主行 `coagents-enterprise`，加上它的浏览器半侧：

| 界面 | 归属 |
|---|---|
| 工具 `enterprise_connector_operation`、`enterprise_skill_operation`、`enterprise_ocr_parse` | 本包，注册在 `ctx.tools` |
| Skill `enterprise-manager` 与 `ocr-skill` | 本包，注册在 `ctx.skills` |
| `/coagents-enterprise` 下的 HTTP 路由（状态、登录、登出、连接配置） | 本包，注册在 `ctx.webServer` |
| 名为 `mcp__enterprise__*` 的连接器工具 | 本包，通过动态 `mcp-client` 挂载 |
| `dsh.client.platform: web` 的浏览器客户器半侧 | 由 client 模块系统提供服务 |

该行仅在其注入的服务存在时激活：`connection`、`credentials`、`settings`、`skills`、`tools` 和 `webServer`。web 与 desktop profile 提供全部六项；headless、acp、sdk 和 sdk-minimal profile 不提供，这些 profile 中该行保持未激活并给出诊断。

### 配置

bundle patch 的每个字段都从环境读取，因此部署方无需编辑 patch 即可设置企业端点：

| 字段 | 环境变量 |
|---|---|
| `baseUrl` | `ENTERPRISE_BASE_URL`，否则 `RCLAW_BASE_URL` |
| `orgCode` | `ENTERPRISE_ORG_CODE`，否则 `RCLAW_ORG_CODE` |
| `clientVersion` | `ENTERPRISE_CLIENT_VERSION`，否则 `RCLAW_CLIENT_VERSION` |
| `openBrowser` | `ENTERPRISE_DISABLE_BROWSER_OPEN=1` 或 `RCLAW_DISABLE_BROWSER_OPEN=1` 时关闭 |
| `allowConnectionEditing` | `ENTERPRISE_CONNECTION_EDITABLE=0` 时关闭 |

已保存的连接配置与设备身份存放在 harness 凭据存储中，不在工作区内。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

本包以预构建 JavaScript 分发：供应商模块位于 `src/`，包自身的构建把宿主入口打包为 `lib/index.js`，并把浏览器半侧、Skill 内容与手写声明复制到其旁。这些模块是 JavaScript 而非 TypeScript，因此仓库类型检查只覆盖手写声明。

不发布运行时不变式伴侧：本包不拥有独立的状态投影，其存储位于 harness 凭据存储中，其工具与 Skill 注册在共享服务上。

`cordis.patch.yml` 插入唯一一行 `coagents-enterprise`（模块 `@deepseek-ai/dsh-coagents-enterprise`），其配置值为读取环境变量的 `!!js` 表达式。`apply()` 先恢复已保存的连接配置，注册工具与 Skill，恢复设备身份与会话，然后在 `ctx.webServer` 上注册 `/coagents-enterprise` 路由前缀。每个已登录会话会挂载一个 streamable-HTTP `mcp-client` 插件，并随该行一起释放。

client 模块系统在该宿主行挂载期间依据 `dsh.client` 声明发现浏览器半侧，并在该行卸载时再次将其移除。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [packages/mod](../README.zh.md) — 本包所属的组地图。
- [App boot](../../boot/app-boot/README.zh.md#profiles) — profile 层、bundle 解析与版本兼容检查。
- [Plugin manager](../../boot/plugin-manager/README.zh.md) — bundle 选用、安装与版本豁免。
- [Client modules](../../client/modules/README.zh.md) — `dsh.client` 浏览器半侧如何组合与提供服务。

-----

<a id="model-experience"></a>
## 模型体验

### 管理工具

#### 模型看到的内容

`enterprise_connector_operation` 与 `enterprise_skill_operation` 的声明。两者各带一个 `action` 枚举——连接器接受 `search`、`list`、`install`、`enable`、`disable`、`uninstall`；Skill 接受 `search`、`list`、`install`、`uninstall`——外加修改操作所需的标识符，且两个描述都声明修改操作会请求用户批准。描述为中文，并指定 `enterprise-manager` Skill 作为动作指南。任何声明中都不出现企业地址：工具通过已保存的连接配置解析目标。

#### Token 影响

该行激活期间固定不变：两个声明加入每个请求的工具目录，其模式仅随插件升级而改变。

#### KV Cache 影响

声明位于请求的工具目录段中。挂载或释放该行会改变后续请求的该段，可能使其复用失效。

### OCR 工具

#### 模型看到的内容

`enterprise_ocr_parse` 的声明。其中文描述说明本地 PDF 或图片会被上传到企业 OCR 服务，返回的 Markdown 保存到原文件旁边。参数为文件绝对路径，以及 1 到 7500 秒的可选整份文档处理期限。

#### Token 影响

该行激活期间额外多出一个声明，由插件版本固定。

#### KV Cache 影响

与管理工具相同的工具目录段；注册或释放该行会改变后续声明。

### 企业 Skill

#### 模型看到的内容

Skill 注册 `enterprise-manager` 与 `ocr-skill`。各自的内容仅在模型通过 Skill 工具打开时进入上下文；两个管理工具的描述指定 `enterprise-manager` 作为选择动作的指南。`enterprise-manager` 的内容还说明已安装连接器的业务能力以 `mcp__enterprise__*` 工具出现，且 `ocr-skill` 等内置能力不通过它安装。

#### Token 影响

未打开时为零。打开后该 Skill 的 `SKILL.md` 内容加入该请求的上下文。

#### KV Cache 影响

Skill 内容在模型读取它的位置追加；后续请求保留注册，但除非再次打开该 Skill，不保留其内容。

### 动态连接器工具

#### 模型看到的内容

已登录会话的 `enterprise` MCP 服务贡献的工具，名为 `mcp__enterprise__*`。其集合随用户安装的连接器而变，因此安装或移除连接器会在会话过程中改变它。该服务以启用重连、每次调用 60 秒超时挂载，且 `failOnStartupError` 为关，因此企业服务不可达时会话只是没有这些工具，不会使该行失败。

#### Token 影响

数据相关：每个贡献的工具声明在其连接器保持安装期间加入工具目录，目录随每个已安装连接器增长。

#### KV Cache 影响

安装或移除连接器会改变后续请求的工具目录段，可能使其复用失效；重新注册相同工具的重连保持该段稳定。

## 已知限制与暂缓工作

<a id="known-limitations-and-deferred-work"></a>

- **需要 web 组合** — 宿主行注入 `connection` 与 `webServer`，因此 headless、acp、sdk 和 sdk-minimal profile 中该行保持未激活；该层仅服务 web 与 desktop 界面。
- **企业服务是唯一后端** — 登录、连接器目录、受管 Skill、OCR 与 MCP 服务全部由配置的 `baseUrl` 应答；没有离线或模拟模式。
- **无 TypeScript 源码的预构建载荷** — 供应商模块是 JavaScript，只有手写声明会经过类型检查；供应商更新是把新 JavaScript 放进 `src/` 并重新构建。
- **中文用户可见文本** — 工具描述与 Skill 内容是中文字面量，没有 locale 字典，因此该层不遵循本仓库的客户器文案 locale 规则。
- **仓库名下的供应商副本** — 上游包名为 `@coagents/dsh-enterprise`；随 dsh 安装分发后改名为 `@deepseek-ai/dsh-coagents-enterprise`，dsh peer 固定为 `workspace:*`、Cordis peer 固定为 `workspace:~`（上游声明 `^0.1.5-rc.2` 与 `^4.0.2`），版本号也改用仓库版本而非供应商版本。
- **激活后的延后启动** — 本副本在插件自身激活结算之后才执行模型同步、MCP 挂载与资源同步。这些步骤会写入 profile 的 `llm-pi-ai` 配置，其保存会重载 profile Loader，而在插件自身 `apply()` 内发起的重载会等待同一 fiber 并使启动死锁。因此企业模型与连接器工具在启动后片刻出现，而非启动过程中。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
