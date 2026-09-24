---
description: "mod 组地图：供应商集成与本地开发的 bundle 层，扩展 dsh profile 而不加入既有能力族。"
kind: "package-group"
---

# packages/mod

[English](README.md) | 中文

## 概述

mod 组存放来自既有能力族之外的 bundle 层：供应商企业集成与本地开发的组合。这里的包是声明 `dsh.bundle.patch` 的普通 workspace 包，profile 通过在 `dsh.profile.bundles` 中列出其名选用，移除条目即放弃。与既有组不同，加入本组不附带架构承诺：该组是本部署自有生命周期各层的容器。

## 目录

- [包](#packages)
- [相关文档](#related-documentation)
- [开发备注](#dev-note)

-----

<a id="packages"></a>
## 包

| 包 | 职责 | 层形态 |
|---|---|---|
| [`coagents-enterprise`](coagents-enterprise/README.zh.md) | 面向 web 与 desktop 界面的企业登录、管理工具、OCR、受管 Skill 与连接器 MCP | 一个宿主行加一个 `dsh.client` 浏览器半侧 |

-----

<a id="related-documentation"></a>
## 相关文档

- [新增 workspace 包](../../docs/cookbook/adding-a-package.zh.md) — 本组每个包都遵循的清单。
- [App boot](../../packages/boot/app-boot/README.zh.md#profiles) — profile 层、bundle 解析与版本兼容检查。
- [Plugin manager](../../packages/boot/plugin-manager/README.zh.md) — bundle 选用、安装与版本豁免。

-----

<a id="dev-note"></a>
## 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
