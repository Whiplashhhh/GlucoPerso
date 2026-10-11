/** Runs once when a Next.js server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Meal reminders (Web Push), checked every minute by the server itself.
  const { startReminderLoop } = await import("@/server/push/reminders");
  startReminderLoop();
}
