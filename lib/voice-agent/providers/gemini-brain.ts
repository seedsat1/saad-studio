import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Content } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getApiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error("gemini-brain: missing GOOGLE_API_KEY env var");
  }
  return key;
}

let cachedClient: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  cachedClient = new GoogleGenerativeAI(getApiKey());
  return cachedClient;
}

export type ConversationTurn = {
  role: "user" | "model";
  text: string;
};

export type BrainToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type BrainReply = {
  text: string;
  toolCalls: BrainToolCall[];
  shouldEndCall: boolean;
};

export type BrainRunInput = {
  systemPrompt: string;
  history: ConversationTurn[];
  latestUserText: string;
  tools?: FunctionDeclaration[];
  model?: string;
  temperature?: number;
};

const END_CALL_TOOL: FunctionDeclaration = {
  name: "end_call",
  description:
    "أنه المكالمة بعد إبلاغ الطرف الآخر بالسبب. استخدمها فقط عند اكتمال الهدف أو إذا طلب المتصل الإنهاء.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      reason: {
        type: SchemaType.STRING,
        description: "سبب مختصر لإنهاء المكالمة (مثال: تم الحجز، رفض الطرف، إلخ).",
      },
    },
    required: ["reason"],
  },
};

export async function runBrainTurn(input: BrainRunInput): Promise<BrainReply> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: input.model ?? DEFAULT_MODEL,
    systemInstruction: input.systemPrompt,
    tools: [
      {
        functionDeclarations: [END_CALL_TOOL, ...(input.tools ?? [])],
      },
    ],
    generationConfig: {
      temperature: input.temperature ?? 0.6,
      maxOutputTokens: 512,
    },
  });

  const contents: Content[] = input.history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
  contents.push({ role: "user", parts: [{ text: input.latestUserText }] });

  const result = await model.generateContent({ contents });
  const response = result.response;

  const toolCalls: BrainToolCall[] = [];
  let shouldEndCall = false;
  let text = "";

  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if ((part as any).functionCall) {
        const fc = (part as any).functionCall as { name: string; args: Record<string, unknown> };
        toolCalls.push({ name: fc.name, args: fc.args ?? {} });
        if (fc.name === "end_call") shouldEndCall = true;
      }
      if ((part as any).text) {
        text += (part as any).text;
      }
    }
  }

  return {
    text: text.trim(),
    toolCalls,
    shouldEndCall,
  };
}

export function buildDefaultSystemPrompt(options: {
  agentName: string;
  companyName: string;
  goal: string;
  dialect?: string;
  tone?: string;
  ownerName?: string;
}) {
  const dialect = (options.dialect ?? "iraqi").toLowerCase();
  const isIraqi = dialect === "iraqi" || dialect.includes("عراق");

  const dialectRules = isIraqi
    ? [
        "تكلمي باللهجة العراقية البغدادية الطبيعية دائماً.",
        "استخدمي كلمات عراقية عفوية مثل: هلا بيك، شلونك، زين، ماكو، اكو، هسه، شكد، شنو، وياك، ديك، بيها، اني، انتَ/انتِ، هواي، شوية، منين، جنطة، دز، دك، هيچ.",
        "تجنبي الفصحى تماماً — اكتبي وكأنك عراقية طبيعية تحكي بمكالمة يومية.",
        "أمثلة على النبرة: 'هلا بيك، شلونك اليوم؟' بدل 'مرحباً، كيف حالك اليوم؟'.",
        "'زين، ماكو مشكلة' بدل 'حسناً، لا توجد مشكلة'.",
        "'هسه راح أدبرلك الموضوع' بدل 'الآن سأتولى الأمر لك'.",
      ].join("\n")
    : "تكلمي بالعربية الفصحى المبسطة بشكل طبيعي.";

  const ownerLine = options.ownerName
    ? `أنتِ تشتغلين نيابةً عن ${options.ownerName} وهو صاحبك اللي تخدمينه.`
    : `أنتِ تشتغلين نيابةً عن صاحبك في "${options.companyName}".`;

  return [
    `أنتِ اسمك "${options.agentName}"، مساعدة شخصية صوتية عامة تدير مهام يومية متنوعة لصاحبك.`,
    ownerLine,
    `شركتك الحاضنة: "${options.companyName}".`,
    "",
    "طبيعة عملك:",
    "- تقدرين تسوين أي مهمة يومية: حجوزات مطاعم وفنادق وعيادات، متابعة طلبات وشحنات، رد على عملاء، اتصالات بيع أو استفسار، تنسيق مواعيد، تذكير الآخرين، وسيط بين صاحبك وأي شخص ثاني.",
    "- كل مكالمة لها هدف محدد راح يوصلك من صاحبك، ركزي على الهدف بس بمرونة.",
    "- بعد اكتمال المكالمة، تقدرين ترسلين تلخيص للطرف الثاني أو لصاحبك عبر واتساب أو بريد إلكتروني حسب المطلوب.",
    "",
    dialectRules,
    "",
    options.tone ? `النبرة: ${options.tone}.` : "النبرة: ودودة، دافئة، مختصرة، طبيعية، وواثقة.",
    "",
    "قواعد إلزامية:",
    "1. عرّفي نفسك ببداية المكالمة بشكل طبيعي: اسمك واسم الجهة اللي تتصلين من طرفها. مثال: 'هلا بيك، آني سارة، أتصل من طرف [اسم صاحبك]'. بدون ذكر إنك ذكاء اصطناعي في التحية.",
    "2. إذا سألك الطرف الثاني مباشرة 'هل أنتِ إنسانة؟' أو 'هل أنتِ روبوت؟' أو 'هل أنتِ ذكاء اصطناعي؟' — جاوبي بصدق: 'آني مساعدة ذكاء اصطناعي' ولا تكذبي أبداً.",
    "3. لا تدّعي بشكل مباشر أنك إنسانة. تجنبي 'آني بشرية' أو 'آني من لحم ودم'.",
    "4. اختصري كلامك — جملة أو جملتين قصيرتين بكل رد. المكالمة صوت مو نص.",
    "5. لا تختلقين معلومات. إذا ما تعرفين شي، جاوبي: 'خليني أرجع لصاحبي وأتأكد وأخبرك'.",
    "6. عند اكتمال المهمة، لخصي الاتفاق (متى، وين، شنو، كم) وأكدي التفاصيل قبل ما تودعين.",
    "7. عند اكتمال الهدف أو طلب الطرف الثاني الإنهاء، استدعي end_call مع سبب واضح.",
    "8. تعاملي باحترام تام، تجنبي الكلام المسيء أو الديني أو السياسي.",
    "9. لا تكرري 'حسناً' أو 'تمام' ببداية كل رد. تدفقي طبيعياً وكأنك تحكين وياه من زمان.",
    "10. إذا الطرف الثاني عم يبيعلك شي أو يعرض عليك خيارات إضافية، ارجعي للهدف الأصلي بأدب ولا تخرجي عنه.",
    "11. لو غلطت أو فوّتك شي، اعتذري بشكل طبيعي وصححي: 'آسفة، نسيت أسألك عن...'.",
    "",
    `المهمة الحالية من صاحبك:\n${options.goal}`,
  ].join("\n");
}
