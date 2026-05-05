/**
 * modules/assistant.js — EditPilot AI (Saad Studio)
 *
 * Assistant Panel — Phase 1: Command Routing
 *
 * Parses natural-language commands typed by the user and routes them
 * to existing plugin features. No external AI calls are made in Phase 1.
 *
 * Supported commands (keyword-matched, case-insensitive):
 *   "analyze …"   / "transcript …"        → Story Engine analyze
 *   "selects"     / "create selects"       → createSelectsTimeline
 *   "rough cut"   / "build rough cut"      → createRoughCutTimeline
 *   "help"                                 → list available commands
 *   "clear"                                → clear chat history
 *
 * Public API:
 *   parseCommand(input)  → { intent, args } | null
 *   INTENTS              → intent name constants
 */

// ─────────────────────────────────────────────────────────────
// INTENTS
// ─────────────────────────────────────────────────────────────

export const INTENTS = Object.freeze({
  ANALYZE:    'analyze',
  SELECTS:    'selects',
  ROUGH_CUT:  'rough_cut',
  HELP:       'help',
  CLEAR:      'clear',
  // Navigation shortcuts
  NAV_VIDEO:  'nav_video',
  NAV_IMAGE:  'nav_image',
  NAV_TTS:    'nav_tts',
  NAV_BROLL:  'nav_broll',
  NAV_STORY:  'nav_story',
  NAV_COLOR:  'nav_color',
  NAV_AUDIO:  'nav_audio',
  NAV_CAPS:   'nav_captions',
  // AI actions
  SOCIAL:     'social',
  TOP5:       'top5',
  UNKNOWN:    'unknown',
});

// ─────────────────────────────────────────────────────────────
// COMMAND PATTERNS
// ─────────────────────────────────────────────────────────────

/** Each entry: { pattern: RegExp, intent: string } ordered by priority. */
const COMMAND_PATTERNS = [
  // clear chat
  { pattern: /^clear\b/i,                                  intent: INTENTS.CLEAR },

  // help
  { pattern: /^help\b/i,                                   intent: INTENTS.HELP },

  // rough cut — check before "create selects" to avoid false match
  { pattern: /rough\s*cut/i,                               intent: INTENTS.ROUGH_CUT },

  // selects
  { pattern: /\bselects?\b/i,                              intent: INTENTS.SELECTS },
  { pattern: /create\s+selects?/i,                         intent: INTENTS.SELECTS },

  // analyze / transcript
  { pattern: /\banalyz/i,                                  intent: INTENTS.ANALYZE },
  { pattern: /\btranscript\b/i,                            intent: INTENTS.ANALYZE },

  // slash commands — navigation
  { pattern: /^\/video\b/i,                                intent: INTENTS.NAV_VIDEO },
  { pattern: /^\/image\b/i,                                intent: INTENTS.NAV_IMAGE },
  { pattern: /^\/tts\b/i,                                  intent: INTENTS.NAV_TTS },
  { pattern: /^\/voice\b/i,                                intent: INTENTS.NAV_TTS },
  { pattern: /^\/broll\b/i,                                intent: INTENTS.NAV_BROLL },
  { pattern: /^\/story\b/i,                                intent: INTENTS.NAV_STORY },
  { pattern: /^\/color\b/i,                                intent: INTENTS.NAV_COLOR },
  { pattern: /^\/audio\b/i,                                intent: INTENTS.NAV_AUDIO },
  { pattern: /^\/captions?\b/i,                            intent: INTENTS.NAV_CAPS },

  // AI actions
  { pattern: /^\/social\b/i,                               intent: INTENTS.SOCIAL },
  { pattern: /^\/top\s*5?\b/i,                             intent: INTENTS.TOP5 },
  { pattern: /\bsocial\s+clip/i,                           intent: INTENTS.SOCIAL },
  { pattern: /\btop\s+5\b/i,                               intent: INTENTS.TOP5 },
];

// ─────────────────────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────────────────────

/**
 * Parse a user input string into a structured command.
 *
 * @param {string} input
 * @returns {{ intent: string, raw: string, args: string }}
 */
export function parseCommand(input) {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  for (const { pattern, intent } of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Extract args: everything after the first word/slash-command
      const args = trimmed.replace(pattern, '').trim();
      return { intent, raw: trimmed, args };
    }
  }

  return { intent: INTENTS.UNKNOWN, raw: trimmed, args: '' };
}

// ─────────────────────────────────────────────────────────────
// HELP TEXT
// ─────────────────────────────────────────────────────────────

/** Returns the static help message shown for the "help" command. */
export function getHelpText() {
  return [
    'Available commands:',
    '',
    '  analyze           — Run Story Engine on the current transcript',
    '  create selects    — Build a Selects Timeline from analyzed sections',
    '  build rough cut   — Build a Rough Cut sequence from analyzed sections',
    '  help              — Show this message',
    '  clear             — Clear the chat history',
    '',
    'Slash shortcuts:',
    '  /video [prompt]   — Go to Video Gen, fill prompt',
    '  /image [prompt]   — Go to Image Gen, fill prompt',
    '  /tts [text]       — Go to TTS, fill text',
    '  /broll [prompt]   — Go to B-Roll Gen, fill prompt',
    '  /story            — Go to Story Engine',
    '  /color            — Go to Color Grading',
    '  /audio            — Go to Audio Mix',
    '  /captions         — Go to Auto Captions',
    '  /social           — Extract social clip from analyzed sections',
    '  /top5             — Find top 5 moments from analyzed sections',
  ].join('\n');
}
