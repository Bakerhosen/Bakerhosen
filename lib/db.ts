import "server-only";
import postgres from "postgres";
let client: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Database is not configured. Follow README.md to connect Supabase.",
    );
  return (client ??= postgres(process.env.DATABASE_URL, {
    ssl: "require",
    prepare: false,
    max: 5,
  }));
}
