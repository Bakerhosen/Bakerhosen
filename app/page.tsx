"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const title = new FormData(e.currentTarget).get("title");
      const r = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      router.push(`/p/${d.id}#organizer=${d.secret}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">
          <span /> LESS BACK-AND-FORTH, MORE GETTING TOGETHER
        </div>
        <h1>
          Good plans start
          <br />
          at the <em>roundtable.</em>
        </h1>
        <p className="intro">
          Pick a place. Find a time. Bring your people.
          <br />
          Turn “we should meet up” into an actual plan.
        </p>
        <div className="people">
          <div className="avatars">
            <b>J</b>
            <b>M</b>
            <b>A</b>
            <b>Y</b>
          </div>
          <span>
            No accounts. No endless group chats.
            <br />
            <strong>Just a plan everyone can get behind.</strong>
          </span>
        </div>
      </section>
      <section className="create-card">
        <div className="card-top">
          <span className="tiny-icon">↗</span>
          <span>LET’S GET SOMETHING GOING</span>
        </div>
        <h2>What’s the occasion?</h2>
        <p>Start with a name. The details come together.</p>
        <form onSubmit={create}>
          <label htmlFor="title">Plan name</label>
          <input
            id="title"
            name="title"
            placeholder="e.g. Friday Night"
            maxLength={100}
            required
            autoComplete="off"
          />
          <button className="primary" disabled={busy}>
            {busy ? "Creating…" : "Create plan"} <span>→</span>
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
        <div className="card-foot">♡ &nbsp; Free to plan. Easy to share.</div>
      </section>
      <section className="steps">
        <article>
          <span>01 / START IT</span>
          <h3>A little idea.</h3>
          <p>Name your plan and send the group link to your friends.</p>
        </article>
        <article>
          <span>02 / SHAPE IT</span>
          <h3>Everyone gets a say.</h3>
          <p>Suggest a place and time. Vote for the option that works.</p>
        </article>
        <article>
          <span>03 / MAKE IT HAPPEN</span>
          <h3>See you there.</h3>
          <p>The organizer confirms the plan. Everyone’s on the same page.</p>
        </article>
      </section>
    </main>
  );
}
