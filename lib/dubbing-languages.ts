/**
 * Language codes for ElevenLabs Dubbing (WaveSpeed `elevenlabs/dubbing`).
 *
 * The API takes an ISO-639 code, not a language name: `es`, never `Spanish`.
 * The route used to forward whatever the caller sent — `"Arabic"`, `"Auto"` —
 * which the provider cannot resolve.
 *
 * The two lists are deliberately different, as the provider's own docs state:
 * Hebrew, Persian and Thai can be dubbed *from* but not *into*; Filipino can be
 * dubbed *into* but not *from*.
 */

export interface DubbingLanguage {
  /** ISO-639-1 (or -3) code sent to the provider. */
  code: string;
  nameEn: string;
  nameAr: string;
}

/** 33 languages the provider can dub into. */
export const DUBBING_TARGET_LANGUAGES: DubbingLanguage[] = [
  { code: "ar", nameEn: "Arabic", nameAr: "العربية" },
  { code: "bg", nameEn: "Bulgarian", nameAr: "البلغارية" },
  { code: "zh", nameEn: "Chinese", nameAr: "الصينية" },
  { code: "hr", nameEn: "Croatian", nameAr: "الكرواتية" },
  { code: "cs", nameEn: "Czech", nameAr: "التشيكية" },
  { code: "da", nameEn: "Danish", nameAr: "الدنماركية" },
  { code: "nl", nameEn: "Dutch", nameAr: "الهولندية" },
  { code: "en", nameEn: "English", nameAr: "الإنجليزية" },
  { code: "fil", nameEn: "Filipino", nameAr: "الفلبينية" },
  { code: "fi", nameEn: "Finnish", nameAr: "الفنلندية" },
  { code: "fr", nameEn: "French", nameAr: "الفرنسية" },
  { code: "de", nameEn: "German", nameAr: "الألمانية" },
  { code: "el", nameEn: "Greek", nameAr: "اليونانية" },
  { code: "hi", nameEn: "Hindi", nameAr: "الهندية" },
  { code: "hu", nameEn: "Hungarian", nameAr: "الهنغارية" },
  { code: "id", nameEn: "Indonesian", nameAr: "الإندونيسية" },
  { code: "it", nameEn: "Italian", nameAr: "الإيطالية" },
  { code: "ja", nameEn: "Japanese", nameAr: "اليابانية" },
  { code: "ko", nameEn: "Korean", nameAr: "الكورية" },
  { code: "ms", nameEn: "Malay", nameAr: "الملايوية" },
  { code: "no", nameEn: "Norwegian", nameAr: "النرويجية" },
  { code: "pl", nameEn: "Polish", nameAr: "البولندية" },
  { code: "pt", nameEn: "Portuguese", nameAr: "البرتغالية" },
  { code: "ro", nameEn: "Romanian", nameAr: "الرومانية" },
  { code: "ru", nameEn: "Russian", nameAr: "الروسية" },
  { code: "sk", nameEn: "Slovak", nameAr: "السلوفاكية" },
  { code: "es", nameEn: "Spanish", nameAr: "الإسبانية" },
  { code: "sv", nameEn: "Swedish", nameAr: "السويدية" },
  { code: "tl", nameEn: "Tagalog", nameAr: "التاغالوغية" },
  { code: "ta", nameEn: "Tamil", nameAr: "التاميلية" },
  { code: "tr", nameEn: "Turkish", nameAr: "التركية" },
  { code: "uk", nameEn: "Ukrainian", nameAr: "الأوكرانية" },
  { code: "vi", nameEn: "Vietnamese", nameAr: "الفيتنامية" },
];

