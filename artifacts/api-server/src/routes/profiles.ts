import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { GetMyProfileResponse, SaveMyProfileBody, SaveMyProfileResponse } from "@workspace/api-zod";
import { db, profilesTable, usersTable } from "@workspace/db";
import { getSessionUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/profiles/me", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in to view your profile" });
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1);
  if (profile) {
    return res.json(GetMyProfileResponse.parse(profile));
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const emptyProfile = {
    id: 0,
    userId,
    name: user?.name ?? "",
    headline: "",
    school: "",
    graduationYear: null,
    skills: [],
    bio: "",
    resumeUrl: null,
  };
  return res.json(GetMyProfileResponse.parse(emptyProfile));
});

router.put("/profiles/me", async (req, res) => {
  const userId = getSessionUserId(req);
  const parsed = SaveMyProfileBody.safeParse(req.body);
  if (!userId) return res.status(401).json({ error: "Sign in to save your profile" });
  if (!parsed.success) return res.status(400).json({ error: "Invalid profile details" });
  const existing = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1);
  const [profile] = existing[0]
    ? await db.update(profilesTable).set(parsed.data).where(eq(profilesTable.userId, userId)).returning()
    : await db.insert(profilesTable).values({ ...parsed.data, userId }).returning();
  await db.update(usersTable).set({ name: parsed.data.name }).where(eq(usersTable.id, userId));
  return res.json(SaveMyProfileResponse.parse(profile));
});

export default router;