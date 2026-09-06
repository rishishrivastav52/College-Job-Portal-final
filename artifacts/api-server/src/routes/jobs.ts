import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  CreateJobBody,
  CreateJobResponse,
  GetJobParams,
  GetJobResponse,
  GetCompanyDashboardResponse,
  ListJobsQueryParams,
  ListJobsResponse,
} from "@workspace/api-zod";
import { db, applicationsTable, jobsTable, usersTable } from "@workspace/db";
import { getSessionUserId } from "../lib/auth";

const router: IRouter = Router();

async function shapeJobs(studentId?: number, filters?: { search?: string; location?: string; type?: string }) {
  const rows = await db
    .select({
      job: jobsTable,
      companyName: usersTable.name,
      applicantCount: sql<number>`count(${applicationsTable.id})`,
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(jobsTable.companyId, usersTable.id))
    .leftJoin(applicationsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(and(
      filters?.search ? or(ilike(jobsTable.title, `%${filters.search}%`), ilike(jobsTable.description, `%${filters.search}%`)) : undefined,
      filters?.location ? ilike(jobsTable.location, `%${filters.location}%`) : undefined,
      filters?.type && filters.type !== "All types" ? eq(jobsTable.type, filters.type) : undefined,
    ))
    .groupBy(jobsTable.id, usersTable.name)
    .orderBy(desc(jobsTable.createdAt));
  const appliedIds = studentId
    ? await db.select({ jobId: applicationsTable.jobId }).from(applicationsTable).where(eq(applicationsTable.studentId, studentId))
    : [];
  const applied = new Set(appliedIds.map((row) => row.jobId));
  return rows.map(({ job, companyName, applicantCount }) => ({
    id: job.id,
    companyId: job.companyId,
    companyName,
    companyInitials: companyName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    type: job.type,
    salary: job.salary,
    postedAt: job.createdAt.toISOString(),
    applicantsCount: Number(applicantCount),
    hasApplied: applied.has(job.id),
  }));
}

router.get("/jobs", async (req, res) => {
  const params = ListJobsQueryParams.safeParse(req.query);
  const studentId = getSessionUserId(req) ?? undefined;
  const jobs = await shapeJobs(studentId, params.success ? params.data : undefined);
  return res.json(ListJobsResponse.parse(jobs));
});

router.post("/jobs", async (req, res) => {
  const userId = getSessionUserId(req);
  const parsed = CreateJobBody.safeParse(req.body);
  if (!userId) return res.status(401).json({ error: "Sign in as a company to post a job" });
  if (!parsed.success) return res.status(400).json({ error: "Invalid job details" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "company") return res.status(403).json({ error: "Only company accounts can post jobs" });
  const [job] = await db.insert(jobsTable).values({ ...parsed.data, companyId: userId }).returning();
  const shaped = (await shapeJobs(undefined)).find((item) => item.id === job.id);
  return res.status(201).json(CreateJobResponse.parse(shaped));
});

router.get("/jobs/:jobId", async (req, res) => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid job id" });
  const shaped = (await shapeJobs(getSessionUserId(req) ?? undefined)).find((item) => item.id === params.data.jobId);
  if (!shaped) return res.status(404).json({ error: "Job not found" });
  return res.json(GetJobResponse.parse(shaped));
});

router.get("/company/dashboard", async (req, res) => {
  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in as a company to view this dashboard" });
  const jobs = await shapeJobs(undefined);
  const companyJobs = jobs.filter((job) => job.companyId === userId);
  const ownedJobIds = companyJobs.map((job) => job.id);
  const allApplications = ownedJobIds.length
    ? await db.select().from(applicationsTable).where(sql`${applicationsTable.jobId} in (${sql.join(ownedJobIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];
  const dashboard = {
    jobs: companyJobs,
    totalApplicants: allApplications.length,
    interviews: allApplications.filter((application) => application.status === "interview").length,
    profileViews: Math.max(24, companyJobs.length * 18),
  };
  return res.json(GetCompanyDashboardResponse.parse(dashboard));
});

export default router;