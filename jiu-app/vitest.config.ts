import path from "node:path";
import { defineConfig } from "vitest/config";

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
      include: ["test/**/*.test.ts", "lib/assistant/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
