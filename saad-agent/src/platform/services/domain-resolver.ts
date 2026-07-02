import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface DomainResolutionResult {
  isResolved: boolean;
  intent?: string;
  domain?: string;
  entity?: Record<string, any>;
  skipBrave?: boolean;
  skipLLM?: boolean;
}

export class DomainResolver {
  private static iraqiDialect: Record<string, any> = {};

  static loadDialect() {
    try {
      const filePath = path.join(CONFIG.PROJECT_ROOT, "saad-agent", ".saad-agent", "language", "iraqi-engineering-dialect.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        this.iraqiDialect = JSON.parse(content);
      }
    } catch (e) {
      console.warn("Failed to load Iraqi dialect dictionary:", e);
    }
  }

  private static normalizeArabic(input: string): string {
    return input
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[؟?!.،,؛:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static resolve(prompt: string): DomainResolutionResult {
    const normalized = this.normalizeArabic(prompt);

    const dialectTerms: Record<string, { intent: string; command: string }> = {
      "يمعود": { intent: "emphasis", command: "tone/emphasis" },
      "همزين": { intent: "confirmation", command: "confirmation" },
      "كول": { intent: "explain", command: "explain" },
      "جيبها": { intent: "retrieve_previous", command: "retrieve_previous" },
      "هاتها": { intent: "retrieve_previous", command: "retrieve_previous" },
      "دزلي": { intent: "return_result", command: "return_result" },
      "شوف": { intent: "inspect", command: "inspect" },
      "دور": { intent: "search_local_or_context", command: "search_local_or_context" },
      "سوه": { intent: "execute", command: "execute" },
      "سوّيها": { intent: "execute", command: "execute" },
      "سويها": { intent: "execute", command: "execute" },
      "كمل": { intent: "continue_previous_task", command: "continue_previous_task" },
      "وقف": { intent: "stop", command: "stop" },
      "رجع": { intent: "rollback_or_restore", command: "rollback_or_restore" },
      "عدله": { intent: "modify_current_target", command: "modify_current_target" },
      "غيره": { intent: "replace_current_target", command: "replace_current_target" },
      "مو هيچ": { intent: "reject_previous_output", command: "reject_previous_output" },
      "مو هيج": { intent: "reject_previous_output", command: "reject_previous_output" },
      "مو هذا": { intent: "reject_previous_output", command: "reject_previous_output" },
      "هذني": { intent: "current_selection", command: "current_selection" },
      "هاي": { intent: "current_object", command: "current_object" },
      "هذاك": { intent: "previous_object", command: "previous_object" },
      "ليش": { intent: "ask_reason", command: "ask_reason" },
      "شلون": { intent: "ask_how", command: "ask_how" },
      "شنو": { intent: "ask_what", command: "ask_what" }
    };

    if (dialectTerms[normalized]) {
      const match = dialectTerms[normalized]!;
      return {
        isResolved: true,
        intent: match.intent,
        domain: "iraqi_dialect",
        entity: { command: match.command },
        skipBrave: true,
        skipLLM: true
      };
    }
    
    // 1. Software / Release Domain Check (Section 5)
    // Only map "صدر" to release when versioning/release terms are present: اصدار, نسخة, تحديث, نشر, release, version, update
    if (normalized.includes("الاصدار الكبير") || (normalized.includes("اصدار") && normalized.includes("كبير"))) {
      return {
        isResolved: true,
        intent: "explanation",
        domain: "software_release",
        entity: { release_type: "major_release" },
        skipBrave: true,
        skipLLM: false
      };
    }
    
    if (normalized.includes("صدر تحديث جديد") || (normalized.includes("تحديث") && normalized.includes("جديد"))) {
      return {
        isResolved: true,
        intent: "explanation",
        domain: "software_release",
        entity: { release_type: "update" },
        skipBrave: true,
        skipLLM: false
      };
    }

    // 2. Human Attributes / Image Generation Check
    const hasHumanSignals = /(صدر كبير|صدر صغير|صدر متوسط|ارداف كبيره|ارداف كبير|طيز كبير|طيز صغير|فلر|فيلر|تكبير الشفايف|شفايف كبيره|شفايف كبار|شفايف صغيره|شفايف صغار|عضلات|رياضي|رياضيه|رجل|امراه|سمين|سمينه|ضعيف|ضعيفه|نحيف|نحيفه)/i.test(normalized);
    
    if (hasHumanSignals) {
      const entity: Record<string, any> = {};
      
      if (normalized.includes("رجل")) entity.gender = "male";
      else if (/(امراه|بنت|فتاه)/.test(normalized)) entity.gender = "female";
      
      if (/(سمين|سمينه)/.test(normalized)) entity.body_type = "overweight";
      else if (/(ضعيف|ضعيفه|نحيف|نحيفه)/.test(normalized)) entity.body_type = "slim";
      else if (/(رياضي|رياضيه)/.test(normalized)) entity.body_type = "athletic";
      
      if (normalized.includes("صدر كبير")) entity.chest_size = "large";
      else if (normalized.includes("صدر صغير")) entity.chest_size = "small";
      else if (normalized.includes("صدر متوسط")) entity.chest_size = "medium";
      
      if (/(ارداف كبيره|ارداف كبير|طيز كبير|مؤخره كبيره)/.test(normalized)) entity.butt_size = "large";
      else if (/(طيز صغير|مؤخره صغيره)/.test(normalized)) entity.butt_size = "small";
      
      if (/(فلر|فيلر)/.test(normalized)) entity.lip_filler = true;
      
      if (/(تكبير الشفايف|شفايف كبيره|شفايف كبار)/.test(normalized)) entity.lips_size = "large";
      else if (/(شفايف صغيره|شفايف صغار)/.test(normalized)) entity.lips_size = "small";
      
      if (normalized.includes("عضلات")) entity.muscularity = "high";

      if (Object.keys(entity).length > 0) {
        return {
          isResolved: true,
          intent: "attribute_parse",
          domain: "human_attributes",
          entity,
          skipBrave: true,
          skipLLM: true
        };
      }
    }

    return { isResolved: false };
  }
}

// Load dialect on initialization
DomainResolver.loadDialect();
