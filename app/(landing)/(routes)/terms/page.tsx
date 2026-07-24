"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ScrollText,
  Search,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  ShieldAlert,
  BadgePercent,
  FileCode2,
  Wallet,
  AlertTriangle,
  Scale,
  Sparkles,
  Globe,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

export default function TermsPage() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  const sectionsAr: Section[] = [
    {
      id: "sec-1",
      title: "1. النطاق والموافقة على الأحكام (Overview & Agreement)",
      badge: "نطاق الاتفاقية",
      content: (
        <div className="space-y-4">
          <p>
            مرحباً بك في منصة <strong>Saad Studio</strong> (&quot;سعد ستوديو&quot;، &quot;المنصة&quot;، &quot;نحن&quot;). تُحدد اتفاقية شروط الاستخدام هذه (&quot;الشروط&quot;، &quot;الاتفاقية&quot;) الأحكام السارية على وصولك واستخدامك لموقعنا الإلكتروني (<a href="https://www.saadstudio.app" className="text-sky-400 hover:underline">saadstudio.app</a>)، وتطبيقاتنا، إضافة Premiere Pro (CEP Extension)، وأدوات التوليد عبر الذكاء الاصطناعي، وواجهات برمجة التطبيقات (APIs) التابعة لنا.
          </p>
          <p>
            بمجرد وصولك للخدمة أو إنشائك لحساب، فإنك تقر بأنك قرأت هذه الاتفاقية وفهمتها ووافقت على الالتزام بكافة بنودها. إذا كنت لا توافق على هذه الشروط، فلا يحق لك استخدام المنصة.
          </p>
        </div>
      ),
    },
    {
      id: "sec-2",
      title: "2. الأهلية وإنشاء الحساب (Eligibility & Registration)",
      badge: "أهلية الاستخدام",
      content: (
        <div className="space-y-4">
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>شرط السن:</strong> يجب أن تبلغ من العمر 18 عاماً على الأقل (أو سن الرشد القانوني في جمهورية العراق) لإبرام عقد ملزم معنا.</li>
            <li><strong>دقة البيانات:</strong> تلتزم بتقديم معلومات صحيحة ودقيقة وحديثة عند إنشاء الحساب، وحفظ بيانات تسجيل الدخول الخاصة بك بأمان.</li>
            <li><strong>مسؤولية الحساب:</strong> أنت المسؤول الكامل عن جميع الأنشطة والمعاملات التي تجري من خلال حسابك. يمنع مشاركة كلمات المرور أو فتح الحساب لأشخاص دون سن 18 عاماً.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-3",
      title: "3. تعهد التوليد المباشر وعدم تخزين الوسائط (Direct Generation & Zero Storage)",
      badge: "توليد مباشر بدون تخزين",
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl text-emerald-200 flex items-start gap-3">
            <EyeOff className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>تعهد عدم رؤية ومراجعة الوسائط:</strong> نؤكد صراحةً أن Saad Studio لا تخزن أي صورة أو فيديو خاص بأي شخص على سيرفراتها. <strong>التوليد يتم فورياً ومباشرة بينك وبين المزود المصدر، ولا يتم مراجعتها من قبل إدارة الموقع ولا نراها نهائياً تحت أي ظرف.</strong>
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>معالجة فورية ومباشرة:</strong> تُرسل الأوامر والمدخلات مباشرة إلى نماذج الذكاء الاصطناعي العالمية المعتمدة دون استضافة محلية للصور أو الفيديوهات.</li>
            <li><strong>عدم المراجعة البشرية:</strong> لا يمتلك أي موظف أو كادر فني صلاحية الاطلاع على الوسائط الخاصة بك أثناء أو بعد المعالجة.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-4",
      title: "4. الفحص الآلي والأخلاقي للمحتوى (Automated Ethical Content Moderation)",
      badge: "فحص أوتوماتيكي",
      content: (
        <div className="space-y-4">
          <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>فلترة برمجية آلية:</strong> تخضع جميع الصور المرفوعة والمدخلات النصية لفحص أوتوماتيكي مبرمج بالكامل كودياً. <strong>أي صورة تخدش الحياء العام أو تخالف المعايير الأخلاقية والآداب العامة يتم رفضها وحظرها أوتوماتيكياً بواسطة الكود دون أي تدخل بشري.</strong>
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>حظر المحتوى المخل:</strong> يمنع منعاً باتاً رفع أو توليد صور أو فيديوهات تخدش الحياء العام، أو تروج للعنف، أو تستغل القاصرين.</li>
            <li><strong>رفض آلي فوري:</strong> يقوم النظام بالرفض التلقائي وإحباط العملية فورياً دون حفظ الصورة أو عرضها على الإدارة.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-5",
      title: "5. سياسة الأسعار وتغيرات الموردين (Dynamic Pricing & Supplier Terms)",
      badge: "مرونة الأسعار",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl text-blue-200 flex items-start gap-3">
            <BadgePercent className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>الأسعار غير ثابتة دائمياً:</strong> الأسعار وتكاليف استهلاك الكريديت لكل نموذج ذكاء اصطناعي ليست ثابتة نهائياً (حتى في حال الاشتراك لمدة سنة)، وتخضع للتعديل والتغيير وفقاً لسياسات وأسعار الموردين والشركات العالمية المزودة.
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>الارتباط بأسعار المصدر:</strong> تعتمد تكلفة توليد الفيديو أو الصورة على الأسعار المباشرة المفروضة من المزودين العالميين (مثل Google, OpenAI, و BytePlus).</li>
            <li><strong>الاشتراكات السنوية:</strong> الاشتراك السنوي يضمن استمرار تفعيل الحساب والوصول للخدمات، بينما يخضع معدل استهلاك الكريديت للنموذج الواحد للتحديث في حال تعديل المورد الأصلي لتكاليف المعالجة.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-6",
      title: "6. الاشتراكات وطرق الدفع المحلية (Subscriptions & Local Iraqi Payments)",
      badge: "زين كاش وكي كارد",
      content: (
        <div className="space-y-4">
          <p>
            تتم عمليات سداد الاشتراك وتعبئة رصيد الكريديت في جمهورية العراق عبر وسائل الدفع المحلية المعتمدة:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <strong className="text-emerald-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> زين كاش (Zain Cash)
              </strong>
              <p className="text-xs text-slate-300">تحويل مالي مباشر وآمن عبر المحفظة الإلكترونية المعتمدة في العراق.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <strong className="text-amber-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> كي كارد الرافدين (Qi Card)
              </strong>
              <p className="text-xs text-slate-300">تسوية سريعة ومباشرة عبر بوابة كي كارد الرافدين المعتمدة.</p>
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>عدم تخزين أرقام البطاقات:</strong> لا يتم تخزين رموز الأمان أو أرقام الحسابات السرية على سيرفرات سعد ستوديو.</li>
            <li><strong>تجديد الاشتراكات:</strong> تتجدد الاشتراكات دورياً وفق الخطة المختارة، ويمكن للمستخدم طلب إلغاء التجديد التلقائي في أي وقت قبل حلول فترة الفوترة التالية.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-7",
      title: "7. نظام الكريديت والباقات (Credits & Top-Up Allocation)",
      badge: "وحدات التوليد",
      content: (
        <div className="space-y-4">
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>حساب الكريديت:</strong> الكريديت هو وحدة الاستهلاك الافتراضية للتوليد داخل المنصة. تختلف تكلفة الكريديت بحسب جودة ودقة النموذج ودقته والمدة الزمانية لإنتاج الفيديو أو الصورة.</li>
            <li><strong>عدم القابلية للاسترداد المالي:</strong> الكريديت المستهلك في عمليات التوليد المنجزة غير قابل للاسترداد المالي نظراً لتكبد المنصة لتكاليف معالجة فورية للمزودين العالميّين بمجرد بدء الطلب.</li>
            <li><strong>تعويض الأخطاء الفنية:</strong> في حال فشل عملية التوليد بسبب خطأ في السيرفر أو انقطاع تقني مثبت، يتم إعادة الكريديت أوتوماتيكياً لرصيد المستخدم.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-8",
      title: "8. استخدام إضافة Premiere Pro والتكامل المباشر (Premiere Pro CEP Integration)",
      badge: "إضافة المونتاج",
      content: (
        <div className="space-y-4">
          <p>تمنح المنصة ترخيصاً محدوداً لاستخدام إضافة Saad Studio المخصصة لبرنامج Adobe Premiere Pro (CEP Extension):</p>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>أدوات المونتاج الذكي:</strong> تشمل ميزات التبديل التلقائي للكاميرات المتعددة (Multi-Cam Auto Switch)، إزالة الفراغات والصمت (Silence Removal)، والتحليل الصوتي المستند إلى RMS و FFmpeg.</li>
            <li><strong>الربط مع Reap API:</strong> يعمل محرك Reaper بشكل منفصل عن مسار المونتاج داخل البرنامج لضمان الأداء التزمني المستقر.</li>
            <li><strong>الاستخدام المشروعة:</strong> يمنع الهندسة العكسية للإضافة أو التلاعب بمفاتيح الترخيص برمجياً.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-9",
      title: "9. تغيير واستبدال النماذج والميزات (Model Updates & Provider Swaps)",
      badge: "تحديث النماذج",
      content: (
        <div className="space-y-4">
          <p>تتطور نماذج الذكاء الاصطناعي بشكل مستمر. تحتفظ المنصة بالحق في إضافة أو تعديل أو ترقية أو استبدال أي نموذج ذكاء اصطناعي (من Google أو OpenAI أو BytePlus) بنموذج أحدث أو مكافئ لضمان أعلى جودة توليد ممكنة، دون اعتبار ذلك إخلالاً بالخدمة.</p>
        </div>
      ),
    },
    {
      id: "sec-10",
      title: "10. قواعد السلوك واستخدام المحتوى (User Conduct)",
      badge: "الاستخدام العادل",
      content: (
        <div className="space-y-4">
          <p>يتعهد المستخدم بعدم استخدام المنصة لأي من الأغراض المحظورة، بما في ذلك التزييف العميق غير التوافقي، أو التحايل على الفلاتر الأخلاقية المبرمجة كودياً.</p>
        </div>
      ),
    },
    {
      id: "sec-11",
      title: "11. حقوق الملكية الفكرية والاستخدام التجاري (Intellectual Property & Rights)",
      badge: "ملكية المحتوى",
      content: (
        <div className="space-y-4">
          <p>يمتلك المستخدم حقوق الاستخدام التجاري والشخصي للمخرجات الناتجة عن مدخلاته، بينما تظل جميع برمجيات وواجهات وسيرفرات Saad Studio مملوكة حصرياً للمنصة.</p>
        </div>
      ),
    },
    {
      id: "sec-12",
      title: "12. حذف الحساب والسياسة البيومترية (Account Erasure & Biometrics)",
      badge: "حذف البيانات",
      content: (
        <div className="space-y-4">
          <p>تتبع المنصة سياسة التدمير اللحظي (Zero Retention) للخصائص البصرية والصوتية المستخرجة مؤقتاً في الذاكرة الرامية (RAM) أثناء التوليد فقط.</p>
        </div>
      ),
    },
    {
      id: "sec-13",
      title: "13. إخلاء المسؤولية عن الضمانات (Disclaimer of Warranties)",
      badge: "إخلاء المسؤولية",
      content: (
        <div className="space-y-4">
          <p>تُقدم الخدمة ونماذج التوليد على أساس &quot;كما هي&quot; و &quot;حسب التوفر&quot; دون ضمانات ضمنية بشأن التغيرات غير المتوقعة لنماذج الذكاء الاصطناعي العالمية.</p>
        </div>
      ),
    },
    {
      id: "sec-14",
      title: "14. تحديد المسؤولية القانونية (Limitation of Liability)",
      badge: "الحد الأقصى للمسؤولية",
      content: (
        <div className="space-y-4">
          <p>يقتصر أقصى حد لمسؤولية المنصة القانونية على المبلغ الإجمالي الذي دفعه المستخدم خلال الأشهر الستة السابقة للواقعة وفقاً للقوانين العراقي النافذة.</p>
        </div>
      ),
    },
    {
      id: "sec-15",
      title: "15. القوة القاهرة وتوقف البنية التحتية (Force Majeure)",
      badge: "ظروف قاهرة",
      content: (
        <div className="space-y-4">
          <p>لا تتحمل المنصة مسؤولية التوقف الناتج عن انقطاعات شبكة الإنترنت العامة أو انقطاع واجهات برمجيات المنصات العالمية المزودة (Google, OpenAI, BytePlus).</p>
        </div>
      ),
    },
    {
      id: "sec-16",
      title: "16. التعويض وحماية المنصة (Indemnification)",
      badge: "التعويض",
      content: (
        <div className="space-y-4">
          <p>يتعهد المستخدم بتعويض المنصة ومسؤوليها من أي مطالبات تنشأ عن سوء استخدامه للخدمة أو مخالفته لهذه الشروط.</p>
        </div>
      ),
    },
    {
      id: "sec-17",
      title: "17. القانون الحاكم وحل النزاعات (Governing Law & Disputes)",
      badge: "القانون العراقي",
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-200 space-y-2">
            <strong className="text-sky-400 flex items-center gap-2">
              <Scale className="w-5 h-5" /> اختصاص محاكم بغداد
            </strong>
            <p>تخضع هذه الاتفاقية وتُفسر وفقاً للقوانين النافذة في <strong>جمهورية العراق</strong>. وتختص <strong>محاكم بغداد المحترمة</strong> حصرياً بالفصل في أي نزاع تنشأ عن أو تتصل بها.</p>
          </div>
        </div>
      ),
    },
    {
      id: "sec-18",
      title: "18. التحديثات والتواصل (Updates & Contact Us)",
      badge: "التواصل والدعم",
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 text-slate-200 space-y-2">
            <p><strong>Saad Studio - الفريق القانوني والدعم الفني</strong></p>
            <p>جمهورية العراق - بغداد</p>
            <p>البريد الإلكتروني للدعم: <a href="mailto:support@saadstudio.app" className="text-sky-400 hover:underline">support@saadstudio.app</a></p>
            <p>استفسارات الخصوصية: <a href="mailto:privacy@saadstudio.app" className="text-sky-400 hover:underline">privacy@saadstudio.app</a></p>
            <p>الموقع الرسمي: <a href="https://www.saadstudio.app" className="text-sky-400 hover:underline">https://www.saadstudio.app</a></p>
          </div>
          <p className="text-slate-400 text-xs pt-4">
            Saad Studio. جميع الحقوق محفوظة. منصة مونتاج وتوليد بالذكاء الاصطناعي.
          </p>
        </div>
      ),
    },
  ];

  const sectionsEn: Section[] = [
    {
      id: "sec-1",
      title: "1. Overview & Agreement",
      badge: "Agreement Scope",
      content: (
        <div className="space-y-4">
          <p>Welcome to <strong>Saad Studio</strong> (&quot;the Platform&quot;, &quot;we&quot;). These Terms of Use govern your access to our website (<a href="https://www.saadstudio.app" className="text-sky-400 hover:underline">saadstudio.app</a>), applications, Premiere Pro CEP Extension, and AI generation tools operating directly with global AI providers such as <strong>Google</strong>, <strong>OpenAI</strong>, and <strong>BytePlus</strong>.</p>
        </div>
      ),
    },
    {
      id: "sec-2",
      title: "2. Eligibility & Registration",
      badge: "Eligibility",
      content: (
        <div className="space-y-4">
          <p>You must be at least 18 years old (or the legal age of majority in Iraq) to form a binding contract with us. Account credentials must be safeguarded securely.</p>
        </div>
      ),
    },
    {
      id: "sec-3",
      title: "3. Direct Generation & Zero Storage",
      badge: "Zero Local Hosting",
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl text-emerald-200 flex items-start gap-3">
            <EyeOff className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Non-Inspection Guarantee:</strong> Saad Studio does not store user photos or videos on site servers. Generations stream directly with source providers, and site administration never views or reviews user media under any circumstances.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-4",
      title: "4. Automated Ethical Content Moderation",
      badge: "Code Moderation",
      content: (
        <div className="space-y-4">
          <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Automated Ethical Filtering:</strong> All input uploads undergo automated real-time code moderation. Any content violating public decency is blocked automatically without human inspection.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-5",
      title: "5. Dynamic Pricing & Supplier Terms",
      badge: "Variable Pricing",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl text-blue-200 flex items-start gap-3">
            <BadgePercent className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Non-Fixed Pricing:</strong> Prices and credit costs per model are non-fixed (even for annual subscriptions) and fluctuate according to upstream AI suppliers&apos; (Google, OpenAI, BytePlus) compute rates.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-6",
      title: "6. Subscriptions & Local Iraqi Payments",
      badge: "Zain Cash & Qi Card",
      content: (
        <div className="space-y-4">
          <p>Subscriptions and credit top-ups are processed via authorized Iraqi payment channels: <strong>Zain Cash</strong> and <strong>Qi Card Al-Rafidain</strong>. Bank PINs and security codes are never stored on our servers.</p>
        </div>
      ),
    },
    {
      id: "sec-7",
      title: "7. Credits & Allocation",
      badge: "Credit Balance",
      content: (
        <div className="space-y-4">
          <p>Credits represent virtual consumption units deducted upon submitting generation requests. Used credits for completed generations are non-refundable.</p>
        </div>
      ),
    },
    {
      id: "sec-8",
      title: "8. Premiere Pro CEP Integration",
      badge: "Editing Extension",
      content: (
        <div className="space-y-4">
          <p>Includes limited licensing for our Adobe Premiere Pro CEP extension, featuring Multi-Cam Auto Switch, Silence Removal, and Reap API integration.</p>
        </div>
      ),
    },
    {
      id: "sec-9",
      title: "9. Model Updates & Provider Swaps",
      badge: "Model Swaps",
      content: (
        <div className="space-y-4">
          <p>We reserve the right to upgrade, swap, or modify underlying AI models (from Google, OpenAI, or BytePlus) to ensure optimal generation quality.</p>
        </div>
      ),
    },
    {
      id: "sec-10",
      title: "10. User Conduct",
      badge: "Fair Usage",
      content: (
        <div className="space-y-4">
          <p>Prohibits illegal activities, non-consensual deepfakes, bypassing ethical filters, or scraping platform infrastructure.</p>
        </div>
      ),
    },
    {
      id: "sec-11",
      title: "11. Intellectual Property & Commercial Use",
      badge: "IP Ownership",
      content: (
        <div className="space-y-4">
          <p>Users retain full commercial and personal rights to generated outputs from their inputs, while Saad Studio retains ownership of its platform software.</p>
        </div>
      ),
    },
    {
      id: "sec-12",
      title: "12. Account Erasure & Biometrics",
      badge: "Data Erasure",
      content: (
        <div className="space-y-4">
          <p>Enforces zero retention RAM processing for facial and voice features. Account metadata is permanently deleted upon closure request.</p>
        </div>
      ),
    },
    {
      id: "sec-13",
      title: "13. Disclaimer of Warranties",
      badge: "Disclaimer",
      content: (
        <div className="space-y-4">
          <p>Services are provided &quot;as is&quot; without implied warranties regarding AI provider server outages.</p>
        </div>
      ),
    },
    {
      id: "sec-14",
      title: "14. Limitation of Liability",
      badge: "Liability Limit",
      content: (
        <div className="space-y-4">
          <p>Maximum aggregate liability is strictly capped at the total amount paid by the user in the preceding 6 months under applicable Iraqi laws.</p>
        </div>
      ),
    },
    {
      id: "sec-15",
      title: "15. Force Majeure",
      badge: "Force Majeure",
      content: (
        <div className="space-y-4">
          <p>Covers disruptions caused by global internet outages, cyberattacks, or upstream provider API outages (Google, OpenAI, BytePlus).</p>
        </div>
      ),
    },
    {
      id: "sec-16",
      title: "16. Indemnification",
      badge: "Indemnification",
      content: (
        <div className="space-y-4">
          <p>Users agree to indemnify Saad Studio against claims arising from policy violations or misuse.</p>
        </div>
      ),
    },
    {
      id: "sec-17",
      title: "17. Governing Law & Dispute Resolution",
      badge: "Iraqi Jurisdiction",
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-200 space-y-2">
            <strong className="text-sky-400 flex items-center gap-2">
              <Scale className="w-5 h-5" /> Baghdad Courts Jurisdiction
            </strong>
            <p>Governed exclusively by the laws of the <strong>Republic of Iraq</strong>. Competent <strong>Courts of Baghdad</strong> hold sole jurisdiction over disputes.</p>
          </div>
        </div>
      ),
    },
    {
      id: "sec-18",
      title: "18. Updates & Contact Us",
      badge: "Support Contact",
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 text-slate-200 space-y-2">
            <p><strong>Saad Studio - Legal & Support Team</strong></p>
            <p>Baghdad, Republic of Iraq</p>
            <p>Support Email: <a href="mailto:support@saadstudio.app" className="text-sky-400 hover:underline">support@saadstudio.app</a></p>
            <p>Privacy Email: <a href="mailto:privacy@saadstudio.app" className="text-sky-400 hover:underline">privacy@saadstudio.app</a></p>
            <p>Official Website: <a href="https://www.saadstudio.app" className="text-sky-400 hover:underline">https://www.saadstudio.app</a></p>
          </div>
          <p className="text-slate-400 text-xs pt-4">
            Saad Studio. All rights reserved. AI Video & Creative Platform.
          </p>
        </div>
      ),
    },
  ];

  const currentSections = lang === "ar" ? sectionsAr : sectionsEn;

  const filteredSections = currentSections.filter(
    (sec) =>
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.badge?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 py-16 px-4 md:px-8 ${
        lang === "ar" ? "dir-rtl text-right" : "dir-ltr text-left"
      }`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto space-y-12">

        {/* ── Language Switcher & Header ────────────────────────────── */}
        <motion.div
          className="text-center space-y-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Language Toggle Bar */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-full shadow-inner">
              <button
                onClick={() => setLang("ar")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  lang === "ar"
                    ? "bg-sky-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> العربية
              </button>
              <button
                onClick={() => setLang("en")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  lang === "en"
                    ? "bg-sky-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> English
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold tracking-wider uppercase">
            <ScrollText className="w-4 h-4" />{" "}
            {lang === "ar"
              ? "شروط وتراخيص الاستخدام - Saad Studio"
              : "Terms of Use Agreement - Saad Studio"}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">
            {lang === "ar" ? "اتفاقية شروط الاستخدام" : "Terms of Use Agreement"}
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
            {lang === "ar"
              ? "تحدد هذه الاتفاقية الأحكام والقواعد القانونية المنظمة لاستخدامك لمنصة Saad Studio وإضافة Premiere Pro وأدوات التوليد عبر الذكاء الاصطناعي في جمهورية العراق."
              : "These Terms of Use govern your access to Saad Studio, Premiere Pro CEP Extension, and AI generation tools in the Republic of Iraq."}
          </p>
        </motion.div>

        {/* ── Three Callout Banners Grid ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="bg-emerald-950/50 border border-emerald-800/70 p-5 rounded-2xl text-emerald-100 space-y-2 flex items-start gap-3 shadow-xl">
            <EyeOff className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                {lang === "ar" ? "تعهد التوليد المباشر وعدم التخزين" : "Direct Generation & Zero Storage"}
              </h3>
              <p className="text-xs text-emerald-200 leading-relaxed">
                {lang === "ar"
                  ? "نحن لا نخزن أي صورة أو فيديو خاص بك على سيرفراتنا. التوليد يتم مباشرة مع المصدر دون مراجعة أو مشاهدة من قِبل الإدارة."
                  : "User media is not stored on site servers. Generations process directly with source models without admin viewing."}
              </p>
            </div>
          </div>

          <div className="bg-amber-950/50 border border-amber-800/70 p-5 rounded-2xl text-amber-100 space-y-2 flex items-start gap-3 shadow-xl">
            <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                {lang === "ar" ? "فحص أوتوماتيكي مبرمج للمحتوى" : "Automated Code Moderation"}
              </h3>
              <p className="text-xs text-amber-200 leading-relaxed">
                {lang === "ar"
                  ? "تخضع جميع الصور المرفوعة لفحص مبرمج أوتوماتيكياً. أي صورة تخدش الحياء العام يتم حظرها آلياً بواسطة الكود دون تدخل بشري."
                  : "All uploads undergo automated code screening. Indecent content is blocked programmatically without human review."}
              </p>
            </div>
          </div>

          <div className="bg-blue-950/50 border border-blue-800/70 p-5 rounded-2xl text-blue-100 space-y-2 flex items-start gap-3 shadow-xl">
            <BadgePercent className="w-7 h-7 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                {lang === "ar" ? "مرونة الأسعار حسب تغيرات الموردين" : "Dynamic Supplier Rates"}
              </h3>
              <p className="text-xs text-blue-200 leading-relaxed">
                {lang === "ar"
                  ? "الأسعار وتكلفة الكريديت لكل نموذج غير ثابتة دائمياً (حتى للاشتراك السنوي) وتتغير حسب سياسات المزودين العالميّين (Google, OpenAI, BytePlus)."
                  : "Prices and credit costs per model are non-fixed and fluctuate based on source provider compute rates."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Search Bar ───────────────────────────────────────────── */}
        <div className="max-w-xl mx-auto relative">
          <Search className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${lang === "ar" ? "right-4" : "left-4"}`} />
          <input
            type="text"
            placeholder={
              lang === "ar"
                ? "ابحث في بنود اتفاقية الشروط (مثال: زين كاش، كي كارد، محاكم بغداد، التوليد المباشر)..."
                : "Search terms (e.g. Zain Cash, Baghdad Courts, Direct generation)..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-slate-900/90 border border-slate-800 rounded-xl py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors shadow-inner ${
              lang === "ar" ? "pr-12 pl-4" : "pl-12 pr-4"
            }`}
          />
        </div>

        {/* ── Main Layout: Sidebar & Content ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Sticky Table of Contents Sidebar */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md sticky top-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <ScrollText className="w-4 h-4" /> {lang === "ar" ? "فهرس الشروط" : "Terms Index"}
              </span>
              <span className="text-xs text-slate-500">{currentSections.length} {lang === "ar" ? "بنود" : "Sections"}</span>
            </div>

            <nav className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {currentSections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`group flex items-center justify-between text-xs py-2.5 px-3 rounded-lg transition-all ${
                    activeSection === sec.id
                      ? "bg-sky-600/20 text-sky-300 font-semibold border border-sky-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span className="truncate pr-2">{sec.title}</span>
                  <ChevronRight className={`w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ${lang === "ar" ? "rotate-180" : ""}`} />
                </a>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-900/40 text-xs text-emerald-300 flex items-center gap-3">
                <EyeOff className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{lang === "ar" ? "التوليد المباشر وعدم تخزين الوسائط محمي" : "Direct Generation & Zero Storage Active"}</span>
              </div>
              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-900/40 text-xs text-amber-300 flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{lang === "ar" ? "الفحص الأخلاقي المبرمج آلياً فعال" : "Automated Code Moderation Active"}</span>
              </div>
              <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-900/40 text-xs text-blue-300 flex items-center gap-3">
                <BadgePercent className="w-4 h-4 shrink-0 text-blue-400" />
                <span>{lang === "ar" ? "تسعير الموردين (Google, OpenAI, BytePlus)" : "Global Supplier Rates (Google, OpenAI, BytePlus)"}</span>
              </div>
            </div>
          </div>

          {/* Main Content Sections */}
          <div className="lg:col-span-8 space-y-8">
            {filteredSections.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
                {lang === "ar"
                  ? `لم نجد بنوداً تطابق بحثك "${searchQuery}".`
                  : `No terms matching "${searchQuery}".`}
              </div>
            ) : (
              filteredSections.map((sec, idx) => (
                <motion.div
                  key={sec.id}
                  id={sec.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-6 md:p-8 backdrop-blur-sm space-y-4 hover:border-slate-700/60 transition-colors shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <h2 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                      {sec.title}
                    </h2>
                    {sec.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-slate-800 text-sky-300 border border-slate-700 shrink-0">
                        {sec.badge}
                      </span>
                    )}
                  </div>

                  <div className="prose prose-invert prose-slate max-w-none text-slate-300 text-sm md:text-base leading-relaxed">
                    {sec.content}
                  </div>
                </motion.div>
              ))
            )}

            {/* Bottom Footer Callout */}
            <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-sky-950/40 border border-sky-800/40 p-6 md:p-8 rounded-2xl text-center space-y-3">
              <h3 className="text-base md:text-lg font-bold text-slate-100">
                {lang === "ar" ? "هل تحتاج توضيحاً إضافياً حول شروط الاستخدام؟" : "Need Additional Clarification on Terms?"}
              </h3>
              <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
                {lang === "ar"
                  ? "الفريق القانوني والدعم الفني في Saad Studio متاح للإجابة على جميع الاستفسارات."
                  : "The legal & technical support team at Saad Studio is available for assistance."}
              </p>
              <div className="pt-2">
                <a
                  href="mailto:support@saadstudio.app"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs md:text-sm transition-all shadow-lg shadow-sky-600/25"
                >
                  {lang === "ar" ? "مراسلة الفريق القانوني" : "Contact Legal Team"}
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
