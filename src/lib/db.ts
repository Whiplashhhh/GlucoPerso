import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma validation errors print the whole call, arguments included (meal
 * names, notes, glucose values…), whatever `errorFormat` says, and Next.js
 * logs uncaught errors. Replace them with a message naming only the call.
 */
function withoutArguments(error: unknown, model: string | undefined, operation: string): unknown {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new Prisma.PrismaClientValidationError(
      `Invalid prisma.${model ?? ""}${model ? "." : ""}${operation}() call (arguments hidden).`,
      { clientVersion: error.clientVersion },
    );
  }
  return error;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  // No query logging: queries carry health data.
  return new PrismaClient({ adapter, errorFormat: "minimal" }).$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          throw withoutArguments(error, model, operation);
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
