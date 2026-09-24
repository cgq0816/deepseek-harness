---
description: "The mod group map: vendored and locally developed bundle layers that extend a dsh profile without joining a shipped capability family."
kind: "package-group"
---

# packages/mod

English | [中文](README.zh.md)

## Summary

The mod group holds bundle layers that extend a dsh profile from outside the shipped capability families: vendored enterprise integrations and locally developed compositions. A package here is an ordinary workspace package that declares `dsh.bundle.patch`, so a profile selects it by listing its name in `dsh.profile.bundles` and drops it by removing the entry. Unlike the shipped groups, membership carries no architectural promise: the group is a container for layers whose lifecycle belongs to this deployment.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

-----

<a id="packages"></a>
## Packages

| Package | Role | Layer shape |
|---|---|---|
| [`coagents-enterprise`](coagents-enterprise/README.md) | Enterprise sign-in, management tools, OCR, managed skills, and connector MCP for the web and desktop surfaces | one host row plus a `dsh.client` browser half |

-----

<a id="related-documentation"></a>
## Related documentation

- [Adding a workspace package](../../docs/cookbook/adding-a-package.md) — the checklist every package in this group follows.
- [App boot](../../packages/boot/app-boot/README.md#profiles) — profile layers, bundle resolution, and the version-compatibility check.
- [Plugin manager](../../packages/boot/plugin-manager/README.md) — bundle selection, installation, and version exemptions.

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
