/**
 * Creates a single-use invite code and prints it once.
 *   npm run invite -- [--days 7] [--note "Pour Léa"]
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "@/lib/db";
import { createInvite } from "@/server/repos/invites";

const { values } = parseArgs({
  options: { days: { type: "string", default: "7" }, note: { type: "string" } },
});

const days = Number(values.days);
const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : undefined;
const code = await createInvite({ note: values.note, expiresAt });

console.log("\n  Code d'invitation (à usage unique) :\n");
console.log(`      ${code}\n`);
console.log(
  expiresAt ? `  Valable jusqu'au ${expiresAt.toLocaleString("fr-FR")}.\n` : "  Sans expiration.\n",
);
await db.$disconnect();
