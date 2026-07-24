"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Search,
  ArrowUpRight,
  Lock,
  FileText,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  ShieldAlert,
  BadgePercent,
  Globe,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

export default function PrivacyPage() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  const sectionsAr: Section[] = [
    {
      id: "sec-1",
      title: "1. نظرة عامة ونطاق الخدمة (Overview & Scope)",
      badge: "نطاق الخدمة",
      content: (
        <div className="space-y-4">
          <p>
            تلتزم منصة <strong>Saad Studio</strong> (المشار إليها بـ &quot;المنصة&quot; أو &quot;نحن&quot;) بحماية خصوصية وأمان بيانات مستخدمينا في جمهورية العراق والمنطقة. توضح سياسة الخصوصية هذه كيفية جمع، استخدام، وحماية البيانات عند استخدامك لموقعنا الإلكتروني، تطبيقاتنا، إضافة Premiere Pro (CEP Extension)، وأدوات التوليد بالذكاء الاصطناعي التي تعتمد على المعالجة المباشرة مع المنصات العالمية مثل <strong>Google</strong> و <strong>OpenAI</strong> و <strong>BytePlus</strong>.
          </p>
          <p>
            باستخدامك لخدمات المنصة، فإنك توافق على ممارسات التعامل الآمن مع البيانات الموضحة في هذه السياسة.
          </p>
        </div>
      ),
    },
    {
      id: "sec-2",
      title: "2. التعامل المباشر وعدم تخزين الوسائط (Direct Generation & Zero Media Storage)",
      badge: "توليد مباشر بدون تخزين",
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl text-emerald-200 flex items-start gap-3">
            <EyeOff className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>تعهد بعدم الرؤية والمراجعة البشرية:</strong> جميع عمليات التوليد والمعالجة للصور والفيديوهات تتم فورياً ومباشرة بين جهازك والمزود العالمي المصدر. <strong>لا يتم تخزين أي صورة أو فيديو خاص بأي شخص، ولا يتم مراجعتها من قبل إدارة الموقع ولا نراها نهائياً تحت أي ظرف.</strong>
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>عدم تخزين الصور والفيديوهات:</strong> نحن لا نحتفظ ولا نخزن وسائط المستخدمين (الصور والفيديوهات المرفوعة أو المولدة) على سيرفراتنا.</li>
            <li><strong>معالجة مباشرة من المصدر:</strong> يتم التوليد والتعديل تلقائياً بين واجهة المستخدم والنموذج المزود مباشرة ودون استضافة محلية للوسائط.</li>
            <li><strong>خصوصية سرية ومطلقة:</strong> لا يمتلك أي عضو في إدارة الموقع أو الفريق الفني القدرة أو الصلاحية للاطلاع أو مشاهدة أو مراجعة صور وفيديوهات المستخدمين.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-3",
      title: "3. الفحص الآلي والأخلاقي للمحتوى (Automated Ethical Content Moderation)",
      badge: "فحص أوتوماتيكي",
      content: (
        <div className="space-y-4">
          <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>نظام فحص مبرمج أوتوماتيكياً:</strong> تحتوي المنصة على فلتر برمجي آلي لفحص المحتوى والمدخلات فورياً من الناحية الأخلاقية والشرعية والآداب العامة. <strong>أي صورة تخدش الحياء العام أو تخالف المعايير الأخلاقية يتم رفضها وحظرها أوتوماتيكياً بواسطة الكود دون أي تدخل بشري.</strong>
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>فحص برمجي أوتوماتيكي:</strong> تخضع جميع الصور المرفوعة والأوامر التوجيهية (Prompts) لفلترة آلية برمجيّة مسبقة فور إرسالها.</li>
            <li><strong>رفض وحظر فوري:</strong> في حال اكتشاف النظام الآلي لأي محتوى يخدش الحياء أو يخالف الآداب العامة، يقوم النظام برفض المعاملة فوراً وإظهار تنبيه للمستخدم دون حفظ الصورة أو إرسالها.</li>
            <li><strong>معالجة خوارزمية بدون مراجعة بشرية:</strong> عملية الفحص والفلترة تم برمجتها وتطويرها خوارزمياً بالكامل لتتم أوتوماتيكياً ودون أي مراجعة يدوية أو بشرية من الفريق الفني.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-4",
      title: "4. سياسة الأسعار وتغيرات الموردين (Dynamic Pricing & Supplier Policies)",
      badge: "سياسة الأسعار",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl text-blue-200 flex items-start gap-3">
            <BadgePercent className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>الأسعار وتكلفة التوليد غير ثابتة:</strong> الأسعار وتكاليف استهلاك الكريديت لكل نموذج ذكاء اصطناعي قابلة للتعديل والتغيير وليست ثابتة دائمياً (حتى في حال الاشتراك لمدة سنة)، وذلك بناءً على سياسات وتغيرات أسعار الموردين والشركات العالمية المزودة.
            </div>
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>الارتباط بسياسات الموردين:</strong> تعتمد تكلفة التوليد لكل فيديو أو صورة أو صوت بشكل مباشر على التكاليف المفروضة من المزودين العالميين (مثل Google, OpenAI, و BytePlus).</li>
            <li><strong>مرونة الأسعار في الاشتراكات:</strong> الاشتراك السنوي يضمن استمرار الخدمة والوصول للأدوات، ولكن تكلفة الكريديت أو تسعير استهلاك النماذج قد تختلف وتتعدل تبعاً لتغير أسعار وتحديثات الموردين الأصليين.</li>
            <li><strong>الشفافية والتحديث:</strong> تُعرض تكلفة الكريديت الحالية لكل نموذج بوضوح داخل واجهات التوليد قبل التأكيد والإنتاج.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-5",
      title: "5. البيانات التي يتم التعامل معها (Information Handled)",
      badge: "جمع البيانات",
      content: (
        <div className="space-y-4">
          <p><strong>5.1. البيانات التي تزودنا بها مباشرة:</strong></p>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>بيانات الحساب والملف الشخصي:</strong> الاسم، البريد الإلكتروني، اسم المستخدم، كلمة المرور المشفرة، والصورة الشخصية.</li>
            <li><strong>بيانات الدفع والاشتراك:</strong> تفاصيل المعاملات المالية ورصيد الكريديت وسجل الاشتراكات. يتم معالجة عمليات التحويل والدفع إلكترونياً من خلال وسائل الدفع المحلية المعتمدة في العراق مثل <strong>زين كاش (Zain Cash)</strong> و <strong>كي كارد الرافدين (Qi Card)</strong>. لا نقوم بتخزين أرقام البطاقات السريّة أو رموز الأمان الخاصة بحسابك البنكي على سيرفراتنا.</li>
            <li><strong>الأوامر والنصوص (Prompts & Queries):</strong> النصوص والأوامر التوجيهية وسيناريوهات الهوك ستوديو والمعلمات السينمائية التي تدير بها نماذج الذكاء الاصطناعي العالمية.</li>
            <li><strong>بيانات التواصل والدعم:</strong> الرسائل والاستفسارات والملاحظات التي ترسلها لفريق الدعم الفني.</li>
          </ul>
          <p><strong>5.2. بيانات تسجيل الدخول عبر طرف ثالث:</strong> عند تسجيل الدخول باستخدام حساب Google، نجمع اسم الحساب والبريد الإلكتروني والصورة الشخصية وفقاً لإعدادات حسابك وشروط الاستخدام الآمن لـ Google API.</p>
          <p><strong>5.3. البيانات الفنية التلقائية:</strong> نجمع معلومات الجهاز ونوع المتصفح، نظام التشغيل، عنوان IP، وسجلات الأداء والتشخيص لضمان استقرار الخدمة وأمانها.</p>
        </div>
      ),
    },
    {
      id: "sec-6",
      title: "6. معالجة الوجوه والأصوات (Facial & Voice Media Processing)",
      badge: "حماية بيومترية",
      content: (
        <div className="space-y-4">
          <div className="bg-violet-950/40 border border-violet-800/50 p-4 rounded-xl text-violet-200">
            <strong>معالجة لحظية بدون تخزين بيومتري:</strong> عند استخدام أدوات الذكاء الاصطناعي التي تتطلب مطابقة الوجوه أو دمج الأصوات (Lip-Sync / Voice Synthesis / Face Reference)، تتم المعالجة بشكل مؤقت جداً في الذاكرة الرامية أثناء المعالجة وتتدمر فوراً.
          </div>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>الغرض الفني:</strong> تُستخدم الصور والأصوات المرفوعة حصرياً لإنجاز التوليد والتعديل المباشر الذي يطلبه المستخدم في تلك الجلسة فقط.</li>
            <li><strong>الحذف الفوري (Zero Retention):</strong> يتم استخراج الخصائص البصرية والصوتية مؤقتاً في الذاكرة الرامية (RAM) أثناء التوليد، وتُدمر فوراً بمجرد انتهاء عملية التوليد المباشرة.</li>
            <li><strong>لا مراجعة ولا تخزين:</strong> لا يتم الاطلاع على الصور أو مراجعتها من قبل إدارة المنصة نهائياً.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-7",
      title: "7. كيف نستخدم بيانات الحساب (How We Use Account Information)",
      badge: "استخدام البيانات",
      content: (
        <div className="space-y-4">
          <p>نستخدم بيانات الحساب والتقنية للأغراض التشغيلية التالية:</p>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>تقديم وتشغيل الخدمة:</strong> توجيه الأوامر وتوليد الفيديوهات والصور والأصوات عبر المنصات العالمية مباشرة (مثل Google Gemini, OpenAI, و BytePlus)، وتشغيل إضافة Premiere Pro، وإدارة رصيد الحساب والاشتراكات.</li>
            <li><strong>تخصيص التجربة:</strong> حفظ تفاصيل الإعدادات المفضلة، أنماط الـ Style، والمراجع النصية لسهولة الوصول إليها.</li>
            <li><strong>تحسين جودة الخدمة وأمانها:</strong> مراقبة استقرار السيرفرات، تطبيق الفلاتر الأخلاقية المبرمجة آلياً، منع الاحتيال أو الاستخدام المسيء، وتطوير خوارزميات المنصة.</li>
            <li><strong>التواصل والإشعارات:</strong> إرسال تحديثات النظام، تنبيهات الأمان، وتفاصيل الحساب.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-8",
      title: "8. سياسة عدم التخزين وحذف الحساب (Zero Storage & Account Erasure)",
      badge: "حذف الحساب",
      content: (
        <div className="space-y-4">
          <p><strong>8.1. التوليد المباشر وعدم الاستضافة:</strong> بما أن المعالجة تتم مباشرة مع المزودين العالميّين، فإن المنصة لا تستضيف ولا تخزن ملفات الفيديوهات أو الصور الخاصة بالعملاء.</p>
          <p><strong>8.2. حذف الحساب:</strong></p>
          <ul className="list-disc pr-6 space-y-2">
            <li>عند طلب إغلاق الحساب نهائياً، يتم مسح بيانات حسابك الشخصية وسجل الأوامر بالكامل من أنظمتنا النشطة.</li>
            <li>تُستثنى البيانات التي يتطلب القانون الاحتفاظ بها لأغراض محاسبية أو ضريبية.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-9",
      title: "9. مشاركة البيانات مع الأطراف الثالثة (Data Sharing)",
      badge: "المزودون والمعالجون",
      content: (
        <div className="space-y-4">
          <p>لا نبيع بياناتك الشخصية لأي طرف. نرسل الأوامر والمدخلات فقط في الحدود الضرورية لتشغيل التوليد المباشر مع:</p>
          <ul className="list-disc pr-6 space-y-2">
            <li><strong>مزودي الذكاء الاصطناعي والتوليد المباشر:</strong> المنصات العالمية المعتمدة (مثل <strong>Google Cloud & Gemini</strong> و <strong>OpenAI</strong> و <strong>BytePlus</strong>) اللازمة لتوليد الفيديوهات والصور فورياً.</li>
            <li><strong>خدمات وسائل التحويل والدفع المحلي:</strong> قنوات الدفع والتسوية المالية الآمنة المعتمدة في العراق المتمثلة بـ <strong>زين كاش (Zain Cash)</strong> و <strong>كي كارد الرافدين (Qi Card)</strong> لتأكيد اشتراكات وشحن رصيد الكريديت.</li>
            <li><strong>الجهات القانونية:</strong> عند وجود طلب قانوني ملزم أو لحماية أمان المنصة والمستخدمين من أي نشاط غير مشروع.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-10",
      title: "10. حماية وأمان البيانات (Security Safeguards)",
      badge: "الأمان والحماية",
      content: (
        <div className="space-y-4">
          <p>نطبق أعلى إجراءات الأمان التقنية والتنظيمية لحماية بياناتك من الوصول غير المصرح به، بما في ذلك تشفير التوصيل عبر بروتوكولات (TLS 1.3)، وتشفير التخزين (AES-256)، وفرض قيود صارمة على صلاحيات الوصول للسيرفرات.</p>
        </div>
      ),
    },
    {
      id: "sec-11",
      title: "11. حقوق التحكم وحيارات المستخدم (User Choices & Rights)",
      badge: "تحكم المستخدم",
      content: (
        <div className="space-y-4">
          <p>يحق لجميع مستخدمي Saad Studio:</p>
          <ul className="list-disc pr-6 space-y-2">
            <li>الوصول إلى بيانات حسابهم وتحديثها من خلال إعدادات الحساب.</li>
            <li>طلب حذف الحساب نهائياً عبر التواصل مع فريق الدعم والخصوصية.</li>
            <li>إلغاء الاشتراك في الرسائل التسويقية والإشعارات غير الأساسية.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-12",
      title: "12. حماية القاصرين (Minors Policy)",
      badge: "فئة الاستخدام",
      content: (
        <div className="space-y-4">
          <p>خدمات منصة Saad Studio مخصصة للمستخدمين الذين يبلغون من العمر <strong>18 عاماً أو أكثر</strong>. لا نجمع عمداً أي بيانات شخصية من القاصرين. إذا تبين لنا جمع بيانات شخصية لشخص دون سن 18 عاماً، فسنقوم باتخاذ الخطوات الفورية لمسح تلك البيانات.</p>
        </div>
      ),
    },
    {
      id: "sec-13",
      title: "13. التحديثات والتواصل (Updates & Contact Us)",
      badge: "التواصل الدعم",
      content: (
        <div className="space-y-4">
          <p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر لتعكس التطورات الفنية أو التشغيلية. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال تنبيه داخل المنصة.</p>
          <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 text-slate-200 space-y-2">
            <p><strong>Saad Studio - فريق الخصوصية والدعم الفني</strong></p>
            <p>جمهورية العراق - بغداد</p>
            <p>البريد الإلكتروني للخصوصية: <a href="mailto:privacy@saadstudio.app" className="text-violet-400 hover:underline">privacy@saadstudio.app</a></p>
            <p>الدعم الفني والاستفسارات: <a href="mailto:support@saadstudio.app" className="text-violet-400 hover:underline">support@saadstudio.app</a></p>
            <p>الموقع الرسمي: <a href="https://www.saadstudio.app" className="text-violet-400 hover:underline">https://www.saadstudio.app</a></p>
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
      title: "1. Overview & Scope",
      badge: "Scope of Service",
      content: (
        <div className="space-y-4">
          <p>
            <strong>Saad Studio</strong> (&quot;the Platform&quot; or &quot;we&quot;) is committed to protecting the privacy and security of our users in the Republic of Iraq and the region. This Privacy Policy describes how we collect, use, and safeguard data when you use our website, applications, Premiere Pro CEP Extension, and AI generation tools operating via direct processing with global AI providers such as <strong>Google</strong>, <strong>OpenAI</strong>, and <strong>BytePlus</strong>.
          </p>
          <p>By using the Platform, you consent to the secure data practices described in this policy.</p>
        </div>
      ),
    },
    {
      id: "sec-2",
      title: "2. Direct Generation & Zero Media Storage",
      badge: "Zero Local Media Hosting",
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl text-emerald-200 flex items-start gap-3">
            <EyeOff className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Strict Non-Inspection Guarantee:</strong> All media generation and processing occur directly in real time between your device and upstream global source providers. <strong>Saad Studio does not store user photos or videos on site servers. Platform administration and staff never view or review user media under any circumstances.</strong>
            </div>
          </div>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Zero Media Storage:</strong> User photos and videos (uploaded or generated) are not retained or hosted on our local servers.</li>
            <li><strong>Direct Source AI Stream:</strong> Processing streams directly between user interfaces and source AI models without local intermediary hosting.</li>
            <li><strong>Absolute Confidentiality:</strong> No administrator or technician has access or authorization to view or review user images or videos.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-3",
      title: "3. Automated Ethical Content Moderation",
      badge: "Programmatic Filtering",
      content: (
        <div className="space-y-4">
          <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Automated Code Moderation:</strong> All input prompts and media uploads undergo real-time automated programmatic ethical screening. <strong>Any content violating public decency, morals, or ethical standards is automatically rejected and blocked by code algorithms without human intervention.</strong>
            </div>
          </div>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Automated Screening:</strong> Uploads and prompt requests are filtered programmatically before processing.</li>
            <li><strong>Instant Automatic Block:</strong> Violating content is rejected immediately by automated filters without saving or submitting the media.</li>
            <li><strong>No Manual Review:</strong> Moderation is fully automated algorithmically without manual inspection by staff.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-4",
      title: "4. Dynamic Pricing & Supplier Policies",
      badge: "Variable Pricing",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl text-blue-200 flex items-start gap-3">
            <BadgePercent className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Non-Fixed Credit & Model Pricing:</strong> Subscription prices, credit packages, and per-model generation credit costs are variable and not permanently fixed (even for annual subscriptions), as they depend directly on upstream AI suppliers&apos; (Google, OpenAI, BytePlus) compute costs and pricing policy updates.
            </div>
          </div>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Tied to Source Providers:</strong> Generation costs per video, image, or audio fluctuate based on compute rates charged by global providers.</li>
            <li><strong>Annual Subscription Terms:</strong> Annual subscriptions guarantee account activation and tool access; credit consumption rates per model remain subject to adjustments if supplier compute costs change.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-5",
      title: "5. Information Handled",
      badge: "Data Collection",
      content: (
        <div className="space-y-4">
          <p><strong>5.1. Directly Provided Data:</strong> Account details, username, encrypted password, prompts, and local payment records via authorized Iraqi channels: <strong>Zain Cash</strong> and <strong>Qi Card Al-Rafidain</strong>. Secret banking codes and card PINs are never stored on our servers.</p>
          <p><strong>5.2. Third-Party Login Data:</strong> Account name and email retrieved via secure Google Auth APIs.</p>
          <p><strong>5.3. Technical Log Data:</strong> Diagnostic metadata, browser type, IP address, and system stability records.</p>
        </div>
      ),
    },
    {
      id: "sec-6",
      title: "6. Facial & Voice Media Processing",
      badge: "Biometric Safeguards",
      content: (
        <div className="space-y-4">
          <div className="bg-violet-950/40 border border-violet-800/50 p-4 rounded-xl text-violet-200">
            <strong>Zero Retention RAM Processing:</strong> Facial references and audio feature extractions occur transiently in volatile RAM during active generation and are destroyed immediately upon task completion.
          </div>
        </div>
      ),
    },
    {
      id: "sec-7",
      title: "7. How We Use Account Information",
      badge: "Account Usage",
      content: (
        <div className="space-y-4">
          <p>We use account and technical data strictly for operational service delivery, running the Premiere Pro extension, maintaining credit balances, enforcing automated safety moderation, and communicating account updates.</p>
        </div>
      ),
    },
    {
      id: "sec-8",
      title: "8. Zero Storage & Account Erasure",
      badge: "Account Deletion",
      content: (
        <div className="space-y-4">
          <p>Media is processed directly with source providers without local hosting. Upon permanent account closure requests, personal account metadata and prompt histories are erased from active databases within 30 days.</p>
        </div>
      ),
    },
    {
      id: "sec-9",
      title: "9. Data Sharing",
      badge: "Service Partners",
      content: (
        <div className="space-y-4">
          <p>We do not sell personal data. Prompts and generation parameters are transmitted strictly to global AI providers (<strong>Google Cloud & Gemini</strong>, <strong>OpenAI</strong>, and <strong>BytePlus</strong>) and authorized local Iraqi payment channels (<strong>Zain Cash</strong> and <strong>Qi Card Al-Rafidain</strong>).</p>
        </div>
      ),
    },
    {
      id: "sec-10",
      title: "10. Security Safeguards",
      badge: "Data Security",
      content: (
        <div className="space-y-4">
          <p>We enforce robust technical safeguards including TLS 1.3 transport encryption, AES-256 storage encryption, and strict server access controls.</p>
        </div>
      ),
    },
    {
      id: "sec-11",
      title: "11. User Choices & Rights",
      badge: "User Control",
      content: (
        <div className="space-y-4">
          <p>Users have the right to access and update account information, request permanent account erasure, and opt out of promotional communications.</p>
        </div>
      ),
    },
    {
      id: "sec-12",
      title: "12. Minors Policy",
      badge: "Age Requirement",
      content: (
        <div className="space-y-4">
          <p>Saad Studio services are strictly intended for individuals aged <strong>18 or older</strong>. We do not knowingly collect personal data from minors.</p>
        </div>
      ),
    },
    {
      id: "sec-13",
      title: "13. Updates & Contact Us",
      badge: "Support Contact",
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 text-slate-200 space-y-2">
            <p><strong>Saad Studio - Privacy & Support Team</strong></p>
            <p>Baghdad, Republic of Iraq</p>
            <p>Privacy Inquiries: <a href="mailto:privacy@saadstudio.app" className="text-violet-400 hover:underline">privacy@saadstudio.app</a></p>
            <p>Support Email: <a href="mailto:support@saadstudio.app" className="text-violet-400 hover:underline">support@saadstudio.app</a></p>
            <p>Official Website: <a href="https://www.saadstudio.app" className="text-violet-400 hover:underline">https://www.saadstudio.app</a></p>
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
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> العربية
              </button>
              <button
                onClick={() => setLang("en")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  lang === "en"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> English
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4" />{" "}
            {lang === "ar"
              ? "سياسة الخصوصية والأمان - Saad Studio"
              : "Privacy & Security Policy - Saad Studio"}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
            {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
            {lang === "ar"
              ? "توضح هذه السياسة التزام Saad Studio الشفاف بأمان بياناتك الشخصية وحمايتها عند استخدام موقعنا وأدوات الذكاء الاصطناعي وإضافة Premiere Pro المخصصة لمنصتنا في العراق والمنطقة."
              : "This policy describes Saad Studio's commitment to protecting your personal data when using our website, AI generation tools, and Premiere Pro CEP extension in Iraq and the region."}
          </p>
        </motion.div>

        {/* ── Callout Banners Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="bg-emerald-950/50 border border-emerald-800/70 p-5 rounded-2xl text-emerald-100 space-y-2 flex items-start gap-3 shadow-xl">
            <EyeOff className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                {lang === "ar" ? "تعهد التوليد المباشر وعدم التخزين" : "Direct Generation & Zero Storage"}
              </h3>
              <p className="text-xs text-emerald-200 leading-relaxed">
                {lang === "ar"
                  ? "نحن لا نخزن أي صورة أو فيديو تابع لأي شخص على سيرفراتنا. جميع التوليدات تتم مباشرةً مع المزود المصدر دون مراجعة أو مشاهدة من قِبل إدارة الموقع."
                  : "We do not store user photos or videos on site servers. All generations process directly with source providers without admin inspection."}
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
                  ? "تخضع جميع الصور المرفوعة والمدخلات لفحص مبرمج أوتوماتيكياً. أي صورة تخدش الحياء العام يتم حظرها آلياً بواسطة الكود دون تدخل بشري."
                  : "Uploads undergo real-time automated code moderation. Indecent content is blocked automatically without human review."}
              </p>
            </div>
          </div>

          <div className="bg-blue-950/50 border border-blue-800/70 p-5 rounded-2xl text-blue-100 space-y-2 flex items-start gap-3 shadow-xl">
            <BadgePercent className="w-7 h-7 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                {lang === "ar" ? "سياسة الأسعار وتغيرات الموردين" : "Dynamic Supplier Pricing"}
              </h3>
              <p className="text-xs text-blue-200 leading-relaxed">
                {lang === "ar"
                  ? "الأسعار وتكلفة التوليد لكل نموذج غير ثابتة دائمياً (حتى للاشتراك السنوي) وتتغير وفقاً لسياسات وأسعار الشركات المزودة (Google, OpenAI, BytePlus)."
                  : "Prices and credit costs are non-fixed (even for annual subscriptions) and fluctuate based on source provider compute rates."}
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
                ? "ابحث في بنود سياسة الخصوصية (مثال: تغير الأسعار، الموردين، عدم التخزين، زين كاش)..."
                : "Search policy terms (e.g. Dynamic pricing, Zero storage, Zain Cash)..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-slate-900/90 border border-slate-800 rounded-xl py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors shadow-inner ${
              lang === "ar" ? "pr-12 pl-4" : "pl-12 pr-4"
            }`}
          />
        </div>

        {/* ── Main Layout: Sidebar & Content ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Table of Contents Sticky Index */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md sticky top-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> {lang === "ar" ? "فهرس السياسة" : "Policy Index"}
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
                      ? "bg-violet-600/20 text-violet-300 font-semibold border border-violet-500/30"
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
                <span>{lang === "ar" ? "التوليد مباشر وعدم رؤية الوسائط فعال" : "Direct Generation & Zero Storage Active"}</span>
              </div>
              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-900/40 text-xs text-amber-300 flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{lang === "ar" ? "الفحص الآلي والمبرمج للمحتوى فعال" : "Automated Code Moderation Active"}</span>
              </div>
              <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-900/40 text-xs text-blue-300 flex items-center gap-3">
                <BadgePercent className="w-4 h-4 shrink-0 text-blue-400" />
                <span>{lang === "ar" ? "مرونة الأسعار حسب سياسات الموردين فعالة" : "Dynamic Supplier Rates Active"}</span>
              </div>
            </div>
          </div>

          {/* Main Content Sections */}
          <div className="lg:col-span-8 space-y-8">
            {filteredSections.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
                {lang === "ar"
                  ? `لم نجد بنوداً تطابق بحثك "${searchQuery}".`
                  : `No sections matching "${searchQuery}".`}
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
                      <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
                      {sec.title}
                    </h2>
                    {sec.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-slate-800 text-violet-300 border border-slate-700 shrink-0">
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
            <div className="bg-gradient-to-r from-violet-950/40 via-slate-900 to-violet-950/40 border border-violet-800/40 p-6 md:p-8 rounded-2xl text-center space-y-3">
              <h3 className="text-base md:text-lg font-bold text-slate-100">
                {lang === "ar" ? "هل لديك سؤال حول الخصوصية أو الحساب؟" : "Have Questions Regarding Privacy?"}
              </h3>
              <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
                {lang === "ar"
                  ? "فريق الدعم الفني والخصوصية في Saad Studio جاهز لمساعدتك في أي استفسار أو طلب حذف بيانات."
                  : "The Saad Studio Support & Privacy team is ready to assist you with any inquiries."}
              </p>
              <div className="pt-2">
                <a
                  href="mailto:privacy@saadstudio.app"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs md:text-sm transition-all shadow-lg shadow-violet-600/25"
                >
                  {lang === "ar" ? "مراسلة مسؤولي الخصوصية" : "Contact Privacy Team"}
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
