const EMAIL = /[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/g;
const MAX_LENGTH = 300;

/**
 * Makes a log message safe to print: email addresses are masked and the text
 * is cut short. Callers must never pass meal data or extra arguments here.
 */
export function redactLogMessage(message: string): string {
  const masked = message.replace(EMAIL, "[email]");
  return masked.length > MAX_LENGTH ? `${masked.slice(0, MAX_LENGTH)}…` : masked;
}
