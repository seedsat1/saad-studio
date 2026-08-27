"use client";

import { useEffect, useState } from "react";
import { Bot, Mail, Phone, Plug, ShieldCheck, SlidersHorizontal, UserPlus } from "lucide-react";

import { VoiceAgentNav } from "./VoiceAgentNav";

export function VoiceAgentAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/voice-agent/agents").then((r) => r.json()).then((j) => setAgents(j.agents ?? [])).catch(() => setAgents([]));
  }, []);
  return <ConfigShell title="إدارة وكلاء الصوت" icon={Bot}>
    <div className="grid gap-3 md:grid-cols-2">
      {agents.map((agent) => <ConfigItem key={agent.id} title={agent.name} detail={`${agent.companyName} • ${agent.language} • ${agent.tone}`} />)}
      {agents.length === 0 && <ConfigItem title="Saad Voice Agent" detail="سيتم إنشاء الوكيل الافتراضي عند أول تحميل." />}
    </div>
  </ConfigShell>;
}

export function VoiceAgentIntegrationsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/voice-agent/integrations").then((r) => r.json()).then((j) => setItems(j.integrations ?? [])).catch(() => setItems([]));
  }, []);
  return <ConfigShell title="التكاملات" icon={Plug}>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <ConfigItem key={item.provider} title={item.provider} detail={`الحالة الحالية: ${item.status} - لا توجد مفاتيح في الواجهة`} />)}
    </div>
  </ConfigShell>;
}

export function VoiceAgentSettingsPage() {
  return <ConfigShell title="إعدادات الوكيل الصوتي" icon={SlidersHorizontal}>
    <div className="grid gap-3 md:grid-cols-2">
      <ConfigItem title="سياسات الموافقة" detail="إجراءات الدفع، الحذف، الحجز، الإرسال، ومشاركة البيانات الحساسة تتطلب موافقة صريحة." icon={ShieldCheck} />
      <ConfigItem title="حدود المكالمات" detail="تقرأ النسخة الحالية الرصيد قبل المهمة وتسجل الاستهلاك في VoiceAgentUsage." icon={Phone} />
      <ConfigItem title="قنوات النتيجة" detail="داخل المنصة جاهزة. WhatsApp وEmail وCalendar وCRM تبقى Mock حتى ربط مزود حقيقي." icon={Mail} />
      <ConfigItem title="الذاكرة وجهات الاتصال" detail="كل جهة اتصال مرتبطة بـuserId ولا تظهر لمستخدم آخر." icon={UserPlus} />
    </div>
  </ConfigShell>;
}

function ConfigShell({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#08111F] px-4 py-6 text-zinc-100 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <VoiceAgentNav />
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-200 ring-1 ring-cyan-400/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{title}</h1>
              <p className="mt-1 text-sm text-zinc-500">إدارة داخل الداشبورد، بدون تطبيق أو صفحة مستقلة.</p>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}

function ConfigItem({ title, detail, icon: Icon }: { title: string; detail: string; icon?: any }) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-4 ring-1 ring-white/10">
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-cyan-300" />}
        <b className="text-sm text-zinc-100">{title}</b>
      </div>
      <p className="text-xs leading-6 text-zinc-500">{detail}</p>
    </div>
  );
}
