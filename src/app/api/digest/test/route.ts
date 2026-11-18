import { getUserDoc, unauthorized } from "@/lib/auth";
import { sendDigest } from "@/lib/digest";

export const runtime = "nodejs";

/** "Send me one now": emails the logged-in user their digest right away. */
export async function POST() {
  const user = await getUserDoc();
  if (!user) return unauthorized();
  if (!user.digest.topics.length && !user.digest.boardIds.length) {
    return Response.json({ error: "Save at least one topic or board for your digest first." }, { status: 400 });
  }

  try {
    const sent = await sendDigest(user);
    return Response.json({
      sent,
      message: sent ? `Sent ${sent} papers to ${user.email}.` : "No new papers since your last digest.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not send the email." },
      { status: 500 }
    );
  }
}
