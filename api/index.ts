import app from "../artifacts/api-server/src/app";
import { seedDemoData } from "../artifacts/api-server/src/lib/seed";

let seedPromise: Promise<void> | undefined;

function ensureSeeded() {
  seedPromise ??= seedDemoData();
  return seedPromise;
}

export default async function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  try {
    await ensureSeeded();
    return app(req, res);
  } catch (error) {
    console.error("API initialization failed", error);
    return res.status(500).json({ error: "API initialization failed" });
  }
}