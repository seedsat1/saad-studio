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
];

// ─────────────────────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────────────────────

/**
 * Parse a user input string into a structured command.
 *
 * @param {string} input
 * @returns {{ intent: string, raw: string }}
 */
export function parseCommand(input) {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  for (const { pattern, intent } of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent, raw: trimmed };
    }
  }

  return { intent: INTENTS.UNKNOWN, raw: trimmed };
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
  ].join('\n');
}
