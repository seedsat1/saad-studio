export const SAFE_PUBLIC_GENERATION_ERROR =
  "Unable to complete video generation. Please check your settings or try again in a moment.";

export const INSUFFICIENT_CREDITS_MESSAGE =
  "Insufficient credits. Please purchase more credits to continue.";

export const LOGIN_REQUIRED_MESSAGE = "Please sign in to continue.";
export const VIDEO_PROVIDER_BUSY_MESSAGE =
  "The video provider is busy right now. Please try again in a few minutes.";

const SAFE_VALIDATION_MESSAGES = new Set([
  LOGIN_REQUIRED_MESSAGE,
  INSUFFICIENT_CREDITS_MESSAGE,
  "Insufficient credits",
  VIDEO_PROVIDER_BUSY_MESSAGE,
  "Please enter a prompt.",
  "Please upload an image.",
  "Unsupported file type.",
  "File too large.",
  "Video extension failed to start.",
  "Video extension timed out.",
  "Extension finished without output.",
  "Status check failed.",
  "Could not read the last frame.",
  "Could not join the extended video.",
  "Could not load the video frame.",
  "Could not export the video frame.",
  "Could not prepare the frame upload.",
  "Frame upload failed.",
  "Please configure Cloudflare R2 storage to use reference images.",
  "Please check your storage configuration — reference image upload failed.",
]);

export function isSafePublicGenerationMessage(message: unknown): message is string {
  if (typeof message !== "string" || !message.trim()) return false;
  const msg = message.trim();
  if (SAFE_VALIDATION_MESSAGES.has(msg)) return true;

  // Filter out internal server stack traces or database errors
  const isInternalLeak =
    msg.includes("PrismaClient") ||
    msg.includes("PostgresError") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("SQLSTATE") ||
    msg.includes("SELECT ") ||
    msg.includes("INSERT INTO") ||
    msg.includes("at Object.<anonymous>") ||
    msg.includes("node:internal");

  if (isInternalLeak) return false;

  // Any non-internal message (Arabic, English, provider responses) is safe to display to user
  return true;
}

export function toSafePublicGenerationMessage(message: unknown): string {
  if (typeof message === "string" && isSafePublicGenerationMessage(message)) {
    return message.trim();
  }
  return SAFE_PUBLIC_GENERATION_ERROR;
}
