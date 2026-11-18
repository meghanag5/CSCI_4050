import { getUserDoc, readJson, unauthorized, users } from "@/lib/auth";
import { TOPICS } from "@/lib/papers";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUserDoc();
  if (!user) return unauthorized();
  return Response.json({ digest: user.digest });
}

export async function PUT(request: Request) {
  const user = await getUserDoc();
  if (!user) return unauthorized();

  const body = await readJson(request);
  const frequency: "daily" | "weekly" = body?.frequency === "daily" ? "daily" : "weekly";
  const topicNames = new Set(TOPICS.map((topic) => topic.name));
  const boardIds = new Set(user.boards.map((board) => board.id));

  const digest = {
    ...user.digest,
    enabled: body?.enabled === true,
    frequency,
    topics: Array.isArray(body?.topics) ? body.topics.filter((t): t is string => typeof t === "string" && topicNames.has(t)) : [],
    boardIds: Array.isArray(body?.boardIds) ? body.boardIds.filter((b): b is string => typeof b === "string" && boardIds.has(b)) : [],
  };

  if (digest.enabled && !digest.topics.length && !digest.boardIds.length) {
    return Response.json({ error: "Pick at least one topic or board for your digest." }, { status: 400 });
  }

  await (await users()).updateOne({ _id: user._id }, { $set: { digest } });
  return Response.json({ digest });
}
