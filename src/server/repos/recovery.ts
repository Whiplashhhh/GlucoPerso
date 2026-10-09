import "server-only";
import { db } from "@/lib/db";
import { generateCode, hashCode } from "@/lib/security/codes";

export const RECOVERY_CODE_COUNT = 8;

/** Replaces the user's recovery codes. Plain codes are returned once, never stored. */
export async function createRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateCode());
  await db.$transaction([
    db.recoveryCode.deleteMany({ where: { userId } }),
    db.recoveryCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashCode(code) })),
    }),
  ]);
  return codes;
}

/** Marks a matching unused code as used. Returns false when none matches. */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const result = await db.recoveryCode.updateMany({
    where: { userId, codeHash: hashCode(code), usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}

export async function remainingRecoveryCodes(userId: string): Promise<number> {
  return db.recoveryCode.count({ where: { userId, usedAt: null } });
}
