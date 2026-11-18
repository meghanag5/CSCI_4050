import { getUserDoc, unauthorized } from "@/lib/auth";
import { buildSections, renderEmail } from "@/lib/digest";

export const runtime = "nodejs";

/** Shows the logged-in user's next digest as a web page. Nothing is sent and nothing is marked as sent. */
export async function GET() {
  const user = await getUserDoc();
  if (!user) return unauthorized();

  if (!user.digest.topics.length && !user.digest.boardIds.length) {
    return new Response("<p style='font-family:sans-serif;padding:24px'>Pick at least one topic or board in your digest settings, save, then preview again.</p>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const sections = await buildSections(user);
  const { html, subject } = sections.length
    ? renderEmail(user.name, sections)
    : { html: "<p style='font-family:sans-serif;padding:24px'>No new papers since your last digest.</p>", subject: "" };

  const header = `<div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:10px 16px;font-size:13px">
    Email preview. To: ${user.email.replace(/[<>&"]/g, "")} &nbsp;·&nbsp; Subject: ${subject.replace(/[<>&"]/g, "")}</div>`;

  return new Response(header + html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
