export interface ActiveReferences {
  activeProject?: string;
  activeWorkspace?: string;
  activeImage?: string;
  activeImageMimeType?: string;
  activeImagePrompt?: string;
  activeVisionSummary?: string;
  activeVisionWorkflow?: string;
  activeFile?: string;
  activeFolder?: string;
  activeModel?: string;
  activeProvider?: string;
}

export interface GoalProgress {
  goalId: string;
  currentGoal: string;
  currentSubgoal?: string;
  completedSteps: string[];
  remainingSteps: string[];
  status: "active" | "completed" | "abandoned";
  timestamp: number;
}

export class GoalManager {
  private static goals: Map<string, GoalProgress> = new Map();
  private static references: Map<string, ActiveReferences> = new Map();

  public static getGoalProgress(sessionId = "default_session"): GoalProgress {
    let goal = this.goals.get(sessionId);
    if (!goal) {
      goal = {
        goalId: `goal_${Date.now()}`,
        currentGoal: "General Assistance",
        completedSteps: [],
        remainingSteps: [],
        status: "active",
        timestamp: Date.now(),
      };
      this.goals.set(sessionId, goal);
    }
    return goal;
  }

  public static updateGoal(
    sessionId: string,
    currentGoal: string,
    remainingSteps: string[] = []
  ): GoalProgress {
    const current = this.getGoalProgress(sessionId);
    const updated: GoalProgress = {
      ...current,
      currentGoal,
      remainingSteps,
      status: "active",
      timestamp: Date.now(),
    };
    this.goals.set(sessionId, updated);
    return updated;
  }

  public static completeStep(sessionId: string, stepName: string): GoalProgress {
    const current = this.getGoalProgress(sessionId);
    if (!current.completedSteps.includes(stepName)) {
      current.completedSteps.push(stepName);
    }
    current.remainingSteps = current.remainingSteps.filter((s) => s !== stepName);
    current.timestamp = Date.now();
    this.goals.set(sessionId, current);
    return current;
  }

  public static getActiveReferences(sessionId = "default_session"): ActiveReferences {
    let refs = this.references.get(sessionId);
    if (!refs) {
      refs = {};
      this.references.set(sessionId, refs);
    }
    return refs;
  }

  public static updateActiveReferences(
    sessionId: string,
    updates: Partial<ActiveReferences>
  ): ActiveReferences {
    const current = this.getActiveReferences(sessionId);
    const updated = { ...current, ...updates };
    this.references.set(sessionId, updated);
    return updated;
  }

  /**
   * Resolves short pronoun/follow-up references to the most recent active object.
   */
  public static resolvePronounReference(
    sessionId: string,
    prompt: string
  ): { resolvedTarget?: string; targetType?: "file" | "image" | "goal" | "project" | "model" } {
    const clean = prompt.toLowerCase().trim();
    const refs = this.getActiveReferences(sessionId);
    const goal = this.getGoalProgress(sessionId);

    const pronouns = [
      "غيرها",
      "هذا",
      "هذه",
      "هذي",
      "هاي",
      "ذاك",
      "نفس هذا",
      "مثل قبل",
      "الثانية",
      "الأولى",
      "اشرح",
      "ليش",
      "هل هذا",
      "شنو يقصد",
      "كمل",
      "change it",
      "redo it",
      "this one",
      "this",
      "explain this",
    ];
    const containsPronoun = pronouns.some((p) => clean.includes(p));

    if (containsPronoun) {
      if (refs.activeImage) {
        return { resolvedTarget: refs.activeImage, targetType: "image" };
      }
      if (refs.activeFile) {
        return { resolvedTarget: refs.activeFile, targetType: "file" };
      }
      if (goal.currentGoal && goal.currentGoal !== "General Assistance") {
        return { resolvedTarget: goal.currentGoal, targetType: "goal" };
      }
    }

    return {};
  }

  /**
   * Detects if the user prompt completely shifts topics.
   */
  public static detectTopicShift(prompt: string, sessionId = "default_session"): boolean {
    const clean = prompt.toLowerCase();
    const current = this.getGoalProgress(sessionId);

    if (current.currentGoal === "General Assistance") return false;

    const shiftTriggers = [
      "موضوع ثاني",
      "شي ثاني",
      "خلينا نترك",
      "نغير الموضوع",
      "let's switch",
      "different topic",
      "configure lm studio",
    ];
    const matchesShift = shiftTriggers.some((t) => clean.includes(t));

    if (matchesShift) {
      console.log(`[Goal Manager] Topic shift detected in prompt ("${clean}"). Archiving old goal: ${current.currentGoal}`);
      current.status = "completed";
      this.goals.set(sessionId, current);
      this.updateGoal(sessionId, prompt, []);
      return true;
    }

    return false;
  }
}
