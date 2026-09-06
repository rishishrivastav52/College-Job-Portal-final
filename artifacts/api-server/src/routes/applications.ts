import { Router, type IRouter } from "express";
import multer from "multer";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  CreateApplicationResponse,
  ListJobApplicantsParams,
  ListJobApplicantsResponse,
  ListMyApplicationsResponse,
  UpdateApplicationStatusBody,
  UpdateApplicationStatusParams,
  UpdateApplicationStatusResponse,
} from "@workspace/api-zod";
import { db, applicationsTable, jobsTable, usersTable } from "@workspace/db";
import { put } from "@vercel/blob";
import { getSessionUserId } from "../lib/auth";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf"),
});
const companyUsers = alias(usersTable, "application_company_users");
const studentUsers = alias(usersTable, "application_student_users");

async function shapeApplication(applicationId: number) {
  const [row] = await db
    .select({
      application: applicationsTable,
      jobTitle: jobsTable.title,
      companyName: companyUsers.name,
      studentName: studentUsers.name,
      studentEmail: studentUsers.email,
    })
    .from(applicationsTable)
    .innerJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .innerJoin(companyUsers, eq(jobsTable.companyId, companyUsers.id))
    .innerJoin(studentUsers, eq(applicationsTable.studentId, studentUsers.id))
    .where(eq(applicationsTable.id, applicationId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.application.id,
    jobId: row.application.jobId,
    jobTitle: row.jobTitle,
    companyName: row.companyName,
    studentId: row.application.studentId,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    resumeUrl: row.application.resumeUrl,
    status: row.application.status,
    appliedAt: row.application.createdAt.toISOString(),
  };
}

router.get("/applications", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in to view applications" });
  const applications = await db.select({ id: applicationsTable.id }).from(applicationsTable)
    .where(eq(applicationsTable.studentId, userId)).orderBy(desc(applicationsTable.createdAt));
  const shaped = (await Promise.all(applications.map((item) => shapeApplication(item.id)))).filter(Boolean);
  return res.json(ListMyApplicationsResponse.parse(shaped));
});

router.post("/applications", upload.single("resume"), async (req, res) => {
  const userId = getSessionUserId(req);
  const jobId = Number(req.body.jobId);
  if (!userId) return res.status(401).json({ error: "Sign in to apply" });
  if (!Number.isInteger(jobId) || !req.file || req.file.mimetype !== "application/pdf") {
    return res.status(400).json({ error: "A PDF resume is required" });
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const existing = await db.select().from(applicationsTable)
    .where(and(eq(applicationsTable.jobId, jobId), eq(applicationsTable.studentId, userId))).limit(1);
  if (existing[0]) return res.status(409).json({ error: "You already applied to this role" });

  let resumeUrl: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`resumes/${userId}/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
      access: "public",
      contentType: "application/pdf",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    resumeUrl = blob.url;
  }
  const [application] = await db.insert(applicationsTable).values({
    jobId,
    studentId: userId,
    resumeUrl,
  }).returning();
  const shaped = await shapeApplication(application.id);
  return res.status(201).json(CreateApplicationResponse.parse(shaped));
});

router.get("/company/jobs/:jobId/applicants", async (req, res) => {
  const userId = getSessionUserId(req);
  const params = ListJobApplicantsParams.safeParse(req.params);
  if (!userId) return res.status(401).json({ error: "Sign in as a company to view applicants" });
  if (!params.success) return res.status(400).json({ error: "Invalid job id" });
  const [job] = await db.select().from(jobsTable).where(and(eq(jobsTable.id, params.data.jobId), eq(jobsTable.companyId, userId))).limit(1);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const applications = await db.select({ id: applicationsTable.id }).from(applicationsTable)
    .where(eq(applicationsTable.jobId, job.id)).orderBy(desc(applicationsTable.createdAt));
  const shaped = (await Promise.all(applications.map((item) => shapeApplication(item.id)))).filter(Boolean);
  return res.json(ListJobApplicantsResponse.parse(shaped));
});

router.patch("/applications/:applicationId/status", async (req, res) => {
  const userId = getSessionUserId(req);
  const params = UpdateApplicationStatusParams.safeParse(req.params);
  const body = UpdateApplicationStatusBody.safeParse(req.body);
  if (!userId) return res.status(401).json({ error: "Sign in as a company to update applicants" });
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid status update" });
  const [application] = await db.select({ application: applicationsTable, job: jobsTable })
    .from(applicationsTable).innerJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(and(eq(applicationsTable.id, params.data.applicationId), eq(jobsTable.companyId, userId))).limit(1);
  if (!application) return res.status(404).json({ error: "Application not found" });
  await db.update(applicationsTable).set({ status: body.data.status }).where(eq(applicationsTable.id, params.data.applicationId));
  const shaped = await shapeApplication(params.data.applicationId);
  return res.json(UpdateApplicationStatusResponse.parse(shaped));
});

export default router;