import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prismaClient__: PrismaClient | undefined;
}

const PRISMA_TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 12_000,
} as const;

export const prisma =
  globalThis.__prismaClient__ ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? "",
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    transactionOptions: PRISMA_TRANSACTION_OPTIONS,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient__ = prisma;
}
