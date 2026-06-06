import type { ContentViolation } from "@/domain/entities/Moderation";

export class ContentModerationService {
  private profanityWords: Set<string> = new Set();
  private sexualWords: Set<string> = new Set();
  private profanityPatterns: RegExp[] = [];
  private sexualPatterns: RegExp[] = [];
  private harassmentPatterns: RegExp[] = [];

  constructor() {
    this.initializeProfanityFilters();
    this.initializeSexualFilters();
  }

  private initializeProfanityFilters() {
    const profanities = [
      "amına",
      "siktir",
      "sikerim",
      "kahpe",
      "orospu",
      "şerefsiz",
      "pezevenk",
      "gavat",
      "yarrak",
      "yarak",
      "amk",
      "aq",
    ];

    profanities.forEach((word) => {
      this.profanityWords.add(word.toLowerCase());
      // Add common variations
      this.profanityWords.add(word.toUpperCase());
      this.profanityWords.add(word.charAt(0).toUpperCase() + word.slice(1));
    });

    this.profanityPatterns = [
      /\b(aq|amk|amina|aminak|aminag|orospu|kahpe|pezevenk|gavat|serefsiz|yarak)\w*\b/g,
      /\bsik(?!ayet)\w*\b/g,
      /\bsokar\w*\b/g,
      /\bsokuc\w*\b/g,
    ];
  }

  private initializeSexualFilters() {
    // Sexual content keywords
    const sexualKeywords = [
      "seks",
      "cinsel",
      "porno",
      "mastürbasyon",
      "oral",
      "anal",
      "vajina",
      "penis",
      "meme",
      "sperm",
      "boşal",
      "sikis",
      "sikiş",
      "sikişmek",
      "tecavüz",
      "çıplak",
      "nude",
    ];

    sexualKeywords.forEach((word) => {
      this.sexualWords.add(word.toLowerCase());
      this.sexualWords.add(word.toUpperCase());
    });

    this.sexualPatterns = [
      /\b(seks|porno|cinsel|sikis|sikismek|tecavuz|oral|anal|vajina|penis|bosal|nude|ciplak)\w*\b/g,
    ];
  }

