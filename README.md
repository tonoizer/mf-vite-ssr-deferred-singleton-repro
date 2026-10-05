# mf-vite-ssr-deferred-singleton-repro

Minimal reproduction of an SSR regression in `@module-federation/vite` introduced by [module-federation/vite#1357](https://github.com/module-federation/vite/pull/1357) (`fix: defer entry-injected singleton fallbacks`).

Public npm only. No `node_modules` or `dist` are committed.

## What breaks

A Vite + Vue remote with:

- `shared: { vue: { singleton: true } }`
- `shareStrategy: 'version-first'`
- `hostInitInjectLocation: 'entry'` (**must be explicit**; the plugin default is `'html'`)
- an expose that uses Vue named exports at **module scope** (`defineComponent(...)` at the top of `src/App.js`)

Before #1357, the generated Vue `loadShare` wrapper applied the local fallback synchronously on the server (`if (import.meta.env.SSR)`). After #1357, Vue is treated as a deferred entry-injected singleton: `__mf_N` stays unassigned until `initPromise`, a host cache write, or a dynamic import. Evaluating `src/App.js` calls `defineComponent(...)` immediately, so Node throws:

```text
TypeError: __mf_N is not a function
```

(`N` is `0`, `1`, … — the generated named-export locals in the `loadShare` wrapper.)

## Versions

| Package | Works | Breaks |
| --- | --- | --- |
| `@module-federation/vite` | **1.22.1** | **1.23.2** |
| `vite` | 7.1.12 | 7.1.12 |
| `vue` | 3.5.22 | 3.5.22 |

#1357 merged into `1.23.0` (2026-09-28). `1.23.2` still fails this SSR path.

## How to run

Requires Node 20+ and network access to the public npm registry.

```bash
npm run verify
```

That script installs dependencies, then runs this matrix:

1. `@module-federation/vite@1.22.1` → `vite build --ssr` + `scripts/ssr-render.mjs`  
   **Expect:** rendered markup containing `id="ssr-ok"` (for example `<h1 id="ssr-ok">SSR shared vue singleton</h1>`).
2. `@module-federation/vite@1.23.2` → same commands  
   **Expect:** `TypeError: __mf_N is not a function`.

`npm run verify` exits **0** only when that matrix matches (the regression is reproduced). It exits **1** if 1.22.1 fails, or if 1.23.2 succeeds / fails with a different error.

### One version by hand

```bash
npm install
npm install --no-save @module-federation/vite@1.22.1   # or 1.23.2
npm run build:ssr
node scripts/ssr-render.mjs
```

## Why `hostInitInjectLocation: 'entry'`

The plugin default is `'html'`. The Vue deferred-fallback path added in #1357 applies when host init is injected into the JS entry (typical for SSR hosts without a root `index.html`, such as Nitro or TanStack Start). This repo sets `'entry'` explicitly so the regression is not hidden by the HTML-injection default.
