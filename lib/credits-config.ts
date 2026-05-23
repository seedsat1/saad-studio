// Welcome signup bonus disabled. Anti-abuse measure — new accounts no
// longer auto-receive any free credits. Override via env if you want to
// re-enable a promo (e.g. WELCOME_SIGNUP_CREDITS=10).
export const WELCOME_SIGNUP_CREDITS = Math.max(
  0,
  Number.parseInt(process.env.WELCOME_SIGNUP_CREDITS ?? "0", 10) || 0,
);

export const ASSIST_CHAT_CREDITS = Math.max(
  1,
  Number.parseInt(process.env.ASSIST_CHAT_CREDITS ?? "1", 10) || 1,
);

export const CODE_CHAT_CREDITS = Math.max(
  1,
  Number.parseInt(process.env.CODE_CHAT_CREDITS ?? "1", 10) || 1,
);

export const SCENE_STUDIO_CREDITS = Math.max(
  1,
  Number.parseInt(process.env.SCENE_STUDIO_CREDITS ?? "22", 10) || 22,
);
