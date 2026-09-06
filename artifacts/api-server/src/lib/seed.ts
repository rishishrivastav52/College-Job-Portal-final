import { eq } from "drizzle-orm";
import { db, jobsTable, usersTable } from "@workspace/db";
import { hashPassword } from "./auth";

export async function seedDemoData() {
  const [student] = await db
    .insert(usersTable)
    .values({
      email: "maya@campushire.demo",
      passwordHash: hashPassword("campus123"),
      role: "student",
      name: "Maya Rodriguez",
    })
    .onConflictDoNothing({ target: usersTable.email })
    .returning();
  const [company] = await db
    .insert(usersTable)
    .values({
      email: "hello@northstar.demo",
      passwordHash: hashPassword("campus123"),
      role: "company",
      name: "Northstar Labs",
    })
    .onConflictDoNothing({ target: usersTable.email })
    .returning();
  const [companyUser] = company
    ? [company]
    : await db.select().from(usersTable).where(eq(usersTable.email, "hello@northstar.demo")).limit(1);
  if (!companyUser) return;
  const existingJobs = await db.select({ id: jobsTable.id }).from(jobsTable).where(eq(jobsTable.companyId, companyUser.id)).limit(1);
  if (existingJobs[0]) return;
  await db.insert(jobsTable).values([
    {
      companyId: companyUser.id,
      title: "Product Design Intern",
      description: "Work with a small product team to turn complex workflows into simple, thoughtful experiences used by thousands of students.",
      requirements: ["Figma or equivalent", "Curiosity about users", "Strong written communication"],
      location: "Remote · United States",
      type: "Internship",
      salary: "$24–28 / hour",
    },
    {
      companyId: companyUser.id,
      title: "Frontend Engineer Intern",
      description: "Ship accessible, performant interfaces alongside senior engineers while learning how a modern product team works.",
      requirements: ["React fundamentals", "TypeScript basics", "Interest in craft"],
      location: "Austin, TX · Hybrid",
      type: "Internship",
      salary: "$28–32 / hour",
    },
  ]);
  if (student) {
    await db.select().from(usersTable).where(eq(usersTable.id, student.id)).limit(1);
  }
}