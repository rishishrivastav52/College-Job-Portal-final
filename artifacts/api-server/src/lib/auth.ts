import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

const SESSION_COOKIE = "campushire_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "campushire-development-secret";

export type SessionUser = {
  id: number;
  email: string;
  role: "student" | "company";
  name: string;
};

function sign(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function setSession(res: Response, userId: number, forwardedProto?: string) {
  const value = `${userId}.${sign(String(userId))}`;
  const secure = process.env.NODE_ENV === "production" || forwardedProto === "https" || Boolean(process.env.REPLIT_DEV_DOMAIN);
  res.cookie(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "none",
    secure,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE);
}

export function getSessionUserId(req: Request) {
  const value = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature || signature !== sign(id)) return null;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}