"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";

type SavedPaper = {
  _id: string;
  title: string;
  authors?: string[];
  summary?: string;
  abstract?: string;
  url?: string;
  publishedDate?: string;
  subtopic?: string;
};

type FeedResponse = {
  papers: SavedPaper[];
  total: number;
  nextCursor: string | null;
};

export default function FeedPage() {
  return (
    <Suspense>
      <FeedRoute />
    </Suspense>
  );
}

function FeedRoute() {
  const params = useParams<{ topic: string }>();
  const searchParams = useSearchParams();
  const topic = decodeURIComponent(params.topic);
  // A subject board opens this same feed with its keywords filled in.
  const initialQuery = searchParams.get("q") ?? "";
  const board = searchParams.get("board") ?? "";

  // Reset the feed when navigating between subjects or boards.
  return (
    <ResearchFeed
      key={`${topic}|${initialQuery}|${board}`}
      topic={topic}
      initialQuery={initialQuery}
      board={board}
    />
  );
}

function ResearchFeed({
  topic,
  initialQuery,
  board,
}: {
  topic: string;
  initialQuery: string;
  board: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [loggedIn, setLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [days, setDays] = useState("90");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      if (!cursor) {
        setPapers([]);
        setTotal(0);
        setNextCursor(null);
      }

      const search = new URLSearchParams({
        topic,
        days,
        q: query,
      });

      if (cursor) search.set("cursor", cursor);

      try {
        const response = await fetch(`/api/papers?${search}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load papers.");
        }

        if (controller.signal.aborted) return;

        const result = data as FeedResponse;

        setPapers((previous) => {
          const combined = cursor
            ? [...previous, ...result.papers]
            : result.papers;

          return [
            ...new Map(
              combined.map((paper) => [paper._id, paper])
            ).values(),
          ];
        });

        setTotal(result.total);
        setNextCursor(result.nextCursor);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not load papers."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [topic, query, days, cursor, refresh]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setLoggedIn(!!data.user);
        setFavorites(new Set(data.favorites ?? []));
      })
      .catch(() => {});
  }, []);

  async function toggleFavorite(paperId: string) {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    const saved = favorites.has(paperId);
    const next = new Set(favorites);
    if (saved) next.delete(paperId);
    else next.add(paperId);
    setFavorites(next); // update right away; undo below if the request fails

    const response = await fetch("/api/favorites", {
      method: saved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId }),
    }).catch(() => null);

    if (!response?.ok) setFavorites(favorites);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(null);
    setQuery(draft.trim());
    setRefresh((value) => value + 1);
  }

  function reload() {
    setCursor(null);
    setRefresh((value) => value + 1);
  }

  return (
    <>
      <div className="feed-header">
        <div>
          <p className="label">
            {board ? `Your board · ${topic}` : "Recent research · Newest first"}
          </p>
          <h1>{board || topic}</h1>
        </div>
        <div className="buttons">
          <Link href="/" className="button">
            Change topic
          </Link>
          <button
            className="button button-red"
            onClick={reload}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <form onSubmit={search} className="buttons">
        <input
          aria-label={`Search within ${topic}`}
          placeholder={`Search within ${topic}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={200}
          style={{ padding: "12px", flex: 1, minWidth: 180 }}
        />

        <select
          aria-label="Publication date range"
          value={days}
          onChange={(event) => {
            setCursor(null);
            setDays(event.target.value);
          }}
          style={{ padding: "12px" }}
        >
          <option value="7">Past 7 days</option>
          <option value="30">Past 30 days</option>
          <option value="90">Past 90 days</option>
          <option value="365">Past year</option>
        </select>

        <button className="button" type="submit">
          Search
        </button>
      </form>

      <p>
        Showing {papers.length} of approximately {total.toLocaleString()}{" "}
        matching papers.
      </p>

      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            className="button"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      {papers.map((paper) => (
        <article key={paper._id} className="paper">
          <p className="label">
            {paper.publishedDate || "Date unavailable"}
            {paper.subtopic ? ` · ${paper.subtopic}` : ""}
          </p>

          <h2>{paper.title}</h2>

          {!!paper.authors?.length && (
            <p className="muted">
              {paper.authors.slice(0, 3).join(", ")}
              {paper.authors.length > 3 ? " et al." : ""}
            </p>
          )}

          <p>
            {paper.summary?.trim() ||
              paper.abstract?.trim() ||
              "No abstract available."}
          </p>

          <div className="paper-actions">
            {paper.url && (
              <a href={paper.url} target="_blank" rel="noreferrer">
                Read original paper →
              </a>
            )}
            <button
              className={`button save${favorites.has(paper._id) ? " saved" : ""}`}
              onClick={() => toggleFavorite(paper._id)}
              aria-pressed={favorites.has(paper._id)}
            >
              {favorites.has(paper._id) ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </article>
      ))}

      {loading && <p role="status">Loading research...</p>}

      {!loading && !error && papers.length === 0 && (
        <div className="empty">
          <h2>No matching papers</h2>
          <p>Try a wider date range or a different search.</p>
        </div>
      )}

      {!loading && !error && nextCursor && (
        <button
          className="button button-red"
          onClick={() => setCursor(nextCursor)}
        >
          Load more papers
        </button>
      )}
    </>
  );
}