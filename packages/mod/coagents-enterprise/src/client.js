window.__ModuleLoader__.load({ id: "@deepseek-ai/dsh-coagents-enterprise", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/coagents-dsh-enterprise/client-src/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);
var ROUTE = "/coagents-enterprise";
var STYLE_ID = "coagents-enterprise-settings-style";
async function api(path, init = {}) {
  const response = await fetch(`${ROUTE}/api/${path}`, {
    credentials: "same-origin",
    ...init
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `\u8BF7\u6C42\u5931\u8D25\uFF08${response.status}\uFF09`);
  return payload;
}
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .enterprise-settings { max-width: 760px; color: var(--color-text, #172033); }
    .enterprise-settings__header { margin-bottom: 22px; }
    .enterprise-settings__title { margin: 0 0 7px; font-size: 22px; font-weight: 650; letter-spacing: -.01em; }
    .enterprise-settings__description { margin: 0; color: var(--color-text-secondary, #667085); font-size: 14px; line-height: 1.65; }
    .enterprise-settings__card { border: 1px solid var(--color-border, #e5e7eb); border-radius: 14px; background: var(--color-bg-container, #fff); padding: 20px; box-shadow: 0 1px 2px rgba(16,24,40,.03); }
    .enterprise-settings__card + .enterprise-settings__card { margin-top: 14px; }
    .enterprise-settings__card-title { margin: 0; font-size: 16px; font-weight: 650; }
    .enterprise-settings__card-description { margin: 6px 0 0; color: var(--color-text-secondary, #667085); font-size: 13px; line-height: 1.6; }
    .enterprise-settings__account { display: flex; align-items: center; gap: 14px; }
    .enterprise-settings__avatar { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg,#315cff,#6847e8); font-size: 16px; font-weight: 650; }
    .enterprise-settings__identity { min-width: 0; flex: 1; }
    .enterprise-settings__account-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .enterprise-settings__name { font-size: 15px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .enterprise-settings__meta { margin-top: 3px; color: var(--color-text-secondary, #667085); font-size: 13px; }
    .enterprise-settings__button { appearance: none; border: 0; border-radius: 9px; padding: 9px 15px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s, transform .15s; }
    .enterprise-settings__button:hover { opacity: .9; }
    .enterprise-settings__button:active { transform: translateY(1px); }
    .enterprise-settings__button:disabled { cursor: default; opacity: .55; }
    .enterprise-settings__button--primary { color: #fff; background: #315cff; }
    .enterprise-settings__button--quiet { color: var(--color-text, #344054); background: var(--color-fill-secondary, #f2f4f7); }
    .enterprise-settings__button--danger { color: #b42318; background: #fef3f2; }
    .enterprise-settings__login { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .enterprise-settings__login-copy strong { display: block; margin-bottom: 5px; font-size: 15px; }
    .enterprise-settings__login-copy span { color: var(--color-text-secondary, #667085); font-size: 13px; line-height: 1.55; }
    .enterprise-settings__services { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--color-border, #eaecf0); }
    .enterprise-settings__service { min-width: 0; border-radius: 9px; background: var(--color-fill-tertiary, #f8fafc); padding: 10px 11px; }
    .enterprise-settings__service-label { color: var(--color-text-secondary, #667085); font-size: 12px; }
    .enterprise-settings__service-state { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px; font-weight: 600; }
    .enterprise-settings__dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #12b76a; }
    .enterprise-settings__dot--pending { background: #f79009; }
    .enterprise-settings__error { margin-top: 14px; border-radius: 9px; padding: 10px 12px; color: #b42318; background: #fef3f2; font-size: 13px; line-height: 1.55; }
    .enterprise-settings__success { margin-top: 14px; border-radius: 9px; padding: 10px 12px; color: #027a48; background: #ecfdf3; font-size: 13px; line-height: 1.55; }
    .enterprise-settings__loading { color: var(--color-text-secondary, #667085); font-size: 14px; }
    .enterprise-settings__form { display: grid; gap: 15px; margin-top: 18px; }
    .enterprise-settings__field { display: grid; gap: 7px; }
    .enterprise-settings__field-label { color: var(--color-text, #344054); font-size: 13px; font-weight: 600; }
    .enterprise-settings__field-hint { color: var(--color-text-secondary, #667085); font-size: 12px; line-height: 1.5; }
    .enterprise-settings__input { width: 100%; box-sizing: border-box; border: 1px solid var(--color-border, #d0d5dd); border-radius: 9px; color: var(--color-text, #172033); background: var(--color-bg-container, #fff); padding: 10px 12px; font: inherit; font-size: 14px; outline: none; }
    .enterprise-settings__input:focus { border-color: #315cff; box-shadow: 0 0 0 3px rgba(49,92,255,.12); }
    .enterprise-settings__input:disabled { color: var(--color-text-secondary, #667085); background: var(--color-fill-tertiary, #f8fafc); }
    .enterprise-settings__form-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
    .enterprise-settings__source { color: var(--color-text-secondary, #667085); font-size: 12px; }
    .enterprise-settings__device-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px 24px; margin-top: 18px; }
    .enterprise-settings__device-item { min-width: 0; }
    .enterprise-settings__device-label { color: var(--color-text-secondary, #667085); font-size: 12px; }
    .enterprise-settings__device-value { margin-top: 5px; color: var(--color-text, #172033); font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
    .enterprise-settings__device-value--id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; font-weight: 500; }
    .enterprise-settings__device-state { display: inline-flex; align-items: center; gap: 6px; }
    .enterprise-settings__release { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--color-border, #eaecf0); color: var(--color-text-secondary, #667085); font-size: 12px; }
    @media (max-width: 760px) {
      .enterprise-settings__login, .enterprise-settings__account { align-items: flex-start; flex-direction: column; }
      .enterprise-settings__services { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .enterprise-settings__device-grid { grid-template-columns: minmax(0,1fr); }
    }
  `;
  document.head.appendChild(style);
}
function service(label, ready, readyText = "\u5DF2\u5C31\u7EEA", pendingText = "\u540C\u6B65\u4E2D") {
  return import_react.default.createElement(
    "div",
    { className: "enterprise-settings__service", key: label },
    import_react.default.createElement("div", { className: "enterprise-settings__service-label" }, label),
    import_react.default.createElement(
      "div",
      { className: "enterprise-settings__service-state" },
      import_react.default.createElement("span", { className: `enterprise-settings__dot${ready ? "" : " enterprise-settings__dot--pending"}` }),
      ready ? readyText : pendingText
    )
  );
}
function platformName(platform) {
  if (platform === "darwin") return "macOS";
  if (platform === "win32") return "Windows";
  if (platform === "linux") return "Linux";
  return platform || "\u672A\u77E5";
}
function deviceItem(label, value, { mono = false, state = false } = {}) {
  return import_react.default.createElement(
    "div",
    { className: "enterprise-settings__device-item", key: label },
    import_react.default.createElement("div", { className: "enterprise-settings__device-label" }, label),
    import_react.default.createElement(
      "div",
      {
        className: `enterprise-settings__device-value${mono ? " enterprise-settings__device-value--id" : ""}`
      },
      state ? import_react.default.createElement(
        "span",
        { className: "enterprise-settings__device-state" },
        import_react.default.createElement("span", { className: `enterprise-settings__dot${value.ready ? "" : " enterprise-settings__dot--pending"}` }),
        value.text
      ) : value
    )
  );
}
function EnterpriseSettings() {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [notice, setNotice] = (0, import_react.useState)(null);
  const [baseUrl, setBaseUrl] = (0, import_react.useState)("");
  const [orgCode, setOrgCode] = (0, import_react.useState)("");
  const [connectionDirty, setConnectionDirty] = (0, import_react.useState)(false);
  const refresh = (0, import_react.useCallback)(async () => {
    try {
      setStatus(await api("status"));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);
  (0, import_react.useEffect)(() => {
    refresh();
    const timer = window.setInterval(refresh, 4e3);
    return () => window.clearInterval(timer);
  }, [refresh]);
  (0, import_react.useEffect)(() => {
    if (!status || connectionDirty) return;
    setBaseUrl(status.baseUrl || "");
    setOrgCode(status.orgCode || "");
  }, [status?.baseUrl, status?.orgCode, connectionDirty]);
  const openEnterpriseLogin = (0, import_react.useCallback)(async (interaction = "login") => {
    const loginWindow = window.open("about:blank", "enterprise-sso-login");
    if (loginWindow) {
      loginWindow.document.title = interaction === "switch_account" ? "\u5207\u6362\u4F01\u4E1A\u8D26\u53F7" : "\u4F01\u4E1A\u8D26\u53F7\u767B\u5F55";
      loginWindow.document.body.textContent = interaction === "switch_account" ? "\u6B63\u5728\u6253\u5F00\u4F01\u4E1A\u8D26\u53F7\u9009\u62E9\u2026" : "\u6B63\u5728\u6253\u5F00\u4F01\u4E1A\u7EDF\u4E00\u8EAB\u4EFD\u767B\u5F55\u2026";
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api("login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interaction })
      });
      if (result.launched) {
        loginWindow?.close();
      } else if (result.redirectUrl && loginWindow) {
        loginWindow.location.replace(result.redirectUrl);
      } else if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
      }
    } catch (cause) {
      loginWindow?.close();
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  const login = (0, import_react.useCallback)(() => openEnterpriseLogin("login"), [openEnterpriseLogin]);
  const switchAccount = (0, import_react.useCallback)(() => openEnterpriseLogin("switch_account"), [openEnterpriseLogin]);
  const logout = (0, import_react.useCallback)(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setStatus(await api("logout", { method: "POST" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  const saveConnection = (0, import_react.useCallback)(async (event) => {
    event.preventDefault();
    if (status?.authenticated && !window.confirm("\u4FEE\u6539\u8FDE\u63A5\u914D\u7F6E\u5C06\u9000\u51FA\u5F53\u524D\u4F01\u4E1A\u8D26\u53F7\uFF0C\u6E05\u7406\u65E7\u6A21\u578B\u548C MCP\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await api("connection", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl, orgCode })
      });
      setStatus(next);
      setBaseUrl(next.baseUrl || "");
      setOrgCode(next.orgCode || "");
      setConnectionDirty(false);
      setNotice("\u8FDE\u63A5\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u8BF7\u4F7F\u7528\u65B0\u73AF\u5883\u91CD\u65B0\u767B\u5F55\u3002");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, [baseUrl, orgCode, status?.authenticated]);
  const resetConnection = (0, import_react.useCallback)(async () => {
    if (!window.confirm("\u6062\u590D\u542F\u52A8\u9ED8\u8BA4\u914D\u7F6E\u5C06\u9000\u51FA\u5F53\u524D\u4F01\u4E1A\u8D26\u53F7\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await api("connection", { method: "DELETE" });
      setStatus(next);
      setBaseUrl(next.baseUrl || "");
      setOrgCode(next.orgCode || "");
      setConnectionDirty(false);
      setNotice("\u5DF2\u6062\u590D\u5B89\u88C5\u5305\u6216\u542F\u52A8\u547D\u4EE4\u63D0\u4F9B\u7684\u9ED8\u8BA4\u914D\u7F6E\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  const authenticated = Boolean(status?.authenticated);
  const displayName = status?.user?.display_name || status?.user?.username || "\u4F01\u4E1A\u7528\u6237";
  const initial = String(displayName).trim().slice(0, 1).toUpperCase() || "\u4F01";
  return import_react.default.createElement(
    "div",
    { className: "enterprise-settings" },
    import_react.default.createElement(
      "div",
      { className: "enterprise-settings__header" },
      import_react.default.createElement("h2", { className: "enterprise-settings__title" }, "\u4F01\u4E1A"),
      import_react.default.createElement("p", { className: "enterprise-settings__description" }, "\u767B\u5F55\u540E\u81EA\u52A8\u540C\u6B65\u4F01\u4E1A\u6A21\u578B\uFF0C\u5E76\u6309\u6743\u9650\u63A5\u5165\u6280\u80FD\u3001\u8FDE\u63A5\u5668\u548C\u6587\u6863\u5E93\uFF0C\u65E0\u9700\u5355\u72EC\u914D\u7F6E\u5BC6\u94A5\u3002")
    ),
    import_react.default.createElement(
      "div",
      { className: "enterprise-settings__card" },
      status === null ? import_react.default.createElement("div", { className: "enterprise-settings__loading" }, "\u6B63\u5728\u8BFB\u53D6\u4F01\u4E1A\u914D\u7F6E\u2026") : authenticated ? import_react.default.createElement(
        import_react.default.Fragment,
        null,
        import_react.default.createElement(
          "div",
          { className: "enterprise-settings__account" },
          import_react.default.createElement("div", { className: "enterprise-settings__avatar" }, initial),
          import_react.default.createElement(
            "div",
            { className: "enterprise-settings__identity" },
            import_react.default.createElement("div", { className: "enterprise-settings__name" }, displayName),
            import_react.default.createElement("div", { className: "enterprise-settings__meta" }, `\u5DF2\u767B\u5F55 \xB7 ${status.orgCode || "\u4F01\u4E1A\u8D26\u53F7"}`)
          ),
          import_react.default.createElement(
            "div",
            { className: "enterprise-settings__account-actions" },
            import_react.default.createElement("button", {
              className: "enterprise-settings__button enterprise-settings__button--primary",
              type: "button",
              disabled: busy,
              onClick: switchAccount
            }, busy ? "\u5904\u7406\u4E2D\u2026" : "\u5207\u6362\u8D26\u53F7"),
            import_react.default.createElement("button", {
              className: "enterprise-settings__button enterprise-settings__button--quiet",
              type: "button",
              disabled: busy,
              onClick: logout
            }, busy ? "\u5904\u7406\u4E2D\u2026" : "\u9000\u51FA\u767B\u5F55")
          )
        ),
        import_react.default.createElement(
          "div",
          { className: "enterprise-settings__services" },
          service("\u4F01\u4E1A\u6A21\u578B", status.modelReady, `${status.modelCount || 0} \u4E2A\u5DF2\u540C\u6B65`, "\u540C\u6B65\u5931\u8D25"),
          service("\u4F01\u4E1A\u7BA1\u7406 Skill", status.managerSkillReady, "\u5DF2\u52A0\u8F7D", "\u672A\u52A0\u8F7D"),
          service("\u6280\u80FD\u4E2D\u5FC3", status.skillCatalogReady, "\u670D\u52A1\u53EF\u8BBF\u95EE", "\u8FDE\u63A5\u5931\u8D25"),
          service(
            "\u8FDE\u63A5\u5668",
            status.mcpReady && status.connectorCatalogReady,
            `${status.connectorEnabledCount || 0} \u4E2A\u5DF2\u542F\u7528`,
            "\u8FDE\u63A5\u4E2D"
          ),
          service("\u6587\u6863\u5E93", status.documentToolsReady, "\u641C\u7D22\u5DE5\u5177\u5DF2\u6302\u8F7D", "\u5DE5\u5177\u672A\u6302\u8F7D"),
          service("OCR \u8BC6\u522B", status.ocrReady, "\u5BA2\u6237\u7AEF\u80FD\u529B\u5DF2\u52A0\u8F7D", "\u672A\u52A0\u8F7D")
        ),
        status.modelError ? import_react.default.createElement("div", { className: "enterprise-settings__error" }, `\u6A21\u578B\u540C\u6B65\u5931\u8D25\uFF1A${status.modelError}`) : null,
        status.resourceStatusError ? import_react.default.createElement("div", { className: "enterprise-settings__error" }, `\u4F01\u4E1A\u8D44\u6E90\u72B6\u6001\u83B7\u53D6\u5931\u8D25\uFF1A${status.resourceStatusError}`) : null
      ) : import_react.default.createElement(
        "div",
        { className: "enterprise-settings__login" },
        import_react.default.createElement(
          "div",
          { className: "enterprise-settings__login-copy" },
          import_react.default.createElement("strong", null, "\u767B\u5F55\u4F01\u4E1A\u8D26\u53F7"),
          import_react.default.createElement("span", null, "\u4F7F\u7528\u4F01\u4E1A\u7EDF\u4E00\u8EAB\u4EFD\u767B\u5F55\uFF0C\u767B\u5F55\u5B8C\u6210\u540E\u4F1A\u81EA\u52A8\u51C6\u5907\u6240\u9700\u80FD\u529B\u3002")
        ),
        import_react.default.createElement("button", {
          className: "enterprise-settings__button enterprise-settings__button--primary",
          type: "button",
          disabled: busy,
          onClick: login
        }, busy ? "\u6B63\u5728\u6253\u5F00\u2026" : "\u767B\u5F55")
      ),
      error ? import_react.default.createElement("div", { className: "enterprise-settings__error" }, error) : null,
      notice ? import_react.default.createElement("div", { className: "enterprise-settings__success" }, notice) : null
    ),
    status?.device ? import_react.default.createElement(
      "div",
      { className: "enterprise-settings__card" },
      import_react.default.createElement("h3", { className: "enterprise-settings__card-title" }, "\u672C\u673A\u8BBE\u5907"),
      import_react.default.createElement(
        "p",
        { className: "enterprise-settings__card-description" },
        "\u8BBE\u5907\u8EAB\u4EFD\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u9000\u51FA\u6216\u91CD\u65B0\u767B\u5F55\u4E0D\u4F1A\u6539\u53D8\uFF1B\u4E0D\u540C\u4F01\u4E1A\u7528\u6237\u7684\u8D44\u6E90\u6743\u9650\u4ECD\u76F8\u4E92\u9694\u79BB\u3002"
      ),
      import_react.default.createElement(
        "div",
        { className: "enterprise-settings__device-grid" },
        deviceItem("\u8BBE\u5907\u540D\u79F0", status.device.name || "\u672A\u77E5"),
        deviceItem("\u8BBE\u5907\u72B6\u6001", {
          ready: status.device.registered && status.device.status === "active",
          text: status.device.registered ? status.device.status === "active" ? "\u5DF2\u767B\u8BB0" : status.device.status : "\u767B\u5F55\u540E\u81EA\u52A8\u767B\u8BB0"
        }, { state: true }),
        deviceItem("\u8BBE\u5907 ID", status.device.uuid || "\u672A\u77E5", { mono: true }),
        deviceItem("\u7CFB\u7EDF\u4E0E\u5BA2\u6237\u7AEF", `${platformName(status.device.platform)} \xB7 ${status.device.clientVersion || "\u672A\u77E5\u7248\u672C"}`)
      )
    ) : null,
    status ? import_react.default.createElement(
      "div",
      { className: "enterprise-settings__card" },
      import_react.default.createElement("h3", { className: "enterprise-settings__card-title" }, "\u4F01\u4E1A\u8FDE\u63A5\u914D\u7F6E"),
      import_react.default.createElement(
        "p",
        { className: "enterprise-settings__card-description" },
        status.connectionEditable ? "\u4EC5\u7528\u4E8E\u63D2\u4EF6\u72EC\u7ACB\u5B89\u88C5\u3001\u5F00\u53D1\u548C\u6D4B\u8BD5\u73AF\u5883\u3002\u4FEE\u6539\u540E\u9700\u8981\u91CD\u65B0\u767B\u5F55\u4F01\u4E1A\u8D26\u53F7\u3002" : "\u5F53\u524D\u8FDE\u63A5\u7531\u4F01\u4E1A\u5B89\u88C5\u5305\u7EDF\u4E00\u7BA1\u7406\u3002"
      ),
      import_react.default.createElement(
        "form",
        { className: "enterprise-settings__form", onSubmit: saveConnection },
        import_react.default.createElement(
          "label",
          { className: "enterprise-settings__field" },
          import_react.default.createElement("span", { className: "enterprise-settings__field-label" }, "\u4F01\u4E1A\u670D\u52A1\u5730\u5740"),
          import_react.default.createElement("input", {
            className: "enterprise-settings__input",
            type: "url",
            required: true,
            disabled: busy || !status.connectionEditable,
            value: baseUrl,
            placeholder: "https://rclaw-test.example.com",
            onChange: (event) => {
              setBaseUrl(event.target.value);
              setConnectionDirty(true);
            }
          }),
          import_react.default.createElement("span", { className: "enterprise-settings__field-hint" }, "\u8FDE\u63A5 RClaw \u7684\u6839\u5730\u5740\uFF0C\u4E0D\u8981\u586B\u5199 /api \u63A5\u53E3\u8DEF\u5F84\u3002")
        ),
        import_react.default.createElement(
          "label",
          { className: "enterprise-settings__field" },
          import_react.default.createElement("span", { className: "enterprise-settings__field-label" }, "\u7EC4\u7EC7\u7F16\u7801"),
          import_react.default.createElement("input", {
            className: "enterprise-settings__input",
            type: "text",
            required: true,
            maxLength: 50,
            disabled: busy || !status.connectionEditable,
            value: orgCode,
            placeholder: "default",
            onChange: (event) => {
              setOrgCode(event.target.value);
              setConnectionDirty(true);
            }
          }),
          import_react.default.createElement("span", { className: "enterprise-settings__field-hint" }, "\u5BF9\u5E94 RClaw\u300C\u79DF\u6237\u7BA1\u7406\u300D\u4E2D\u7684\u79DF\u6237\u7F16\u7801\uFF0C\u5B83\u4E0D\u662F\u5BC6\u94A5\u3002")
        ),
        import_react.default.createElement(
          "div",
          { className: "enterprise-settings__form-actions" },
          status.connectionEditable ? import_react.default.createElement("button", {
            className: "enterprise-settings__button enterprise-settings__button--primary",
            type: "submit",
            disabled: busy || !connectionDirty || !baseUrl.trim() || !orgCode.trim()
          }, busy ? "\u6B63\u5728\u4FDD\u5B58\u2026" : "\u4FDD\u5B58\u914D\u7F6E") : null,
          status.connectionEditable && status.connectionSource === "saved" ? import_react.default.createElement("button", {
            className: "enterprise-settings__button enterprise-settings__button--danger",
            type: "button",
            disabled: busy,
            onClick: resetConnection
          }, "\u6062\u590D\u542F\u52A8\u9ED8\u8BA4\u503C") : null,
          import_react.default.createElement(
            "span",
            { className: "enterprise-settings__source" },
            status.connectionSource === "saved" ? "\u5F53\u524D\u4F7F\u7528\u672C\u673A\u4FDD\u5B58\u914D\u7F6E" : "\u5F53\u524D\u4F7F\u7528\u5B89\u88C5\u5305/\u542F\u52A8\u9ED8\u8BA4\u914D\u7F6E"
          )
        )
      ),
      import_react.default.createElement(
        "div",
        { className: "enterprise-settings__release" },
        `\u4F01\u4E1A\u63D2\u4EF6 ${status.pluginVersion || "\u672A\u77E5"} \xB7 \u9002\u914D DSH Runtime ${status.dshRuntimeBaseline || "\u672A\u77E5"}`
      )
    ) : null
  );
}
var name = "coagents-enterprise-client";
var inject = ["slots"];
function apply(ctx) {
  injectStyles();
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "enterprise",
    order: 90,
    label: () => "\u4F01\u4E1A",
    inject: () => ({})
  }, EnterpriseSettings));
}

return module.exports; } });
