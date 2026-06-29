export interface PendingClarificationState {
  id: string;
  question: string;
  options?: string[];
  originalPrompt: string;
  timestamp: number;
}

export interface ConversationState {
  sessionId: string;
  activeWorkflow: string | null;
  activeFile?: string | undefined;
  activeTask?: string | undefined;
  lastIntent?: string | undefined;
  lastPrompt?: string | undefined;
  lastTimestamp: number;
  pendingClarification?: PendingClarificationState | null;
}

export class ConversationStateEngine {
  private static states: Map<string, ConversationState> = new Map();

  public static getState(sessionId = "default_session"): ConversationState {
    let state = this.states.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        activeWorkflow: null,
        lastTimestamp: Date.now(),
        pendingClarification: null,
      };
      this.states.set(sessionId, state);
    }
    return state;
  }

  public static updateState(sessionId: string, updates: Partial<ConversationState>): ConversationState {
    const current = this.getState(sessionId);
    const updated = {
      ...current,
      ...updates,
      lastTimestamp: Date.now(),
    };
    this.states.set(sessionId, updated);
    return updated;
  }

  public static setPendingClarification(sessionId: string, clarification: PendingClarificationState): void {
    const current = this.getState(sessionId);
    current.pendingClarification = clarification;
    current.lastTimestamp = Date.now();
    this.states.set(sessionId, current);
  }

  public static clearPendingClarification(sessionId: string): void {
    const current = this.getState(sessionId);
    current.pendingClarification = null;
    this.states.set(sessionId, current);
  }

  /**
   * Identifies contextual follow-up messages (corrections, continuations, agreements, choices).
   */
  public static detectContextualFollowUp(prompt: string): {
    isFollowUp: boolean;
    type?: "correction" | "continuation" | "agreement" | "selection";
    detail?: string;
  } {
    const clean = prompt.toLowerCase().trim();

    // 1. Correction
    const correctionPhrases = [
      "لا مو هيچ",
      "لا، مو هيچ",
      "مو هذا قصدي",
      "غيرها",
      "عيدها",
      "لا الفوق",
      "لا التحت",
      "هذا غلط",
      "not like this",
      "not what i meant",
      "redo it",
      "change it",
    ];
    if (correctionPhrases.some((p) => clean.includes(p))) {
      return { isFollowUp: true, type: "correction", detail: clean };
    }

    // 2. Continuation
    const continuationPhrases = [
      "كمل",
      "كمل من حيث توقفت",
      "استمر",
      "واصل",
      "continue",
      "keep going",
      "go on",
    ];
    if (continuationPhrases.some((p) => clean.includes(p))) {
      return { isFollowUp: true, type: "continuation", detail: clean };
    }

    // 3. Agreement / Confirmation
    const agreementPhrases = [
      "هي هاي",
      "هاي أفضل",
      "هاي افضل",
      "الأولى أحسن",
      "الاولى احسن",
      "تمام كمل",
      "خوش كمل",
      "yes do it",
      "sounds good",
    ];
    if (agreementPhrases.some((p) => clean.includes(p))) {
      return { isFollowUp: true, type: "agreement", detail: clean };
    }

    // 4. Selection
    const selectionPhrases = [
      "الأولى",
      "الاولى",
      "الثانية",
      "الثانيه",
      "الأول",
      "الاول",
      "الثاني",
      "الخيار الأول",
      "الخيار الثاني",
      "first one",
      "second one",
    ];
    if (selectionPhrases.some((p) => clean === p || clean.includes(p))) {
      return { isFollowUp: true, type: "selection", detail: clean };
    }

    return { isFollowUp: false };
  }

  /**
   * Resolves pending clarification based on user response.
   */
  public static resolveClarification(
    prompt: string,
    pending: PendingClarificationState
  ): { resolved: boolean; selectedOption?: string | undefined } {
    const clean = prompt.toLowerCase().trim();
    if (clean.includes("أول") || clean.includes("اول") || clean.includes("first")) {
      const opt = pending.options && pending.options[0] ? pending.options[0] : "Option 1";
      return { resolved: true, selectedOption: opt };
    }
    if (clean.includes("ثاني") || clean.includes("ثانيه") || clean.includes("second")) {
      const opt = pending.options && pending.options[1] ? pending.options[1] : "Option 2";
      return { resolved: true, selectedOption: opt };
    }
    return { resolved: true, selectedOption: prompt };
  }
}
