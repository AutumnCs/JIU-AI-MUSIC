import type { D1Migration } from "@cloudflare/vitest-pool-workers";

declare module "cloudflare:workers" {
  interface Env {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }
}
