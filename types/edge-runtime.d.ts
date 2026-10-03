// Minimal ambient types for the Supabase Edge Function runtime (Deno).
//
// The real types ship with Deno (`jsr:@supabase/functions-js/edge-runtime.d.ts`,
// imported by the function itself) and are not installable through npm. This
// shim lets `tsc -p tsconfig.functions.json` type-check the functions in CI
// without installing Deno. Extend it when a function uses another Deno API.
declare namespace Deno {
  interface Env {
    get(name: string): string | undefined;
  }
  const env: Env;
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}
