import app from "../artifacts/api-server/src/app";
import { seedDemoData } from "../artifacts/api-server/src/lib/seed";

type ServerlessRequest = {
  headers: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
};

type ServerlessResponse = {
  headersSent: boolean;
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => unknown;
};

type NextFunction = (error?: unknown) => void;

let seedPromise: Promise<void> | undefined;
const expressHandler = app as unknown as (
  req: ServerlessRequest,
  res: ServerlessResponse,
  next: NextFunction,
) => void;

function ensureSeeded() {
  seedPromise ??= seedDemoData();
  return seedPromise;
}


export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse,
) {
  try {
    await ensureSeeded();
    return expressHandler(req, res, (error?: unknown) => {
      if (error && !res.headersSent) {
        res.status(500).json({ error: "API request failed" });
      }
    });
  } catch (error) {
    console.error("API initialization failed", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "API initialization failed" });
    }
  }
}