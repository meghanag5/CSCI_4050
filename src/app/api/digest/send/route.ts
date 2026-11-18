import { timingSafeEqual } from "node:crypto";
import { sendAllDue } from "@/lib/digest";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Scheduled job: emails every user whose digest is due.
 * Call once a day with the header  Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron sends that header automatically; see vercel.json).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return Response.json({ error: "Not allowed." }, { status: 401 });
  }

  return Response.json({ results: await sendAllDue() });
}
