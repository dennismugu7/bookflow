/// <reference types="vite/client" />

/**
 * The build-time environment, typed.
 *
 * ── WITHOUT THIS, `import.meta.env[...]` IS `any` ─────────────────────────
 *
 * Vite's own `ImportMetaEnv` has an index signature returning `any`, so reading
 * a custom variable yields `any` and every use of it is unchecked —
 * `typescript-eslint`'s `no-unsafe-assignment` says so, and it is right: a
 * `string | undefined` that arrives as `any` would let `.replace` be called on
 * `undefined` at runtime with nothing complaining at build time.
 *
 * Declaring the variable narrows it to what it actually is. **Optional, not
 * required**: a build with nothing set is valid and falls back to the committed
 * staging default, so a type saying `string` would be a lie.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
