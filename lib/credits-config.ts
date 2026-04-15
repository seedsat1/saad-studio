export const WELCOME_SIGNUP_CREDITS = Math.max(
  0,
  Number.parseInt(process.env.WELCOME_SIGNUP_CREDITS ?? "100", 10) || 100,
);

export const ASSIST_CHAT_CREDITS = Math.max(
  1,
  Number.parseInt(process.env.ASSIST_CHAT_CREDITS ?? "1", 10) || 1,
);

export const CODE_CHAT_CREDITS = Math.max(
  1,
  Number.parseInt(process.env.CODE_CHAT_CREDITS ?? "1", 10) || 1,
);
