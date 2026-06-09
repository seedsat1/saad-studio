export const SAFE_PUBLIC_GENERATION_ERROR =
  "Sorry, something went wrong. The site is currently under maintenance. Please try again later.";

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
  if (typeof message !== "string") return false;
  if (SAFE_VALIDATION_MESSAGES.has(message)) return true;
  return (
    message.startsWith("Please ") ||
    message.startsWith("Kling 3.0 ") ||
    message.startsWith("Element @") ||
    message.includes("multi-shot") ||
    message.includes("shot prompt") ||
    message.includes(" is required") ||
    message.includes(" required") ||
    message.includes("Unsupported file type") ||
    message.includes("File too large") ||
    message.includes("Veo") ||
    message.includes("Gemini") ||
    message.includes("Google") ||
    message.includes("video") ||
    message.includes("Video") ||
    message.includes("frame") ||
    message.includes("Frame") ||
    message.includes("extension") ||
    message.includes("Extension")
  );
}

export function toSafePublicGenerationMessage(message: unknown): string {
  return isSafePublicGenerationMessage(message)
    ? message
    : SAFE_PUBLIC_GENERATION_ERROR;
}
