export const SAFE_PUBLIC_GENERATION_ERROR =
  "Sorry, something went wrong. The site is currently under maintenance. Please try again later.";

export const INSUFFICIENT_CREDITS_MESSAGE =
  "Insufficient credits. Please purchase more credits to continue.";

export const LOGIN_REQUIRED_MESSAGE = "Please sign in to continue.";

const SAFE_VALIDATION_MESSAGES = new Set([
  LOGIN_REQUIRED_MESSAGE,
  INSUFFICIENT_CREDITS_MESSAGE,
  "Please enter a prompt.",
  "Please upload an image.",
  "Unsupported file type.",
  "File too large.",
]);

export function isSafePublicGenerationMessage(message: unknown): message is string {
  if (typeof message !== "string") return false;
  if (SAFE_VALIDATION_MESSAGES.has(message)) return true;
  return (
    message.startsWith("Please ") ||
    message.includes(" is required") ||
    message.includes(" required") ||
    message.includes("Unsupported file type") ||
    message.includes("File too large")
  );
}

export function toSafePublicGenerationMessage(message: unknown): string {
  return isSafePublicGenerationMessage(message)
    ? message
    : SAFE_PUBLIC_GENERATION_ERROR;
}
