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
      "amını",
      "amcık",
      "amcuk",
      "amına koy",
      "amına koyarım",
      "siktir",
      "sikerim",
      "sikiyim",
      "sikeyim",
      "kahpe",
      "orospu",
      "şerefsiz",
      "pezevenk",
      "gavat",
      "göt",
      "götveren",
      "piç",
      "puşt",
      "ibne",
      "yavşak",
      "yarrak",
      "yarak",
      "amk",
      "aq",
      "oç",
    ];

    profanities.forEach((word) => {
      this.profanityWords.add(word.toLowerCase());
      // Add common variations
      this.profanityWords.add(word.toUpperCase());
      this.profanityWords.add(word.charAt(0).toUpperCase() + word.slice(1));
    });

    this.profanityPatterns = [
      /\b(aq|amk|oc|amina|amini|aminak|aminag|aminakoy|amcik|amcuk|orospu|kahpe|pezevenk|gavat|gotveren|serefsiz|yavsak|pic|pust|ibne|yarak|yarrak)\w*\b/g,
      /\bsik(?!ayet)\w*\b/g,
      /\bsokar\w*\b/g,
      /\bsokuc\w*\b/g,
      /\bgot\w*\b/g,
    ];
  }

  private initializeSexualFilters() {
    const sexualKeywords = [
      "seks",
      "sex",
      "cinsel",
      "cinsellik",
      "porno",
      "pornografi",
      "porn",
      "erotik",
      "erotizm",
      "mastürbasyon",
      "masturbasyon",
      "mastürbe",
      "masturbe",
      "vajina",
      "vagina",
      "penis",
      "pipi",
      "pipiş",
      "çük",
      "testis",
      "klitoris",
      "meme",
      "memeler",
      "göğüs",
      "göğüsler",
      "kalça",
      "popo",
      "sperm",
      "meni",
      "boşal",
      "boşalmak",
      "boşalayım",
      "boşaldım",
      "sikis",
      "sikiş",
      "sikmek",
      "sikişmek",
      "sikişelim",
      "sikişelim mi",
      "seviş",
      "sevişmek",
      "sevişelim",
      "sevişelim mi",
      "öpüş",
      "öpüşmek",
      "öpüşelim",
      "tecavüz",
      "çıplak",
      "çıplaklık",
      "nude",
      "nudes",
      "naked",
      "azgın",
      "azgınım",
      "azdım",
      "tahrik",
      "libido",
      "yatakta",
      "yatalım",
      "fantazi",
      "fantezi",
      "fetiş",
      "fetis",
      "fetişizm",
      "fetisizm",
      "fetişizim",
      "fetisizim",
      "fetish",
      "foot fetish",
      "feet fetish",
      "ayak fetişi",
      "ayak fetisi",
      "ayak fetiş",
      "ayak fetis",
      "ayak yalarım",
      "ayak yalamak",
      "ayak yalayayım",
      "ayak yalayım",
      "ayak yalayalim",
      "ayağını yalarım",
      "ayağını yalayayım",
      "ayaklarını yalarım",
      "ayaklarını yalayayım",
      "taban yalamak",
      "parmaklarını yalarım",
      "sakso",
      "saksocu",
      "blowjob",
      "handjob",
      "deepthroat",
      "onlyfans",
      "escort",
      "fahişe",
      "seks işçisi",
      "ifşa",
      "ifsa",
      "bıttık",
      "pıttık",
    ];

    sexualKeywords.forEach((word) => {
      this.sexualWords.add(word.toLowerCase());
      this.sexualWords.add(word.toUpperCase());
    });

    this.sexualPatterns = [
      /\b(seks|sex|porno|pornografi|porn|erotik|erotizm|cinsel|cinselik|cinsellik|nude|nudes|naked|ciplak|ciplaklik|azgin|azginim|azdim|tahrik|libido|onlyfans|escort|fahise|ifsa)\w*\b/g,
      /\b(oral|anal)\b/g,
      /\b(vajina|vagina|penis|pipi|pipis|cuk|testis|klitoris|meme|memeler|gogus|gogusler|kalca|popo|sperm|meni|bosal|bosalmak|bosalayim|bosaldim|masturbasyon|masturbe)\w*\b/g,
      /\b(sik(?!ayet)\w*|sikis|sikismek|sikiselim|sevis|sevismek|seviselim|opus|opusmek|opuselim|tecavuz)\w*\b/g,
      /\b(yatakta|yatalim|fantazi|fantezi|fetis|fetisizm|fetisizim|fetish)\w*\b/g,
      /\b(iliski|yatak|fantazi|fantezi)\s*(yapalim|girelim|ister misin|mi|teklifi|yasayalim|deneyelim)?\b/g,
      /\b(ayak|ayagini|ayaklarini|taban|parmak|parmaklarini|feet|foot)\s+(fetis|fetish|yala|yalarim|yalayim|yalayayim|yalayalim|yalamak|em|emeyim|emmek|kokla|koklayim|koklamak)\w*\b/g,
      /\b(ayak|ayagini|ayaklarini|taban|parmak|parmaklarini|feet|foot)(fetis|fetish|yala|yalarim|yalayim|yalayayim|yalayalim|yalamak|em|emeyim|emmek|kokla|koklayim|koklamak)\w*\b/g,
      /\b(yala|yalarim|yalayim|yalayayim|yalayalim|yalamak|em|emeyim|emmek|kokla|koklayim|koklamak)\w*\s+(ayak|ayagini|ayaklarini|taban|parmak|parmaklarini|feet|foot)\w*\b/g,
      /\b(sakso|saksocu|blowjob|handjob|deepthroat|seksiscisi|seksisciligi)\w*\b/g,
      /\b(bitik|pitik|bittik|pittik)\w*\b/g,
    ];
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const normalized = this.normalizeText(text);
    const normalizedText = ` ${normalized} `;
    const compactText = ` ${normalized.replace(/\s+/g, "")} `;
    const targets = [normalizedText, compactText];
    const matches = new Set<string>();

    patterns.forEach((pattern) => {
      targets.forEach((target) => {
        pattern.lastIndex = 0;
        let match = pattern.exec(target);

        while (match) {
          matches.add(match[0].trim());
          match = pattern.exec(target);
        }
      });
    });

    return Array.from(matches).filter(Boolean);
  }

  private collectKeywordMatches(text: string, words: Set<string>): string[] {
    const normalizedText = ` ${this.normalizeText(text)} `;
    const compactText = normalizedText.replace(/\s+/g, "");
    const matches = new Set<string>();

    for (const word of words) {
      const normalizedWord = this.normalizeText(word);

      if (!normalizedWord) {
        continue;
      }

      const normalizedPattern = new RegExp(
        `\\b${this.escapeRegExp(normalizedWord).replace(/\s+/g, "\\s+")}\\w*\\b`,
        "i",
      );
      const compactPattern = new RegExp(
        `\\b${this.escapeRegExp(normalizedWord.replace(/\s+/g, ""))}\\w*\\b`,
        "i",
      );

      if (
        normalizedPattern.test(normalizedText) ||
        compactPattern.test(compactText)
      ) {
        matches.add(word);
      }
    }

    return Array.from(matches);
  }

  /**
   * Check message for profanity
   */
  checkProfanity(text: string): ContentViolation | null {
    const matches = new Set<string>(this.collectPatternMatches(text, this.profanityPatterns));

    this.collectKeywordMatches(text, this.profanityWords).forEach((match) =>
      matches.add(match),
    );

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
    const matches = new Set<string>(this.collectPatternMatches(text, this.sexualPatterns));

    this.collectKeywordMatches(text, this.sexualWords).forEach((match) =>
      matches.add(match),
    );

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
