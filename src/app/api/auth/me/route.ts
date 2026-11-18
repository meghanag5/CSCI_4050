import { getUserDoc, toPublic } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUserDoc();
  return Response.json({ user: user ? toPublic(user) : null, favorites: user?.favorites ?? [] });
}
