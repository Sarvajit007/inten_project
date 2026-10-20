import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createFile, createLocalUser, completeFile, getFileById, getUserByEmail, getUserFiles, softDeleteFile, upsertUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePresignPut } from "./storage";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

function publicUser(user: { id: number; name?: string | null; email?: string | null; loginMethod?: string | null }) {
  return { id: user.id, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null };
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function startSession(res: Response & { req: Request }, openId: string, name: string) {
  const token = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(res.req), maxAge: ONE_YEAR_MS });
}

function safeFileName(input: string) {
  const normalized = input.trim().replace(/[^a-zA-Z0-9._ ()-]/g, "-").replace(/\s+/g, " ");
  return (normalized || "untitled-file").slice(0, 180);
}

function fileView(file: any) {
  return {
    id: file.id,
    fileName: file.fileName,
    size: file.size,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
  };
}

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ ok: true })),
  }),

  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),

    signup: publicProcedure
      .input(z.object({ name: z.string().trim().min(1).max(120), email: emailSchema, password: passwordSchema }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email;
        const existing = await getUserByEmail(email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists." });

        const openId = `local_${randomUUID().replace(/-/g, "")}`;
        try {
          const user = await createLocalUser({
            openId,
            name: input.name,
            email,
            passwordHash: hashPassword(input.password),
          });
          if (!user) throw new Error("User creation did not return a user");
          await startSession(ctx.res, user.openId, user.name || input.name);
          return publicUser(user);
        } catch (error: any) {
          if (String(error?.code) === "ER_DUP_ENTRY") {
            throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists." });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create your account right now." });
        }
      }),

    login: publicProcedure
      .input(z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
        }
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await startSession(ctx.res, user.openId, user.name || input.email);
        return publicUser(user);
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  files: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), sort: z.enum(["name", "date"]).default("date") }).optional())
      .query(async ({ input, ctx }) => {
        const records = await getUserFiles(ctx.user.id);
        const search = input?.search?.trim().toLowerCase() || "";
        const filtered = records
          .filter(file => !search || file.fileName.toLowerCase().includes(search) || file.mimeType.toLowerCase().includes(search))
          .sort((a, b) => input?.sort === "name"
            ? a.fileName.localeCompare(b.fileName)
            : new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        return {
          files: filtered.map(fileView),
          usedBytes: records.reduce((total, file) => total + file.size, 0),
        };
      }),

    createUpload: protectedProcedure
      .input(z.object({ fileName: z.string().min(1).max(255), size: z.number().int().positive(), mimeType: z.string().max(255) }))
      .mutation(async ({ input, ctx }) => {
        if (input.size > MAX_FILE_SIZE) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Files must be 50 MB or smaller." });
        }
        const id = randomUUID();
        const normalizedName = safeFileName(input.fileName);
        const storageKey = `users/${ctx.user.id}/${id}-${normalizedName}`;
        const uploadUrl = await storagePresignPut(storageKey);
        await createFile({
          id,
          ownerId: ctx.user.id,
          fileName: normalizedName,
          size: input.size,
          mimeType: input.mimeType || "application/octet-stream",
          storageKey,
          status: "pending",
        });
        return { fileId: id, storageKey, uploadUrl, expiresIn: 300 };
      }),

    completeUpload: protectedProcedure
      .input(z.object({ fileId: z.string().uuid(), storageKey: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const file = await getFileById(input.fileId, ctx.user.id);
        if (!file || file.status !== "pending" || file.storageKey !== input.storageKey) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Upload authorization is invalid or expired." });
        }
        const completed = await completeFile(input.fileId, ctx.user.id, {
          fileName: file.fileName,
          size: file.size,
          mimeType: file.mimeType,
          storageKey: file.storageKey,
        });
        return completed ? fileView(completed) : { id: input.fileId };
      }),

    downloadUrl: protectedProcedure
      .input(z.object({ fileId: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const file = await getFileById(input.fileId, ctx.user.id);
        if (!file || file.status !== "complete") {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
        }
        return { url: await storageGetSignedUrl(file.storageKey), fileName: file.fileName };
      }),

    delete: protectedProcedure
      .input(z.object({ fileId: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const file = await getFileById(input.fileId, ctx.user.id);
        if (!file || file.status !== "complete") {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
        }
        await softDeleteFile(input.fileId, ctx.user.id);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