/** 57 languages the provider can dub from, plus `auto`. */
export const DUBBING_SOURCE_LANGUAGES: DubbingLanguage[] = [
  { code: "auto", nameEn: "Detect automatically", nameAr: "كشف تلقائي" },
  { code: "af", nameEn: "Afrikaans", nameAr: "الأفريكانية" },
  { code: "ar", nameEn: "Arabic", nameAr: "العربية" },
  { code: "hy", nameEn: "Armenian", nameAr: "الأرمنية" },
  { code: "az", nameEn: "Azerbaijani", nameAr: "الأذربيجانية" },
  { code: "be", nameEn: "Belarusian", nameAr: "البيلاروسية" },
  { code: "bs", nameEn: "Bosnian", nameAr: "البوسنية" },
  { code: "bg", nameEn: "Bulgarian", nameAr: "البلغارية" },
  { code: "ca", nameEn: "Catalan", nameAr: "الكتالونية" },
  { code: "zh", nameEn: "Chinese", nameAr: "الصينية" },
  { code: "hr", nameEn: "Croatian", nameAr: "الكرواتية" },
  { code: "cs", nameEn: "Czech", nameAr: "التشيكية" },
  { code: "da", nameEn: "Danish", nameAr: "الدنماركية" },
  { code: "nl", nameEn: "Dutch", nameAr: "الهولندية" },
  { code: "en", nameEn: "English", nameAr: "الإنجليزية" },
  { code: "et", nameEn: "Estonian", nameAr: "الإستونية" },
  { code: "fi", nameEn: "Finnish", nameAr: "الفنلندية" },
  { code: "fr", nameEn: "French", nameAr: "الفرنسية" },
  { code: "gl", nameEn: "Galician", nameAr: "الجاليكية" },
  { code: "de", nameEn: "German", nameAr: "الألمانية" },
  { code: "el", nameEn: "Greek", nameAr: "اليونانية" },
  { code: "he", nameEn: "Hebrew", nameAr: "العبرية" },
  { code: "hi", nameEn: "Hindi", nameAr: "الهندية" },
  { code: "hu", nameEn: "Hungarian", nameAr: "الهنغارية" },
  { code: "is", nameEn: "Icelandic", nameAr: "الآيسلندية" },
  { code: "id", nameEn: "Indonesian", nameAr: "الإندونيسية" },
  { code: "it", nameEn: "Italian", nameAr: "الإيطالية" },
  { code: "ja", nameEn: "Japanese", nameAr: "اليابانية" },
  { code: "kn", nameEn: "Kannada", nameAr: "الكانادية" },
  { code: "kk", nameEn: "Kazakh", nameAr: "الكازاخية" },
  { code: "ko", nameEn: "Korean", nameAr: "الكورية" },
  { code: "lv", nameEn: "Latvian", nameAr: "اللاتفية" },
  { code: "lt", nameEn: "Lithuanian", nameAr: "الليتوانية" },
  { code: "mk", nameEn: "Macedonian", nameAr: "المقدونية" },
  { code: "ms", nameEn: "Malay", nameAr: "الملايوية" },
  { code: "mi", nameEn: "Maori", nameAr: "الماورية" },
  { code: "mr", nameEn: "Marathi", nameAr: "المهاراتية" },
  { code: "ne", nameEn: "Nepali", nameAr: "النيبالية" },
  { code: "no", nameEn: "Norwegian", nameAr: "النرويجية" },
  { code: "fa", nameEn: "Persian", nameAr: "الفارسية" },
  { code: "pl", nameEn: "Polish", nameAr: "البولندية" },
  { code: "pt", nameEn: "Portuguese", nameAr: "البرتغالية" },
  { code: "ro", nameEn: "Romanian", nameAr: "الرومانية" },
  { code: "ru", nameEn: "Russian", nameAr: "الروسية" },
  { code: "sr", nameEn: "Serbian", nameAr: "الصربية" },
  { code: "sk", nameEn: "Slovak", nameAr: "السلوفاكية" },
  { code: "sl", nameEn: "Slovenian", nameAr: "السلوفينية" },
  { code: "es", nameEn: "Spanish", nameAr: "الإسبانية" },
  { code: "sw", nameEn: "Swahili", nameAr: "السواحيلية" },
  { code: "sv", nameEn: "Swedish", nameAr: "السويدية" },
  { code: "tl", nameEn: "Tagalog", nameAr: "التاغالوغية" },
  { code: "ta", nameEn: "Tamil", nameAr: "التاميلية" },
  { code: "th", nameEn: "Thai", nameAr: "التايلندية" },
  { code: "tr", nameEn: "Turkish", nameAr: "التركية" },
  { code: "uk", nameEn: "Ukrainian", nameAr: "الأوكرانية" },
  { code: "ur", nameEn: "Urdu", nameAr: "الأردية" },
  { code: "vi", nameEn: "Vietnamese", nameAr: "الفيتنامية" },
  { code: "cy", nameEn: "Welsh", nameAr: "الويلزية" },
];

const TARGET_CODES = new Set(DUBBING_TARGET_LANGUAGES.map((l) => l.code));
const SOURCE_CODES = new Set(DUBBING_SOURCE_LANGUAGES.map((l) => l.code));

/** Longest names first, so "Chinese (Simplified)" cannot be matched as "Chinese". */
const NAME_TO_CODE = new Map<string, string>(
  [...DUBBING_SOURCE_LANGUAGES, ...DUBBING_TARGET_LANGUAGES]
    .sort((a, b) => b.nameEn.length - a.nameEn.length)
    .flatMap((l) => [
      [l.nameEn.toLowerCase(), l.code] as [string, string],
      [l.nameAr, l.code] as [string, string],
    ]),
);

/**
 * Accepts a code or a language name in either script and returns the code the
 * provider expects, or null when it is not a language this model can dub into.
 */
export function toDubbingTargetCode(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (TARGET_CODES.has(lower)) return lower;
  const mapped = NAME_TO_CODE.get(lower) ?? NAME_TO_CODE.get(raw);
  return mapped && TARGET_CODES.has(mapped) ? mapped : null;
}

/** Same, for the source side. Anything unrecognised falls back to `auto`. */
export function toDubbingSourceCode(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "auto";
  const lower = raw.toLowerCase();
  if (lower === "auto" || lower === "auto-detect" || lower === "detect automatically") return "auto";
  if (SOURCE_CODES.has(lower)) return lower;
  const mapped = NAME_TO_CODE.get(lower) ?? NAME_TO_CODE.get(raw);
  return mapped && SOURCE_CODES.has(mapped) ? mapped : "auto";
}

/** Speakers the provider accepts; 0 means detect. */
export function clampDubbingSpeakers(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(32, n);
}

/** The provider trims anything past this and bills up to it. */
export const DUBBING_MAX_BILLED_SECONDS = 15 * 60;

/** Provider price, from its own pricing table: $0.01 per second of source media. */
export const DUBBING_USD_PER_SECOND = 0.01;
