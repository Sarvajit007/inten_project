import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { files, InsertFile, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "passwordHash", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function createLocalUser(input: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(users).values({
    ...input,
    loginMethod: "email-password",
    role: "user",
    lastSignedIn: new Date(),
  });
  return getUserByOpenId(input.openId);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createFile(file: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(files).values(file);
  return getFileById(file.id, file.ownerId);
}

export async function getFileById(id: string, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), eq(files.ownerId, ownerId)))
    .limit(1);
  return result[0];
}

export async function getUserFiles(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(files)
    .where(and(eq(files.ownerId, ownerId), eq(files.status, "complete")));
}

export async function completeFile(id: string, ownerId: number, details: Pick<InsertFile, "fileName" | "size" | "mimeType" | "storageKey">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(files)
    .set({ ...details, status: "complete", uploadedAt: new Date() })
    .where(and(eq(files.id, id), eq(files.ownerId, ownerId), eq(files.status, "pending")));
  return getFileById(id, ownerId);
}

export async function softDeleteFile(id: string, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(files)
    .set({ status: "deleted", deletedAt: new Date() })
    .where(and(eq(files.id, id), eq(files.ownerId, ownerId), eq(files.status, "complete")));
}
