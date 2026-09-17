import app from "../artifacts/api-server/src/app";
import { seedDemoData } from "../artifacts/api-server/src/lib/seed";
import type { NextFunction, Request, Response } from "express";

let seedPromise: Promise<void> | undefined;
const expressHandler = app as unknown as (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

function ensureSeeded() {
  seedPromise ??= seedDemoData();
  return seedPromise;
}


export default async function handler(req: Request, res: Response) {
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