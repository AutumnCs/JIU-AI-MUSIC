import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const EXPECTED_TABLES = [
  "community_comment_likes",
  "community_comments",
  "community_notifications",
  "community_post_favorites",
  "community_post_likes",
  "community_post_media",
  "community_post_music",
  "community_posts",
  "music_tasks",
  "sessions",
  "users",
];

describe("D1 migration", () => {
  it("creates the complete application schema", async () => {
    const result = await env.DB.prepare(
      "select name from sqlite_schema where type = 'table' and name not like '_cf_%' and name not like 'sqlite_%' and name != 'd1_migrations' order by name",
    ).all<{ name: string }>();

    expect(result.results.map((row) => row.name)).toEqual(EXPECTED_TABLES);
  });

  it.each([
    "community_post_likes",
    "community_post_favorites",
    "community_comment_likes",
  ])("stores atomic transition state on %s", async (table) => {
    const result = await env.DB.prepare(`pragma table_info(${table})`).all<{
      name: string;
      notnull: number;
      dflt_value: string | null;
    }>();

    expect(result.results
      .filter((column) => column.name === "active" || column.name === "operation_token")
      .map(({ name, notnull, dflt_value: defaultValue }) => ({
        name,
        notnull,
        defaultValue,
      })))
      .toEqual([
        { name: "active", notnull: 1, defaultValue: "1" },
        { name: "operation_token", notnull: 0, defaultValue: null },
      ]);
  });
});
