// Run against a local app connected to a disposable Supabase project.
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
function session() {
  let cookie = "";
  return async (path, body, secret) => {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(secret ? { "x-organizer-secret": secret } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: response.status, data: await response.json() };
  };
}
const organizer = session(),
  friend = session();
const created = await organizer("/api/plans", {
  title: "Roundtable integration test",
});
assert.equal(created.status, 201, JSON.stringify(created.data));
const { id, secret } = created.data,
  path = `/api/plans/${id}`;
const future =
  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) + "T18:30";
assert.equal(
  (
    await friend(path, {
      action: "add",
      place: "Café Central",
      localTime: future,
      mapsUrl: "https://www.google.com/maps/place/Vienna",
    })
  ).status,
  200,
);
assert.equal(
  (
    await organizer(path, {
      action: "add",
      place: "The park",
      localTime: future,
      mapsUrl: "",
    })
  ).status,
  200,
);
let snapshot = (await friend(path)).data;
assert.equal(snapshot.isOrganizer, false);
assert.ok(!JSON.stringify(snapshot).includes(secret));
assert.ok(!JSON.stringify(snapshot).includes("organizer_hash"));
const [a, b] = snapshot.options;
assert.equal(
  (await friend(path, { action: "vote", optionId: a.id, nickname: "Alex" }))
    .status,
  200,
);
assert.equal(
  (await friend(path, { action: "vote", optionId: b.id, nickname: "Alex" }))
    .status,
  200,
);
snapshot = (await friend(path)).data;
assert.equal(snapshot.myVote, b.id);
assert.equal(
  snapshot.options.reduce((sum, o) => sum + o.votes, 0),
  1,
);
assert.equal(
  (await friend(path, { action: "confirm", optionId: a.id })).status,
  403,
);
assert.equal(
  (await friend(path, { action: "confirm", optionId: a.id }, "0".repeat(64)))
    .status,
  403,
);
const other = await organizer("/api/plans", { title: "Other plan" });
assert.equal(
  (
    await friend(`/api/plans/${other.data.id}`, {
      action: "vote",
      optionId: a.id,
      nickname: "Alex",
    })
  ).status,
  400,
);
assert.equal((await organizer(path, undefined, secret)).data.isOrganizer, true);
assert.equal(
  (await organizer(path, { action: "confirm", optionId: a.id }, secret)).status,
  200,
);
for (const client of [friend, organizer])
  assert.equal((await client(path)).data.confirmedOptionId, a.id);
assert.equal(
  (await friend(path, { action: "vote", optionId: b.id, nickname: "Alex" }))
    .status,
  409,
);
assert.equal(
  (
    await friend(path, {
      action: "add",
      place: "Too late",
      localTime: future,
      mapsUrl: "",
    })
  ).status,
  409,
);
// Concurrent writes may win before confirmation, or be rejected afterwards.
const race = await organizer("/api/plans", { title: "Concurrency test" }),
  racePath = `/api/plans/${race.data.id}`;
await friend(racePath, {
  action: "add",
  place: "Race venue",
  localTime: future,
  mapsUrl: "",
});
const option = (await friend(racePath)).data.options[0];
const outcomes = await Promise.all([
  organizer(
    racePath,
    { action: "confirm", optionId: option.id },
    race.data.secret,
  ),
  friend(racePath, { action: "vote", optionId: option.id, nickname: "Alex" }),
  friend(racePath, {
    action: "add",
    place: "Concurrent option",
    localTime: future,
    mapsUrl: "",
  }),
]);
assert.equal(outcomes[0].status, 200);
for (const result of outcomes.slice(1))
  assert.ok([200, 409].includes(result.status));
assert.equal(
  (
    await friend(racePath, {
      action: "vote",
      optionId: option.id,
      nickname: "Alex",
    })
  ).status,
  409,
);
console.log(
  "PASS: two independent cookie sessions, vote changes, authorization, cross-plan validation, confirmation, closed writes, concurrent writes.",
);
console.log(
  "Test plans remain in the disposable database:",
  id,
  other.data.id,
  race.data.id,
);
