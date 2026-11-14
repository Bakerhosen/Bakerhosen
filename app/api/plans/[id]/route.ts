import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { optionSchema, nicknameSchema } from "@/lib/validation";
import { failure, HttpError, sameOrigin } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
async function identity() {
  const jar = await cookies(),
    old = jar.get("roundtable_participant")?.value;
  if (old && z.string().uuid().safeParse(old).success) return old;
  const id = randomUUID();
  jar.set("roundtable_participant", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
  return id;
}
function organizer(r: Request, hash: string) {
  const secret = r.headers.get("x-organizer-secret") || "";
  return (
    /^[a-f0-9]{64}$/.test(secret) &&
    timingSafeEqual(
      Buffer.from(createHash("sha256").update(secret).digest("hex")),
      Buffer.from(hash),
    )
  );
}
export async function GET(r: Request, c: Context) {
  try {
    const { id } = await c.params,
      participant = await identity();
    const data = await db().begin(async (sql) => {
      await sql`set transaction isolation level repeatable read`;
      const [p] =
        await sql`select id,title,confirmed_option_id,organizer_hash from plans where id=${id}`;
      if (!p) throw new HttpError(404, "Plan not found. Check your link.");
      const options =
        await sql`select o.id,o.place,o.starts_at,o.maps_url,count(v.participant_id)::int as votes from options o left join votes v on v.option_id=o.id and v.plan_id=o.plan_id where o.plan_id=${id} group by o.id order by o.starts_at,o.id`;
      const [v] =
        await sql`select option_id,nickname from votes where plan_id=${id} and participant_id=${participant}`;
      return {
        id: p.id,
        title: p.title,
        confirmedOptionId: p.confirmed_option_id,
        options,
        myVote: v?.option_id ?? null,
        nickname: v?.nickname ?? "",
        isOrganizer: organizer(r, p.organizer_hash),
      };
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request, c: Context) {
  try {
    sameOrigin(r);
    const { id } = await c.params,
      participant = await identity(),
      body = await r.json();
    await db().begin(async (sql) => {
      const [p] =
        await sql`select organizer_hash,confirmed_option_id from plans where id=${id} for update`;
      if (!p) throw new HttpError(404, "Plan not found.");
      if (body.action === "confirm" && !organizer(r, p.organizer_hash))
        throw new HttpError(403, "Only the organizer can confirm this plan.");
      if (p.confirmed_option_id)
        throw new HttpError(
          409,
          "This plan is confirmed. Voting and suggestions are closed.",
        );
      if (body.action === "add") {
        const d = optionSchema.parse(body),
          t = DateTime.fromISO(d.localTime, { zone: "Europe/Vienna" });
        if (!t.isValid || t.toFormat("yyyy-MM-dd'T'HH:mm") !== d.localTime)
          throw new HttpError(400, "Choose a valid Vienna date and time.");
        if (t.toMillis() <= Date.now())
          throw new HttpError(400, "Choose a future time.");
        if (t.getPossibleOffsets().length > 1)
          throw new HttpError(
            400,
            "This time occurs twice when clocks change. Choose another time.",
          );
        await sql`insert into options(plan_id,place,starts_at,maps_url) values(${id},${d.place},${t.toISO()!},${d.mapsUrl || null})`;
      } else if (body.action === "vote" || body.action === "confirm") {
        const optionId = z.string().uuid().parse(body.optionId);
        const [o] =
          await sql`select id from options where id=${optionId} and plan_id=${id}`;
        if (!o)
          throw new HttpError(400, "That option does not belong to this plan.");
        if (body.action === "vote") {
          const nickname = nicknameSchema.parse(body.nickname);
          await sql`insert into votes(plan_id,participant_id,nickname,option_id) values(${id},${participant},${nickname},${optionId}) on conflict(plan_id,participant_id) do update set nickname=excluded.nickname,option_id=excluded.option_id`;
        } else
          await sql`update plans set confirmed_option_id=${optionId} where id=${id}`;
      } else throw new HttpError(400, "Unknown action.");
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
