import path from "node:path";
import { defineConfig } from "vitest/config";

process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??=
  "postgres://test:test@127.0.0.1:5432/test";

export default defineConfig(async () => {
  const { cloudflareTest, readD1Migrations } = await import(
    "@cloudflare/vitest-pool-workers"
  );

  return {
    plugins: [
      cloudflareTest(async () => {
      const migrationsPath = path.join(__dirname, "migrations");
      const migrations = await readD1Migrations(migrationsPath);

      return {
        main: "./test/worker.ts",
        remoteBindings: false,
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
          d1Databases: ["DB"],
        },
      };
      }),
    ],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
