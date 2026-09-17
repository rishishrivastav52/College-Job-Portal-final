import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  LogInBody,
  LogInResponse,
  SignUpBody,
  SignUpResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getSessionUserId,
  hashPassword,
  setSession,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

function toUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, email: user.email, role: user.role, name: user.name };
}

router.post("/auth/signup", async (req, res) => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid signup details" });
  const input = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, input.email.toLowerCase())).limit(1);
  if (existing[0]) return res.status(409).json({ error: "An account with this email already exists" });
  const [user] = await db.insert(usersTable).values({
    email: input.email.toLowerCase(),
    passwordHash: hashPassword(input.password),
    role: input.role,
    name: input.name,
  }).returning();
  const sessionToken = setSession(res, user.id, req.headers["x-forwarded-proto"] as string | undefined);
  return res.status(201).json(SignUpResponse.parse({ user: toUser(user), sessionToken }));
});

router.post("/auth/login", async (req, res) => {
  const parsed = LogInBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login details" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.toLowerCase())).limit(1);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }
  const sessionToken = setSession(res, user.id, req.headers["x-forwarded-proto"] as string | undefined);
  return res.json(LogInResponse.parse({ user: toUser(user), sessionToken }));
});

router.get("/auth/me", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ error: "Not signed in" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  return res.json({ user: toUser(user) });
});

router.post("/auth/logout", (_req, res) => {
  clearSession(res);
  return res.status(204).send();
});

export default router;