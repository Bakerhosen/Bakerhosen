import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { titleSchema } from "@/lib/validation";
import { failure, sameOrigin } from "@/lib/http";
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const title = titleSchema.parse((await r.json()).title);
    const id = randomBytes(16).toString("hex"),
      secret = randomBytes(32).toString("hex"),
      hash = createHash("sha256").update(secret).digest("hex");
    await db()`insert into plans(id,title,organizer_hash) values(${id},${title},${hash})`;
    return NextResponse.json(
      { id, secret },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
