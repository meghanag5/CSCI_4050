import { readJson, startSession, toPublic, users, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = email ? await (await users()).findOne({ email }) : null;

  // Same message for a wrong email and a wrong password, so the form can't be used to find accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "Wrong email or password." }, { status: 401 });
  }

  await startSession(user._id);
  return Response.json({ user: toPublic(user) });
}
