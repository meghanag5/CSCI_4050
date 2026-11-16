"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PAPERS } from "@/lib/papers";

export default function FeedPage() {
  const params = useParams<{ topic: string }>();
  const topic = decodeURIComponent(params.topic);
  const papers = PAPERS[topic] ?? [];

  return (
    <>
      <div className="feed-header">
        <div>
          <p className="label">Today&apos;s feed · {new Date().toDateString()}</p>
          <h1>{topic}</h1>
        </div>
        <div className="buttons">
          <Link href="/" className="button">Change topic</Link>
          <button className="button button-red">Refresh</button>
        </div>
      </div>

      {papers.length === 0 && (
        <div className="empty">
          <h2>No papers yet</h2>
          <p>
            There are no papers for {topic} today. Check back later or choose a
            different topic.
          </p>
        </div>
      )}

      {papers.map((paper) => (
        <article key={paper.id} className="paper">
          <p className="label">{paper.publishedDate ?? "Date not available"}</p>
          <h2>{paper.title}</h2>
          <p>{paper.summary ?? "No description available."}</p>
          {paper.url ? (
            <a href={paper.url} target="_blank" rel="noreferrer">Read original paper →</a>
          ) : (
            <span className="muted">Link not available</span>
          )}
        </article>
      ))}
    </>
  );
}
