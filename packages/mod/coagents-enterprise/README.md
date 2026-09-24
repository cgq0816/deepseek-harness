---
description: "What the enterprise bundle layer adds to a dsh web or desktop profile, and how a profile selects or drops it."
kind: "package-bundle"
---

# @deepseek-ai/dsh-coagents-enterprise

English | [中文](README.zh.md)

## Summary

This bundle layer adds the enterprise surface to a dsh web or desktop profile: enterprise sign-in with a saved connection profile, two management tools, an OCR tool, two skills, and the connector tools an installed enterprise MCP server contributes. A profile selects the layer by listing `@deepseek-ai/dsh-coagents-enterprise` in `dsh.profile.bundles`; removing the entry unloads it while the dependency stays installed. The host half requires the web composition, so every non-web profile leaves its row inactive with a warning.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

### Select the layer in a profile

The package ships inside the dsh installation as a dependency of `@deepseek-ai/dsh`, so no profile-local install is needed. The shipped `web` template already lists it, which is also the template the Desktop profile initializes from, so a fresh web or Desktop profile mounts the layer with no further step. A profile created earlier selects the layer by listing the package name in its manifest's ordered `dsh.profile.bundles`:

```json
{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@deepseek-ai/dsh-coagents-enterprise"]
    }
  }
}
```

Removing the entry unloads the layer on the next composition; the installation dependency stays, so re-adding the entry restores it without a package operation. A selected bundle whose `dsh.bundle.patch` cannot be read is reported on stderr and skipped without changing the manifest.

### What you get

One host row, `coagents-enterprise`, plus its browser half:

| Surface | Owner |
|---|---|
| Tools `enterprise_connector_operation`, `enterprise_skill_operation`, `enterprise_ocr_parse` | this package, registered on `ctx.tools` |
| Skills `enterprise-manager` and `ocr-skill` | this package, registered on `ctx.skills` |
| HTTP routes under `/coagents-enterprise` (status, sign-in, sign-out, connection profile) | this package, registered on `ctx.webServer` |
| Connector tools named `mcp__enterprise__*` | this package, through a dynamic `mcp-client` mount |
| Browser client half under `dsh.client.platform: web` | served by the client module system |

The row activates only where its injected services exist: `connection`, `credentials`, `settings`, `skills`, `tools`, and `webServer`. The web and desktop profiles provide all six; the headless, acp, sdk, and sdk-minimal profiles do not, and there the row stays inactive with a diagnostic.

### Configuration

The bundle patch reads every field from the environment, so a deployment sets the enterprise endpoint without editing the patch:

| Field | Environment |
|---|---|
| `baseUrl` | `ENTERPRISE_BASE_URL`, else `RCLAW_BASE_URL` |
| `orgCode` | `ENTERPRISE_ORG_CODE`, else `RCLAW_ORG_CODE` |
| `clientVersion` | `ENTERPRISE_CLIENT_VERSION`, else `RCLAW_CLIENT_VERSION` |
| `openBrowser` | disabled by `ENTERPRISE_DISABLE_BROWSER_OPEN=1` or `RCLAW_DISABLE_BROWSER_OPEN=1` |
| `allowConnectionEditing` | disabled by `ENTERPRISE_CONNECTION_EDITABLE=0` |

The saved connection profile and the device identity live in the harness credential store, not in the workspace.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package ships prebuilt JavaScript: the vendor's modules sit under `src/`, the package's own build bundles the host entry into `lib/index.js`, and copies the browser half, the skill bodies, and hand-written declarations beside it. The modules are JavaScript rather than TypeScript, so repository typechecking covers only the hand-written declarations.

No runtime invariant companion is published: the package owns no independent state projection, because its stores live in the harness credential store and its tools and skills register on shared services.

`cordis.patch.yml` inserts the single row `coagents-enterprise` (module `@deepseek-ai/dsh-coagents-enterprise`) whose config values are `!!js` environment expressions. `apply()` restores the saved connection profile, registers the tools and skills, restores the device identity and session, then registers the `/coagents-enterprise` route prefix on `ctx.webServer`. A streamable-HTTP `mcp-client` plugin mounts per signed-in session and is disposed with the row.

