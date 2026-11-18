"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Board, PublicUser } from "@/lib/auth";

type Digest = { enabled: boolean; frequency: "daily" | "weekly"; topics: string[]; boardIds: string[] };

type FavoritePaper = {
  _id: string;
  title: string;
  url?: string;
  authors?: string[];
  publishedDate?: string;
  topic?: string;
};

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export const boardHref = (board: Board) =>
  `/feed/${encodeURIComponent(board.topic)}?q=${encodeURIComponent(board.query)}&board=${encodeURIComponent(board.name)}`;

export default function ProfileClient({
  user,
  initialBoards,
  initialDigest,
  topics,
}: {
  user: PublicUser;
  initialBoards: Board[];
  initialDigest: Digest;
  topics: string[];
}) {
  const router = useRouter();

  async function logout() {
    await send("/api/auth/logout", "POST");
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="feed-header">
        <div>
          <p className="label">Your profile</p>
          <h1>{user.name}</h1>
          <p className="muted">{user.email}</p>
        </div>
        <div className="buttons">
          <Link href="/" className="button">Browse topics</Link>
          <button className="button" onClick={logout}>Log out</button>
        </div>
      </div>

      <Favorites />
      <Boards initial={initialBoards} topics={topics} onChange={() => router.refresh()} />
      <DigestSettings initial={initialDigest} boards={initialBoards} topics={topics} />
    </>
  );
}

function Favorites() {
  const [papers, setPapers] = useState<FavoritePaper[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    send("/api/favorites", "GET")
      .then((data) => setPapers(data.papers))
      .catch((error) => setError(error.message));
  }, []);

  async function remove(id: string) {
    await send("/api/favorites", "DELETE", { paperId: id });
    setPapers((list) => list?.filter((paper) => paper._id !== id) ?? null);
  }

  return (
    <section>
      <h2>Saved papers</h2>
      {error && <p role="alert" className="form-error">{error}</p>}
      {!papers && !error && <p role="status">Loading...</p>}
      {papers?.length === 0 && (
        <div className="empty">
          <h2>Nothing saved yet</h2>
          <p>Press ☆ Save on any paper in a feed and it shows up here.</p>
        </div>
      )}
      {papers?.map((paper) => (
        <article key={paper._id} className="paper">
          <p className="label">
            {paper.publishedDate || "Date unavailable"}
            {paper.topic ? ` · ${paper.topic}` : ""}
          </p>
          <h2>{paper.title}</h2>
          {!!paper.authors?.length && (
            <p className="muted">
              {paper.authors.slice(0, 3).join(", ")}
              {paper.authors.length > 3 ? " et al." : ""}
            </p>
          )}
          <div className="paper-actions">
            {paper.url && (
              <a href={paper.url} target="_blank" rel="noreferrer">Read original paper →</a>
            )}
            <button className="button" onClick={() => remove(paper._id)}>Remove</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function Boards({ initial, topics, onChange }: { initial: Board[]; topics: string[]; onChange: () => void }) {
  const [boards, setBoards] = useState(initial);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const { board } = await send("/api/boards", "POST", { name, topic, query });
      setBoards((list) => [...list, board]);
      setName("");
      setQuery("");
      onChange();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create the board.");
    }
  }

  async function remove(id: string) {
    await send("/api/boards", "DELETE", { id });
    setBoards((list) => list.filter((board) => board.id !== id));
    onChange();
  }

  return (
    <section>
      <h2>Your subject boards</h2>
      <p className="muted">
        A board is your own subject: pick a topic and narrow it with keywords, like “protein folding” in Biotechnology.
      </p>

      <div className="topics board-list">
        {boards.map((board) => (
          <div key={board.id} className="topic">
            <h3>{board.name}</h3>
            <p>
              {board.topic} · “{board.query}”
            </p>
            <div className="paper-actions">
              <Link href={boardHref(board)} className="topic-link">Open board →</Link>
              <button className="link-button" onClick={() => remove(board.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={create} className="form form-inline">
        <label>
          Board name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Protein folding" maxLength={60} required />
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Keywords
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="alphafold structure prediction" maxLength={200} required />
        </label>
        <button className="button button-red" type="submit">Create board</button>
      </form>
      {error && <p role="alert" className="form-error">{error}</p>}
    </section>
  );
}

function DigestSettings({ initial, boards, topics }: { initial: Digest; boards: Board[]; topics: string[] }) {
  const [digest, setDigest] = useState(initial);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  async function save(next: Digest = digest) {
    setError("");
    setStatus("");
    try {
      const data = await send("/api/digest/settings", "PUT", next);
      setDigest({ ...next, ...data.digest });
      setStatus("Saved.");
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save.");
      return false;
    }
  }

  async function sendNow() {
    setBusy(true);
    setStatus("");
    if (await save()) {
      try {
        const data = await send("/api/digest/test", "POST");
        setStatus(data.message);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not send.");
      }
    }
    setBusy(false);
  }

  return (
    <section>
      <h2>Email digest</h2>
      <div className="step digest">
        <label className="check">
          <input
            type="checkbox"
            checked={digest.enabled}
            onChange={(e) => setDigest({ ...digest, enabled: e.target.checked })}
          />
          Email me new papers
        </label>

        <label>
          How often
          <select
            value={digest.frequency}
            onChange={(e) => setDigest({ ...digest, frequency: e.target.value as Digest["frequency"] })}
          >
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
          </select>
        </label>

        <fieldset>
          <legend>Topics</legend>
          {topics.map((topic) => (
            <label key={topic} className="check">
              <input
                type="checkbox"
                checked={digest.topics.includes(topic)}
                onChange={() => setDigest({ ...digest, topics: toggle(digest.topics, topic) })}
              />
              {topic}
            </label>
          ))}
        </fieldset>

        {boards.length > 0 && (
          <fieldset>
            <legend>Your boards</legend>
            {boards.map((board) => (
              <label key={board.id} className="check">
                <input
                  type="checkbox"
                  checked={digest.boardIds.includes(board.id)}
                  onChange={() => setDigest({ ...digest, boardIds: toggle(digest.boardIds, board.id) })}
                />
                {board.name}
              </label>
            ))}
          </fieldset>
        )}

        <p className="muted">Up to 5 new papers per topic or board. Papers you have already been sent are skipped.</p>

        <div className="buttons">
          <button className="button button-red" onClick={() => save()} disabled={busy}>Save settings</button>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              if (await save()) window.open("/api/digest/preview", "_blank");
            }}
          >
            Preview email
          </button>
          <button className="button" onClick={sendNow} disabled={busy}>
            {busy ? "Sending..." : "Send me one now"}
          </button>
        </div>
        {status && <p role="status">{status}</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
      </div>
    </section>
  );
}
