import nodemailer from "nodemailer";
import { fetchResearch } from "./research";
import { users, type UserDoc } from "./auth";

const PER_SECTION = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

type DigestPaper = {
  _id: string;
  title: string;
  url?: string;
  authors?: string[];
  publishedDate?: string;
  abstract?: string;
};

type Section = { heading: string; papers: DigestPaper[] };

function transport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD are missing from .env.local.");
  }
  return { mailer: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }), from: user };
}

/** Is this user due for a digest right now? */
export function isDue(user: UserDoc, now = new Date()) {
  const { enabled, frequency, lastSentAt } = user.digest;
  if (!enabled || (!user.digest.topics.length && !user.digest.boardIds.length)) return false;
  if (!lastSentAt) return true;
  const gap = frequency === "daily" ? DAY_MS : 7 * DAY_MS;
  // Small slack so a once-a-day job doesn't skip a day by a few minutes.
  return now.getTime() - new Date(lastSentAt).getTime() >= gap - 60 * 60 * 1000;
}

/** The newest papers from each followed topic and board that this user hasn't been emailed yet. */
export async function buildSections(user: UserDoc): Promise<Section[]> {
  const days = user.digest.frequency === "daily" ? "7" : "30";
  const alreadySent = new Set(user.sentPaperIds);
  const seenThisEmail = new Set<string>();

  const sources = [
    ...user.digest.topics.map((topic) => ({ heading: topic, topic, q: "" })),
    ...user.boards
      .filter((board) => user.digest.boardIds.includes(board.id))
      .map((board) => ({ heading: `${board.name} (${board.topic})`, topic: board.topic, q: board.query })),
  ];

  const sections: Section[] = [];
  for (const source of sources) {
    const { papers } = await fetchResearch(new URLSearchParams({ topic: source.topic, days, q: source.q }));
    const fresh = (papers as unknown as DigestPaper[])
      .filter((paper) => !alreadySent.has(paper._id) && !seenThisEmail.has(paper._id))
      .slice(0, PER_SECTION);
    fresh.forEach((paper) => seenThisEmail.add(paper._id));
    if (fresh.length) sections.push({ heading: source.heading, papers: fresh });
  }
  return sections;
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const shorten = (text = "", max = 280) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

export function renderEmail(name: string, sections: Section[]) {
  const blocks = sections
    .map(
      (section) => `
      <h2 style="font-family:Georgia,serif;color:#000;border-bottom:3px solid #000;padding-bottom:6px;margin:28px 0 12px">${escape(section.heading)}</h2>
      ${section.papers
        .map(
          (paper) => `
        <div style="border-left:5px solid #ba0c2f;padding:10px 14px;margin-bottom:14px;background:#fff">
          <div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#ba0c2f">${escape(paper.publishedDate || "")}</div>
          <div style="font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#000;margin:4px 0">${escape(paper.title)}</div>
          ${paper.authors?.length ? `<div style="font-size:13px;color:#6b6b6b">${escape(paper.authors.slice(0, 3).join(", "))}${paper.authors.length > 3 ? " et al." : ""}</div>` : ""}
          ${paper.abstract ? `<p style="font-size:14px;color:#2b2b2b;margin:8px 0">${escape(shorten(paper.abstract))}</p>` : ""}
          ${paper.url ? `<a href="${escape(paper.url)}" style="color:#ba0c2f;font-weight:bold">Read original paper →</a>` : ""}
        </div>`
        )
        .join("")}`
    )
    .join("");

  const count = sections.reduce((sum, section) => sum + section.papers.length, 0);
  const html = `
  <div style="background:#f6f4f1;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:640px;margin:0 auto">
      <div style="background:#ba0c2f;border-bottom:4px solid #000;padding:16px;font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#fff">Research Daily</div>
      <p style="margin:20px 0 0">Hi ${escape(name)}, here are ${count} new papers from the subjects you follow.</p>
      ${blocks}
      <p style="font-size:12px;color:#6b6b6b;margin-top:28px">You get this because you turned on the Research Daily digest. Change it any time on your profile page.</p>
    </div>
  </div>`;

  return { html, count, subject: `Research Daily: ${count} new paper${count === 1 ? "" : "s"}` };
}

/** Build and send one user's digest. Returns how many papers were sent (0 means nothing new, no email). */
export async function sendDigest(user: UserDoc) {
  const sections = await buildSections(user);
  if (!sections.length) return 0;

  const { html, count, subject } = renderEmail(user.name, sections);
  const { mailer, from } = transport();
  await mailer.sendMail({ from: `Research Daily <${from}>`, to: user.email, subject, html });

  const sentIds = sections.flatMap((section) => section.papers.map((paper) => paper._id));
  await (await users()).updateOne(
    { _id: user._id },
    {
      $set: { "digest.lastSentAt": new Date() },
      // ponytail: keeps the last 2,000 sent ids per user; move to its own collection if users follow many boards.
      $push: { sentPaperIds: { $each: sentIds, $slice: -2000 } },
    }
  );
  return count;
}

/** Send to every user who is due. Used by the scheduled job. */
export async function sendAllDue() {
  const due = (await (await users()).find({ "digest.enabled": true }).toArray()).filter((user) => isDue(user));
  const results = [];
  for (const user of due) {
    try {
      results.push({ email: user.email, sent: await sendDigest(user) });
    } catch (error) {
      results.push({ email: user.email, error: error instanceof Error ? error.message : "failed" });
    }
  }
  return results;
}
