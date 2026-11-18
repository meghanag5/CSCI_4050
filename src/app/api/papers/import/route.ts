import {
  fetchResearch,
  researchErrorResponse,
} from "../../../../lib/research";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "Authentication is required before deploying imports." },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await request.json();

    if (typeof body?.topic !== "string") {
      throw new Error("Missing topic");
    }
  } catch {
    return Response.json(
      { error: "Send valid JSON containing a topic." },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    topic: body.topic,
    days: String(body.days ?? 90),
  });

  if (typeof body.cursor === "string") {
    params.set("cursor", body.cursor);
  }

  if (typeof body.q === "string") {
    params.set("q", body.q);
  }

  try {
    return Response.json(await fetchResearch(params));
  } catch (error) {
    return researchErrorResponse(error);
  }
}