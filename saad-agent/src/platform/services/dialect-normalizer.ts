export class DialectNormalizer {
  /**
   * Normalizes Arabic spelling variants and maps Iraqi dialect terminology to standard Arabic.
   */
  static normalize(text: string): string {
    if (!text) return "";
    
    // 1. Unify case and scrub extra spaces
    let normalized = text.toLowerCase().trim();

    // 2. Normalize Iraqi letters
    normalized = normalized
      .replace(/گ/g, "ك")
      .replace(/چ/g, "ج");

    // 3. Normalize Arabic spelling variants (Hamza, Alif, Ya, Ta Marbuta)
    normalized = normalized
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه");

    // 4. Map Iraqi dialect words to standard equivalents (split/map/join to bypass JS non-ASCII \b limitation)
    const words = normalized.split(/\s+/);
    const mapped = words.map(w => {
      if (w === "شلون") return "كيف";
      if (w === "هسه") return "الان";
      if (w === "سوي") return "افعل";
      if (w === "يسوي") return "يفعل";
      if (w === "تسوي") return "تفعل";
      if (w === "افتهم") return "فهم";
      return w;
    });
    normalized = mapped.join(" ");

    // 5. Replace multiple whitespace characters with a single space
    return normalized.replace(/\s+/g, " ");
  }
}
