import { getDatabase } from "../../../lib/mongodb";

import {
  fetchResearch,
  researchErrorResponse,
} from "../../../lib/research";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(await fetchResearch(params));
  } catch (error) {
    return researchErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    typeof body.url !== "string"
  ) {
    return Response.json(
      { error: "A title and paper URL are required." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(body.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return Response.json(
      { error: "Provide a valid HTTP or HTTPS paper URL." },
      { status: 400 }
    );
  }

  const paper = {
    title: body.title.trim(),
    url: body.url.trim(),
    authors: Array.isArray(body.authors)
      ? body.authors.filter((author: unknown) => typeof author === "string")
      : [],
    abstract: typeof body.abstract === "string" ? body.abstract : "",
    summary: typeof body.summary === "string" ? body.summary : "",
    topic: typeof body.topic === "string" ? body.topic : "",
    createdAt: new Date(),
  };

  try {
    const db = await getDatabase();
    const result = await db.collection("papers").insertOne(paper);

    return Response.json(
      { ...paper, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: "Could not save the paper." },
      { status: 500 }
    );
  }
}