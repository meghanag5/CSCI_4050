import { getDatabase } from "./mongodb";
import { TOPICS } from "./papers";
import { createHash } from "node:crypto";

export class ResearchError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

type Work = {
  id: string;
  title?: string | null;
  doi?: string | null;
  publication_date?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: {
    landing_page_url?: string | null;
  } | null;
  authorships?: {
    author: { display_name: string };
  }[];
  primary_topic?: {
    display_name: string;
    subfield?: { display_name: string };
  } | null;
};

function getAbstract(index: Work["abstract_inverted_index"]) {
  if (!index) return "";

  return Object.entries(index)
    .flatMap(([word, positions]) =>
      positions.map((position) => ({ word, position }))
    )
    .sort((a, b) => a.position - b.position)
    .map(({ word }) => word)
    .join(" ");
}

export async function fetchResearch(params: URLSearchParams) {
  const topic = params.get("topic") ?? "";
  const config = TOPICS.find((item) => item.name === topic);

  if (!config) {
    throw new ResearchError("Choose a supported topic.", 400);
  }

  const days = params.get("days") ?? "90";
  if (!["7", "30", "90", "365"].includes(days)) {
    throw new ResearchError("Choose a valid date range.", 400);
  }

  const query = (params.get("q") ?? "").trim();
  if (query.length > 200) {
    throw new ResearchError("Search must be 200 characters or fewer.", 400);
  }

  const apiKey = process.env.OPENALEX_API_KEY;
  if (!apiKey) {
    throw new ResearchError("OPENALEX_API_KEY is missing.", 500);
  }

  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - Number(days));

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set(
    "filter",
    [
      config.filter,
      "type:article|preprint",
      "is_retracted:false",
      `from_publication_date:${since.toISOString().slice(0, 10)}`,
      `to_publication_date:${until.toISOString().slice(0, 10)}`,
    ].join(",")
  );
  url.searchParams.set("sort", "publication_date:desc");
  url.searchParams.set("per_page", "25");
  url.searchParams.set("cursor", params.get("cursor") || "*");

  if (query) {
    url.searchParams.set("search", query);
  }

const db = await getDatabase();

const cache = db.collection<{
  _id: string;
  expiresAt: Date;
  result: {
    papers: Record<string, unknown>[];
    total: number;
    nextCursor: string | null;
  };
}>("research_cache");


// MongoDB automatically cleans up expired cache entries.
await cache.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// The URL includes the subject, search, dates, and page cursor.
const cacheKey = createHash("sha256")
  .update(`research-v1:${url.toString()}`)
  .digest("hex");

const cached = await cache.findOne({
  _id: cacheKey,
  expiresAt: { $gt: new Date() },
});

if (cached) {
  return {
    ...cached.result,
    cached: true,
  };
}
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new ResearchError(
      response.status === 429
        ? "OpenAlex usage limit reached. Wait before retrying."
        : `OpenAlex returned status ${response.status}.`,
      response.status === 429 ? 429 : 502
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.results)) {
    throw new ResearchError("OpenAlex returned an unexpected response.");
  }

  const collection = db.collection("papers");

  // Only OpenAlex records receive this uniqueness rule.
  await collection.createIndex(
    { sourceId: 1, topic: 1 },
    {
      unique: true,
      partialFilterExpression: { sourceId: { $type: "string" } },
    }
  );

  const papers = [];

  for (const work of data.results as Work[]) {
    if (!work.id || !work.title?.trim()) continue;

    const record = await collection.findOneAndUpdate(
      { sourceId: work.id, topic },
      {
        $set: {
          source: "OpenAlex",
          title: work.title.trim(),
          url:
            work.doi ||
            work.primary_location?.landing_page_url ||
            work.id,
          authors:
            work.authorships?.map(
              (entry) => entry.author.display_name
            ) ?? [],
          publishedDate: work.publication_date ?? null,
          abstract: getAbstract(work.abstract_inverted_index),
          subtopic: work.primary_topic?.display_name ?? "",
          subfield:
            work.primary_topic?.subfield?.display_name ?? "",
        },
        $setOnInsert: {
          sourceId: work.id,
          topic,
          summary: "",
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        includeResultMetadata: false,
      }
    );

    if (record) {
      papers.push({ ...record, _id: record._id.toString() });
    }
  }

  const result = {
  papers,
  total: data.meta?.count ?? 0,
  nextCursor:
    data.results.length > 0
      ? data.meta?.next_cursor ?? null
      : null,
};

await cache.updateOne(
  { _id: cacheKey },
  {
    $set: {
      result,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  { upsert: true }
);

return {
  ...result,
  cached: false,
};
  
}

export function researchErrorResponse(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ResearchError
          ? error.message
          : "Could not load research. Please try again.",
    },
    {
      status: error instanceof ResearchError ? error.status : 500,
    }
  );
}