The client module system discovers the browser half from the `dsh.client` declaration while the host row is mounted, and drops it again when the row unloads.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [packages/mod](../README.md) — the group map this package belongs to.
- [App boot](../../boot/app-boot/README.md#profiles) — profile layers, bundle resolution, and the version-compatibility check.
- [Plugin manager](../../boot/plugin-manager/README.md) — bundle selection, installation, and version exemptions.
- [Client modules](../../client/modules/README.md) — how a `dsh.client` browser half is composed and served.

-----

<a id="model-experience"></a>
## Model Experience

### Management tools

#### What the model sees

The declarations of `enterprise_connector_operation` and `enterprise_skill_operation`. Both carry one `action` enum — connectors accept `search`, `list`, `install`, `enable`, `disable`, and `uninstall`; skills accept `search`, `list`, `install`, and `uninstall` — plus the identifier a modification needs, and both descriptions state that a modifying action requests the user's approval. The descriptions are Chinese and name the `enterprise-manager` skill as the action guide. No enterprise host appears in a declaration: the tools resolve their target through the saved connection profile.

#### Token effect

Fixed while the row is active: two declarations join every request's tool catalog, and their schemas change only with a plugin upgrade.

#### KV Cache effect

The declarations sit in the request's tool-catalog segment. Mounting or disposing the row changes that segment for later requests and can invalidate its reuse.

### OCR tool

#### What the model sees

The `enterprise_ocr_parse` declaration. Its Chinese description states that a local PDF or image is uploaded to the enterprise OCR service and the returned Markdown is saved beside the original file. The arguments are the absolute file path and an optional whole-document deadline of 1 to 7500 seconds.

#### Token effect

One further declaration while the row is active, fixed by the plugin version.

#### KV Cache effect

The same tool-catalog segment as the management tools; registering or disposing the row changes subsequent declarations.

### Enterprise skills

#### What the model sees

The skill registrations `enterprise-manager` and `ocr-skill`. Each body enters the context only when the model opens the skill through the skill tool; the management-tool descriptions name `enterprise-manager` as the guide for choosing an action. The `enterprise-manager` body also states that installed connectors' business capabilities arrive as `mcp__enterprise__*` tools and that built-in capabilities such as `ocr-skill` are not installed through it.

#### Token effect

Zero while unopened. An opened skill adds its `SKILL.md` body to that request's context.

#### KV Cache effect

A skill body appends where the model reads it; later requests keep the registration but not the body unless the skill is opened again.

### Dynamic connector tools

#### What the model sees

The tools the signed-in session's `enterprise` MCP server contributes, named `mcp__enterprise__*`. Their set follows the connectors the user installed, so it changes during a session when a connector is installed or removed. The server mounts with reconnect enabled and a 60-second per-call timeout, and `failOnStartupError` is off, so an unreachable enterprise service leaves the session without these tools rather than failing the row.

#### Token effect

Data-dependent: each contributed tool declaration joins the tool catalog while its connector stays installed, and the catalog grows with every installed connector.

#### KV Cache effect

Installing or removing a connector changes the tool-catalog segment for later requests and can invalidate its reuse; a reconnect that re-registers the same tools keeps the segment stable.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Web composition required** — the host row injects `connection` and `webServer`, so the headless, acp, sdk, and sdk-minimal profiles leave it inactive; the layer serves the web and desktop surfaces only.
- **Enterprise service is the only backend** — sign-in, the connector catalog, managed skills, OCR, and the MCP server all answer from the configured `baseUrl`; there is no offline or mock mode.
- **Prebuilt payload without TypeScript source** — the vendor's modules are JavaScript, so only the hand-written declarations are typechecked; a vendor update drops new JavaScript under `src/` and rebuilds.
- **Chinese user-facing text** — the tool descriptions and skill bodies are Chinese literals with no locale dictionary, so the layer does not follow the repository's client-copy locale rule.
- **Vendored copy under a repository name** — the upstream package is `@coagents/dsh-enterprise`; shipping it inside the dsh installation renames it `@deepseek-ai/dsh-coagents-enterprise`, pins its dsh peers to `workspace:*` and its Cordis peer to `workspace:~` (upstream declares `^0.1.5-rc.2` and `^4.0.2`), and carries the repository version rather than the vendor's.
- **Deferred startup activation** — this copy runs the model sync, MCP mount, and resource sync after the plugin's own activation settles. Those steps write the profile's `llm-pi-ai` settings, whose save reloads the profile Loader, and a reload issued from inside the plugin's own `apply()` waits on that same fiber and deadlocks startup. Enterprise models and connector tools therefore appear moments after boot rather than during it.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
