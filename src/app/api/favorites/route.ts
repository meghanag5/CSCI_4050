import { ObjectId } from "mongodb";
import { getUserDoc, readJson, unauthorized, users } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

/** The logged-in user's favorited papers, newest favorite first. */
export async function GET() {
  const user = await getUserDoc();
  if (!user) return unauthorized();

  const ids = user.favorites.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const papers = await (await getDatabase()).collection("papers").find({ _id: { $in: ids } }).toArray();
  const byId = new Map(papers.map((paper) => [paper._id.toString(), paper]));

  return Response.json({
    papers: [...user.favorites]
      .reverse()
      .filter((id) => byId.has(id))
      .map((id) => ({ ...byId.get(id), _id: id })),
  });
}

async function paperIdFrom(request: Request) {
  const body = await readJson(request);
  const id = typeof body?.paperId === "string" ? body.paperId : "";
  if (!ObjectId.isValid(id)) return null;
  const exists = await (await getDatabase()).collection("papers").countDocuments({ _id: new ObjectId(id) }, { limit: 1 });
  return exists ? id : null;
}

export async function POST(request: Request) {
  const user = await getUserDoc();
  if (!user) return unauthorized();
  const paperId = await paperIdFrom(request);
  if (!paperId) return Response.json({ error: "That paper doesn't exist." }, { status: 404 });

  await (await users()).updateOne({ _id: user._id }, { $addToSet: { favorites: paperId } });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getUserDoc();
  if (!user) return unauthorized();
  const body = await readJson(request);
  const paperId = typeof body?.paperId === "string" ? body.paperId : "";

  await (await users()).updateOne({ _id: user._id }, { $pull: { favorites: paperId } });
  return Response.json({ ok: true });
}
