import { defineConfig } from 'tsdown'

/**
 * The enterprise bundle ships prebuilt JavaScript: `src/index.js` and its
 * sibling modules are the vendor's build output, so this config bundles them
 * into the single `lib/index.js` artifact the package publishes, republishes
 * the browser half as `lib/client.js`, copies the skill bodies beside it, and
 * installs the hand-written declarations the prebuilt modules carry no
 * generated types for. The browser half already carries the module-loader
 * registration wrapper and reads `react` from the module table baseline, so
 * bundling it again only restates the published bytes.
 */
export default defineConfig([
  {
    entry: ['src/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    copy: [
      { from: 'src/skills', to: 'lib' },
      { from: 'src/index.d.ts', to: 'lib/types' },
    ],
  },
  {
    name: '@deepseek-ai/dsh-coagents-enterprise/client',
    entry: ['src/client.js'],
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: false,
    outputOptions: { entryFileNames: 'client.js' },
  },
])
