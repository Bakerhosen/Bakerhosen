"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
type Option = {
  id: string;
  place: string;
  starts_at: string;
  maps_url: string | null;
  votes: number;
};
type Data = {
  title: string;
  confirmedOptionId: string | null;
  options: Option[];
  myVote: string | null;
  nickname: string;
  isOrganizer: boolean;
};
const date = (s: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(s));
export default function Plan({ id }: { id: string }) {
  const [data, setData] = useState<Data>(),
    [secret, setSecret] = useState(""),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [nickname, setNickname] = useState(""),
    [adding, setAdding] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => {
      setSecret(
        new URLSearchParams(location.hash.slice(1)).get("organizer") || "",
      );
      setReady(true);
    };
    const timer = setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  const load = useCallback(async () => {
    const r = await fetch(`/api/plans/${id}`, {
      headers: secret ? { "x-organizer-secret": secret } : {},
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    setNickname((n) => n || d.nickname);
  }, [id, secret]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    const interval = setInterval(() => load().catch(() => {}), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [load, ready]);
  async function write(body: object) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/plans/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-organizer-secret": secret } : {}),
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setNotice("Saved. Everyone sees the latest plan.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      await load().catch(() => {});
      return false;
    } finally {
      setBusy(false);
    }
  }
  const group =
    typeof location === "undefined" ? "" : `${location.origin}/p/${id}`;
  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Link copied!");
    } catch {
      setError("Copy is unavailable. Select and copy the link below.");
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.title, url: group });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await copy(group);
  }
  const final = data?.options.find((o) => o.id === data.confirmedOptionId);
  return (
    <main className="plan-main">
      <Link className="back" href="/">
        ← All good plans start here
      </Link>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!data ? (
        <section className="panel">
          <h1 className="plan-title">
            {error ? "Your plan is unavailable" : "Pulling up your table…"}
          </h1>
          <button
            onClick={() =>
              load()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <div className="plan-heading">
            <div>
              <div className="eyebrow">
                {final ? "IT’S A PLAN" : "YOUR PEOPLE. YOUR PLAN."}
              </div>
              <h1 className="plan-title">{data.title}</h1>
              <p>
                {final
                  ? "See you there. The details are settled."
                  : "A place and a time that work for your people."}
              </p>
            </div>
            <span className="status">
              {final ? "✓ Confirmed" : "● Taking votes"}
            </span>
          </div>
          <section className="share-panel">
            <div>
              <h3>Bring the group to the table.</h3>
              <p>Group link · Share this one with your friends.</p>
            </div>
            <div className="actions">
              <button onClick={() => copy(group)}>Copy group link</button>
              <button onClick={share}>Share ↗</button>
            </div>
            <input aria-label="Group link" readOnly value={group} />
          </section>
          {data.isOrganizer && (
            <details className="organizer">
              <summary>Your private organizer link — keep it safe</summary>
              <p>
                Only this link can confirm the final choice. Don’t share it with
                the group. Save it before leaving this page.
              </p>
              <input
                aria-label="Organizer link"
                readOnly
                value={`${group}#organizer=${secret}`}
              />
              <button onClick={() => copy(`${group}#organizer=${secret}`)}>
                Copy organizer link
              </button>
            </details>
          )}
          {secret && !data.isOrganizer && (
            <p className="error">
              This organizer link is invalid. You can still participate through
              the group link.
            </p>
          )}
          {final ? (
            <section className="final panel">
              <div className="eyebrow">✓ THE TABLE IS SET</div>
              <h2>{final.place}</h2>
              <p>{date(final.starts_at)}</p>
              {final.maps_url && (
                <a
                  className="map-link"
                  href={final.maps_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps ↗
                </a>
              )}
              <p className="muted">Voting and suggestions are closed.</p>
            </section>
          ) : (
            <>
              <section className="section-heading">
                <div>
                  <h2>The possibilities</h2>
                  <p>All times in Europe/Vienna. One vote per person.</p>
                </div>
                <button className="primary" onClick={() => setAdding(!adding)}>
                  ＋ Add option
                </button>
              </section>
              {adding && (
                <form
                  className="panel option-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    if (
                      await write({
                        action: "add",
                        place: f.get("place"),
                        localTime: f.get("localTime"),
                        mapsUrl: f.get("mapsUrl"),
                      })
                    )
                      setAdding(false);
                  }}
                >
                  <h3>Put an idea on the table</h3>
                  <label>
                    Place name
                    <input
                      name="place"
                      required
                      maxLength={120}
                      placeholder="e.g. Café Central"
                    />
                  </label>
                  <label>
                    Date and time · Europe/Vienna
                    <input type="datetime-local" name="localTime" required />
                  </label>
                  <label>
                    Google Maps URL <span className="muted">(optional)</span>
                    <input
                      type="url"
                      name="mapsUrl"
                      placeholder="https://maps.app.goo.gl/…"
                      maxLength={2048}
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Add option
                  </button>
                </form>
              )}
              <label className="nickname">
                Your nickname
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="What should we call you?"
                  maxLength={40}
                />
              </label>
              {!data.options.length && (
                <section className="empty panel">
                  <span>◌</span>
                  <h3>A blank table, full of possibilities.</h3>
                  <p>Be the first to suggest a place and time.</p>
                  <button onClick={() => setAdding(true)}>Add option</button>
                </section>
              )}
              <div className="options">
                {data.options.map((o, i) => (
                  <article
                    className={`option panel ${data.myVote === o.id ? "selected" : ""}`}
                    key={o.id}
                  >
                    <div className="option-number">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="option-body">
                      <h3>{o.place}</h3>
                      <p>{date(o.starts_at)}</p>
                      {o.maps_url && (
                        <a href={o.maps_url} target="_blank" rel="noreferrer">
                          Google Maps ↗
                        </a>
                      )}
                      <div className="vote-bar">
                        <span>
                          {o.votes} {o.votes === 1 ? "vote" : "votes"}
                        </span>
                        <button
                          disabled={busy || !nickname.trim()}
                          onClick={() =>
                            write({ action: "vote", optionId: o.id, nickname })
                          }
                        >
                          {data.myVote === o.id ? "✓ Your vote" : "Vote"}
                        </button>
                      </div>
                      {data.isOrganizer &&
                        (confirm === o.id ? (
                          <div className="confirm-box">
                            <p>
                              Confirm this place and time? This closes all
                              voting and suggestions.
                            </p>
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() =>
                                write({ action: "confirm", optionId: o.id })
                              }
                            >
                              Confirm plan
                            </button>
                            <button onClick={() => setConfirm(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-button"
                            onClick={() => setConfirm(o.id)}
                          >
                            Choose as final plan →
                          </button>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
              <p className="muted">
                You can change your vote from this browser.{" "}
                {data.isOrganizer
                  ? "You can confirm any option."
                  : "The organizer will confirm the final plan."}
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
