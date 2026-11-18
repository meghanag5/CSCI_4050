import { randomUUID } from "node:crypto";
import { getUserDoc, readJson, unauthorized, users } from "@/lib/auth";
import { TOPICS } from "@/lib/papers";

export const runtime = "nodejs";

const MAX_BOARDS = 20;

export async function GET() {
  const user = await getUserDoc();
  if (!user) return unauthorized();
  return Response.json({ boards: user.boards });
}

/** A board is a saved search: one of the built-in topics narrowed by the user's own keywords. */
export async function POST(request: Request) {
  const user = await getUserDoc();
  if (!user) return unauthorized();

  const body = await readJson(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const topic = typeof body?.topic === "string" ? body.topic : "";
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!name || name.length > 60) {
    return Response.json({ error: "Give the board a name (60 characters or fewer)." }, { status: 400 });
  }
  if (!TOPICS.some((item) => item.name === topic)) {
    return Response.json({ error: "Choose a supported topic." }, { status: 400 });
  }
  if (!query || query.length > 200) {
    return Response.json({ error: "Enter keywords for the board (200 characters or fewer)." }, { status: 400 });
  }
  if (user.boards.length >= MAX_BOARDS) {
    return Response.json({ error: `You can have up to ${MAX_BOARDS} boards.` }, { status: 400 });
  }

  const board = { id: randomUUID(), name, topic, query };
  await (await users()).updateOne({ _id: user._id }, { $push: { boards: board } });
  return Response.json({ board }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getUserDoc();
  if (!user) return unauthorized();
  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";

  // Removing a board also removes it from the email digest.
  await (await users()).updateOne(
    { _id: user._id },
    { $pull: { boards: { id }, "digest.boardIds": id } }
  );
  return Response.json({ ok: true });
}