  private normalizeText(text: string): string {
    return text
      .toLocaleLowerCase("tr-TR")
      .replace(/[ç]/g, "c")
      .replace(/[ğ]/g, "g")
      .replace(/[ıİi]/g, "i")
      .replace(/[ö]/g, "o")
      .replace(/[ş]/g, "s")
      .replace(/[ü]/g, "u")
      .replace(/[â]/g, "a")
      .replace(/[î]/g, "i")
      .replace(/[û]/g, "u")
      .replace(/[0]/g, "o")
      .replace(/[1!|]/g, "i")
      .replace(/[3]/g, "e")
      .replace(/[4@]/g, "a")
      .replace(/[5$]/g, "s")
      .replace(/[7]/g, "t")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/(.)\1{1,}/g, "$1")
      .trim();
  }

  private collectPatternMatches(text: string, patterns: RegExp[]): string[] {
    const normalizedText = ` ${this.normalizeText(text)} `;
    const matches = new Set<string>();

    patterns.forEach((pattern) => {
      pattern.lastIndex = 0;
      let match = pattern.exec(normalizedText);

      while (match) {
        matches.add(match[0].trim());
        match = pattern.exec(normalizedText);
      }
    });

    return Array.from(matches).filter(Boolean);
  }

  /**
   * Check message for profanity
   */
  checkProfanity(text: string): ContentViolation | null {
    const lowerText = text.toLowerCase();
    const matches = new Set<string>(this.collectPatternMatches(text, this.profanityPatterns));

    for (const word of this.profanityWords) {
      if (lowerText.includes(word.toLowerCase())) {
        matches.add(word);
      }
    }

    if (matches.size > 0) {
      return {
        type: "profanity",
        severity: "high",
        matches: Array.from(matches),
        confidence: 1,
      };
    }

    return null;
  }

  /**
   * Check message for sexual content
   */
  checkSexualContent(text: string): ContentViolation | null {
    const lowerText = text.toLowerCase();
    const matches = new Set<string>(this.collectPatternMatches(text, this.sexualPatterns));

    for (const word of this.sexualWords) {
      if (lowerText.includes(word.toLowerCase())) {
        matches.add(word);
      }
    }

    if (matches.size > 0) {
      return {
        type: "sexual_content",
        severity: "high",
        matches: Array.from(matches),
        confidence: 1,
      };
    }

    return null;
  }

  /**
   * Check message for harassment patterns
   */
  checkHarassment(text: string): ContentViolation | null {
    // Check for repeated characters (common in aggressive messages)
    const repeatedCharsMatch = text.match(/(.)\1{4,}/g);
    if (repeatedCharsMatch && repeatedCharsMatch.length > 2) {
      return {
        type: "harassment",
        severity: "medium",
        matches: repeatedCharsMatch,
        confidence: 0.6,
      };
    }

    // Check for all caps with length > 20 chars
    if (
      text.length > 20 &&
      text === text.toUpperCase() &&
      /[A-Z]{5,}/.test(text)
    ) {
      return {
        type: "harassment",
        severity: "low",
        matches: ["excessive_caps"],
        confidence: 0.4,
      };
    }

    return null;
  }

  /**
   * Check for spam patterns
   */
  checkSpam(text: string): ContentViolation | null {
    // Check for repeated words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts: Record<string, number> = {};

    for (const word of words) {
      if (word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    const repeatedWords = Object.entries(wordCounts).filter(
      ([_, count]) => count > 3,
    );

    if (repeatedWords.length > 0) {
      return {
        type: "spam",
        severity: "low",
        matches: repeatedWords.map(([word]) => word),
        confidence: 0.5,
      };
    }

    return null;
  }

  /**
   * Filter message content
   */
  filterMessage(text: string): {
    isClean: boolean;
    violations: ContentViolation[];
    filteredContent: string;
    shouldBlock: boolean;
  } {
    const violations: ContentViolation[] = [];
    let filteredContent = text;
    let shouldBlock = false;

    // Check profanity
    const profanityViolation = this.checkProfanity(text);
    if (profanityViolation) {
      violations.push(profanityViolation);
      filteredContent = this.maskViolations(
        filteredContent,
        profanityViolation.matches,
      );
      shouldBlock = true;
    }

    // Check sexual content
    const sexualViolation = this.checkSexualContent(text);
    if (sexualViolation) {
      violations.push(sexualViolation);
      filteredContent = this.maskViolations(
        filteredContent,
        sexualViolation.matches,
      );
      shouldBlock = true;
    }

    // Check harassment
    const harassmentViolation = this.checkHarassment(text);
    if (harassmentViolation) {
      violations.push(harassmentViolation);
    }

    // Check spam
    const spamViolation = this.checkSpam(text);
    if (spamViolation) {
      violations.push(spamViolation);
    }

    return {
      isClean: violations.length === 0,
      violations,
      filteredContent,
      shouldBlock,
    };
  }

  /**
   * Mask violations with asterisks
   */
  private maskViolations(text: string, matches: string[]): string {
    let result = text;

    for (const match of matches) {
      const regex = new RegExp(`\\b${match}\\b`, "gi");
      result = result.replace(regex, (matched) => "*".repeat(matched.length));
    }

    return result;
  }

  /**
   * Get severity level
   */
  getSeverity(violations: ContentViolation[]): "low" | "medium" | "high" {
    if (
      violations.some(
        (v) => v.type === "sexual_content" && v.severity === "high",
      )
    ) {
      return "high";
    }
    if (violations.some((v) => v.severity === "high")) {
      return "medium";
    }
    return violations.length > 0 ? "low" : "low";
  }

  /**
   * Should auto-ban based on violations
   */
  shouldAutoBan(violations: ContentViolation[]): boolean {
    return violations.some(
      (v) =>
        (v.type === "sexual_content" || v.type === "profanity") &&
        v.severity === "high" &&
        v.confidence >= 0.9,
    );
  }
}
