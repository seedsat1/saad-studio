/**
 * Test Sara as a general-purpose life assistant across multiple scenarios.
 * Run with: npx tsx scripts/test-sara-general.ts
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv(file: string) {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {}
}
loadEnv(".env.local");

import { runBrainTurn, buildDefaultSystemPrompt } from "@/lib/voice-agent/providers/gemini-brain";

const scenarios = [
  {
    title: "📍 مهمة 1: حجز مطعم بيروت",
    goal: "احجزي طاولة لشخصين بمطعم سوشي حلو ببيروت، اليوم الأربعاء الساعة 9 بالليل. صاحبي مالك يفضل مكان يسمح بالتدخين.",
    calleeIntro: "هلو، مطعم دجلة، تفضل.",
    turns: [
      "زين، شكد شخص؟",
      "خلاص محجوز، بس ما نسمح بالتدخين جوه المطعم.",
      "تمام، شكراً.",
    ],
    ownerName: "مالك",
  },
  {
    title: "📦 مهمة 2: متابعة شحنة تأخرت",
    goal: "اتصلي بشركة الشحن واستفسري عن شحنة رقم TR-88421 اللي كان لازم توصل امس. صاحبي يريد يعرف شنو صار وشوكت راح توصل.",
    calleeIntro: "الو، خدمة عملاء أرامكس، تفضلي.",
    turns: [
      "دقيقة، خليني أشوف الرقم... الشحنة موجودة بالمستودع، راح تنطلق اليوم مساءً.",
      "بس فيه رسم إضافي 5 آلاف دينار على التأخير، بتدفعوهن؟",
    ],
    ownerName: "مالك",
  },
  {
    title: "💼 مهمة 3: تأكيد موعد عيادة",
    goal: "اتصلي بعيادة الدكتور علي وأكدي موعد صاحبي مالك يوم الخميس الساعة 4 عصراً. إذا مو متاح، شوفي أقرب موعد بديل.",
    calleeIntro: "أهلاً، عيادة الدكتور علي، خير؟",
    turns: [
      "الخميس الساعة 4 مو متاح، الدكتور مسافر. عندنا الاثنين الساعة 3 أو الأربعاء الساعة 6.",
    ],
    ownerName: "مالك",
  },
];

async function runScenario(s: typeof scenarios[0]) {
  console.log("\n" + "=".repeat(60));
  console.log(s.title);
  console.log("الهدف:", s.goal);
  console.log("=".repeat(60));

  const systemPrompt = buildDefaultSystemPrompt({
    agentName: "سارة",
    companyName: "Saad Studio",
    goal: s.goal,
    dialect: "iraqi",
    tone: "ودودة ودافئة ومختصرة",
    ownerName: s.ownerName,
  });

  const history: { role: "user" | "model"; text: string }[] = [];
  const allTurns = [s.calleeIntro, ...s.turns];

  for (const userText of allTurns) {
    const reply = await runBrainTurn({
      systemPrompt,
      history,
      latestUserText: userText,
    });
    console.log(`\n👤 الطرف الثاني: ${userText}`);
    console.log(`🤖 سارة        : ${reply.text}`);
    if (reply.toolCalls.length) {
      console.log(`   ↳ tools: ${reply.toolCalls.map((t) => `${t.name}(${JSON.stringify(t.args)})`).join(", ")}`);
    }
    history.push({ role: "user", text: userText });
    history.push({ role: "model", text: reply.text });
    if (reply.shouldEndCall) {
      console.log("   ↳ 🔚 سارة أنهت المكالمة");
      break;
    }
  }
}

async function main() {
  for (const s of scenarios) {
    try {
      await runScenario(s);
    } catch (err: any) {
      console.error(`❌ ${s.title} — ${err?.message ?? err}`);
    }
  }
  console.log("\n" + "=".repeat(60));
  console.log("✅ خلص الاختبار");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
