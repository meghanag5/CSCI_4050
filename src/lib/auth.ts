import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ObjectId } from "mongodb";
import { getDatabase } from "./mongodb";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

export const SESSION_COOKIE = "rd_session";
const SESSION_DAYS = 30;

export type Board = {
  id: string;
  name: string;
  topic: string;
  query: string;
};

export type DigestSettings = {
  enabled: boolean;
  frequency: "daily" | "weekly";
  topics: string[]; // built-in topic names
  boardIds: string[];
  lastSentAt: Date | null;
};

export type UserDoc = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  favorites: string[]; // paper _id strings
  boards: Board[];
  digest: DigestSettings;
  sentPaperIds: string[]; // papers already emailed, so digests never repeat
  createdAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

export async function users() {
  const db = await getDatabase();
  const collection = db.collection<UserDoc>("users");
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

async function sessions() {
  const db = await getDatabase();
  const collection = db.collection<{
    _id: string; // sha256 of the cookie token, so a database leak can't be replayed
    userId: ObjectId;
    expiresAt: Date;
  }>("sessions");
  // MongoDB deletes expired sessions on its own.
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return collection;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function startSession(userId: ObjectId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await (await sessions()).insertOne({ _id: hashToken(token), userId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await (await sessions()).deleteOne({ _id: hashToken(token) });
  jar.delete(SESSION_COOKIE);
}

/** The logged-in user's full record, or null. */
export async function getUserDoc(): Promise<UserDoc | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await (await sessions()).findOne({
    _id: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  return (await users()).findOne({ _id: session.userId });
}

export function toPublic(user: UserDoc): PublicUser {
  return { id: user._id.toString(), email: user.email, name: user.name };
}

export function newUser(email: string, name: string, passwordHash: string): Omit<UserDoc, "_id"> {
  return {
    email,
    name,
    passwordHash,
    favorites: [],
    boards: [],
    digest: { enabled: false, frequency: "weekly", topics: [], boardIds: [], lastSentAt: null },
    sentPaperIds: [],
    createdAt: new Date(),
  };
}

export const unauthorized = () =>
  Response.json({ error: "Log in to do that." }, { status: 401 });

export async function readJson(request: Request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
