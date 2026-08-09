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
});
