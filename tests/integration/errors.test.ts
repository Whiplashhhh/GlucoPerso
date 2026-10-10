/** Database errors end up in server logs: they must not echo health data. */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";

const SECRET = "Glycémie 0,42 après les crêpes de mamie";

describe("Prisma error messages", () => {
  it("a validation error does not repeat the query arguments", async () => {
    const error: unknown = await db.meal
      // @ts-expect-error -- deliberately invalid: required fields are missing.
      .create({ data: { name: SECRET, notes: SECRET } })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(SECRET);
    expect((error as Error).message).not.toContain("crêpes");
  });

  it("a constraint error does not repeat the query arguments", async () => {
    const error: unknown = await db.user
      .create({ data: { id: "x", name: SECRET, email: "dup@exemple.test" } })
      .then(() => db.user.create({ data: { id: "y", name: SECRET, email: "dup@exemple.test" } }))
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(SECRET);
    expect((error as Error).message).not.toContain("dup@exemple.test");
  });
});
