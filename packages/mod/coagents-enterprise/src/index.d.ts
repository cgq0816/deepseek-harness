import type { Context } from '@deepseek-ai/cordis'

/**
 * Enterprise endpoint settings the bundle patch reads from the environment.
 * The patch supplies each field as a `!!js` expression, so every one is optional at the type level.
 */
export interface EnterpriseConfig {
  /** Enterprise service base URL; the runtime defaults to a loopback address for local testing. */
  baseUrl?: string
  /** Organization code the session and device register under. */
  orgCode?: string
  /** Client version reported to the enterprise service. */
  clientVersion?: string
  /** Whether sign-in opens the system browser. */
  openBrowser?: boolean
  /** Whether the saved connection profile stays editable through the HTTP routes. */
  allowConnectionEditing?: boolean
}

/** Cordis plugin name this module registers under. */
export const name: 'coagents-enterprise'

/** Services this plugin waits for before `apply` runs. */
export const inject: readonly string[]

/**
 * Mount the enterprise surface: tools, skills, HTTP routes, and the signed-in session's MCP server.
 * @param ctx - Cordis context providing `connection`, `credentials`, `settings`, `skills`, `tools`, and `webServer`.
 * @param config - Enterprise endpoint settings from the bundle patch.
 * @returns Disposer removing every registration this plugin made.
 */
export function apply(ctx: Context, config?: EnterpriseConfig): Promise<() => void>
