import { MongoServerError } from "mongodb";
import { hashPassword, newUser, readJson, startSession, toPublic, users } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!name || name.length > 80) {
    return Response.json({ error: "Enter your name (80 characters or fewer)." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const doc = newUser(email, name, await hashPassword(password));
    const { insertedId } = await (await users()).insertOne(doc as never);
    await startSession(insertedId);
    return Response.json({ user: toPublic({ ...doc, _id: insertedId }) }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return Response.json({ error: "Could not create the account." }, { status: 500 });
  }
}
