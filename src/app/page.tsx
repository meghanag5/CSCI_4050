import Link from "next/link";
import { TOPICS } from "@/lib/papers";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <p className="label">Research, made readable</p>
        <h1>A daily newspaper for research papers.</h1>
        <p>
          Research Daily collects new papers on the subject you care about and
          gives you a short description of each one, with a link to the
          original. Stay current in a few minutes a day.
        </p>
        <a href="#topics" className="button button-light">Choose a topic</a>
      </section>

      <section>
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-number">1</span>
            <h3>Choose a topic</h3>
            <p>Pick the subject you want to follow from the list below.</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <h3>Read today&apos;s feed</h3>
            <p>Each paper shows its title, date, and a short description.</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <h3>Open the original</h3>
            <p>Follow the link to read the full paper, or refresh for more.</p>
          </div>
        </div>
      </section>

      <section id="topics">
        <h2>Choose a topic</h2>
        <div className="topics">
          {TOPICS.map((topic) => (
            <Link
              key={topic.name}
              href={`/feed/${encodeURIComponent(topic.name)}`}
              className="topic"
            >
              <h3>{topic.name}</h3>
              <p>{topic.description}</p>
              <span className="topic-link">Read today&apos;s feed →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
