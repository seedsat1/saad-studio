/**
 * Saad Studio Admin — i18n (Arabic / English)
 * Include this script in every admin page BEFORE the page's own <script>.
 * Usage:
 *   HTML:  <span data-i18n="sidebar.dashboard">Dashboard</span>
 *          <input data-i18n-placeholder="users.searchPlaceholder" placeholder="Search...">
 *   JS:    t('users.loading')  → returns translated string
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'saad_admin_lang';

  /* ───────── Translation dictionaries ───────── */
  const dict = {
    en: {
      // Sidebar
      'sidebar.brand': 'Saad Studio',
      'sidebar.brandShort': 'SS',
      'sidebar.dashboard': 'Dashboard',
      'sidebar.users': 'Users',
      'sidebar.orders': 'Orders',
      'sidebar.pages': 'Pages',
      'sidebar.media': 'Media',
      'sidebar.ads': 'Ads',
      'sidebar.settings': 'Settings',
      'sidebar.theme': 'Theme',

      // Header
      'header.dashboard': 'Dashboard',
      'header.users': 'Users',
      'header.orders': 'Orders',
      'header.pages': 'Pages',
      'header.media': 'Media',
      'header.ads': 'Ads',
      'header.settings': 'Settings',
      'header.theme': 'Theme',

      // Theme dropdown
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'theme.auto': 'Auto',

      // Account dropdown
      'account.label': 'Account',
      'account.settings': 'Settings',
      'account.logout': 'Logout',

      // Breadcrumbs
      'breadcrumb.home': 'Home',
      'breadcrumb.dashboard': 'Dashboard',
      'breadcrumb.users': 'Users',
      'breadcrumb.orders': 'Orders',
      'breadcrumb.pages': 'Pages',
      'breadcrumb.media': 'Media',
      'breadcrumb.ads': 'Ads',
      'breadcrumb.settings': 'Settings',
      'breadcrumb.theme': 'Theme',

      // Footer
      'footer.copy': 'Saad Studio \u00a9 2025',

      // Language switcher
      'lang.switch': 'عربي',

      // ── Dashboard ──
      'dash.title': 'Dashboard',
      'dash.totalUsers': 'Total Users',
      'dash.totalCredits': 'Total Credits',
      'dash.totalOrders': 'Total Orders',
      'dash.revenue': 'Revenue (Credits)',
      'dash.kieTitle': 'KIE API Balance',
      'dash.kieRefresh': 'Refresh',
      'dash.kieChecking': 'Checking balance...',
      'dash.kieCredits': 'Available KIE Credits',
      'dash.kieFailed': 'Failed to load',
      'dash.kieNoKey': 'KIE_API_KEY not configured',
      'dash.kieNoData': 'No balance data',

      // ── Users ──
      'users.title': 'Users Management',
      'users.searchPlaceholder': 'Search by email...',
      'users.email': 'Email',
      'users.credits': 'Credits',
      'users.plan': 'Plan',
      'users.admin': 'Admin',
      'users.created': 'Created',
      'users.actions': 'Actions',
      'users.loading': 'Loading users...',
      'users.empty': 'No users found',
      'users.addCredits': '+ Credits',
      'users.changePlan': 'Plan',
      'users.kick': 'Kick',
      'users.modalAddCredits': 'Add Credits',
      'users.creditsToAdd': 'Credits to add',
      'users.user': 'User:',
      'users.cancel': 'Cancel',
      'users.addCreditsBtn': 'Add Credits',
      'users.modalChangePlan': 'Change Plan',
      'users.newPlan': 'New Plan',
      'users.changePlanBtn': 'Change Plan',
      'users.starter': 'Starter',
      'users.pro': 'Pro',
      'users.creator': 'Creator',

      // ── Orders ──
      'orders.title': 'Orders Management',
      'orders.allStatuses': 'All Statuses',
      'orders.pending': 'Pending',
      'orders.approved': 'Approved',
      'orders.rejected': 'Rejected',
      'orders.searchPlaceholder': 'Search by email...',
      'orders.email': 'Email',
      'orders.type': 'Type',
      'orders.details': 'Details',
      'orders.status': 'Status',
      'orders.created': 'Created',
      'orders.actions': 'Actions',
      'orders.loading': 'Loading orders...',
      'orders.empty': 'No orders found',
      'orders.approve': 'Approve',
      'orders.reject': 'Reject',
      'orders.credits': 'credits',

      // ── Pages ──
      'pages.title': 'CMS Pages',
      'pages.newPage': '+ New Page',
      'pages.loading': 'Loading pages...',
      'pages.empty': 'No pages yet. Click "+ New Page" to create one.',
      'pages.colTitle': 'Title',
      'pages.colSlug': 'Slug',
      'pages.colCategory': 'Category',
      'pages.colPublished': 'Published',
      'pages.colSections': 'Sections',
      'pages.colUpdated': 'Updated',
      'pages.colActions': 'Actions',
      'pages.backToList': '\u2190 Back to Pages',
      'pages.editPage': 'Edit Page',
      'pages.newPageTitle': 'New Page',
      'pages.properties': 'Page Properties',
      'pages.titleLabel': 'Title',
      'pages.slugLabel': 'Slug',
      'pages.categoryLabel': 'Category',
      'pages.seoTitle': 'SEO Title',
      'pages.seoDesc': 'SEO Description',
      'pages.published': 'Published',
      'pages.visibleInNav': 'Visible in nav',
      'pages.savePage': 'Save Page',
      'pages.sections': 'Sections',
      'pages.addSection': '+ Add Section',
      'pages.noSections': 'No sections yet.',
      'pages.edit': 'Edit',
      'pages.duplicate': 'Dup',
      'pages.delete': 'Del',

      // ── Media ──
      'media.uploadTitle': 'Upload Images',
      'media.dragDrop': 'Drag & drop images here or',
      'media.clickBrowse': 'click to browse',
      'media.fileTypes': 'JPEG, PNG, GIF, WebP, AVIF, SVG \u2022 Max 10 MB each',
      'media.uploadSelected': 'Upload Selected',
      'media.libraryTitle': 'Media Library',
      'media.loading': 'Loading media...',
      'media.empty': 'No images uploaded yet',
      'media.copyUrl': 'Copy URL',
      'media.delete': 'Delete',

      // ── Ads ──
      'ads.title': 'Ads Management',
      'ads.newAd': '+ New Ad',
      'ads.loading': 'Loading ads...',
      'ads.empty': 'No ads yet. Click "+ New Ad" to create one.',
      'ads.colImage': 'Image',
      'ads.colTitle': 'Title',
      'ads.colType': 'Type',
      'ads.colLink': 'Link',
      'ads.colActive': 'Active',
      'ads.colCreated': 'Created',
      'ads.colActions': 'Actions',
      'ads.newAdModal': 'New Ad',
      'ads.editAdModal': 'Edit Ad',
      'ads.titleLabel': 'Title',
      'ads.typeLabel': 'Type',
      'ads.banner': 'Banner',
      'ads.popup': 'Popup',
      'ads.hero': 'Hero',
      'ads.linkLabel': 'Link (URL)',
      'ads.imageLabel': 'Image',
      'ads.imageUrlPlaceholder': 'Image URL (or pick from media below)',
      'ads.pickMedia': 'Pick from Media Library',
      'ads.active': 'Active',
      'ads.cancel': 'Cancel',
      'ads.save': 'Save',
      'ads.edit': 'Edit',
      'ads.delete': 'Delete',
      'ads.noImg': 'No img',
      'ads.mediaLoading': 'Loading media...',

      // ── Settings ──
      'settings.loading': 'Loading settings...',
      'settings.general': 'General',
      'settings.siteTitle': 'Site Title',
      'settings.siteDesc': 'Site Description',
      'settings.logoUrl': 'Logo URL',
      'settings.faviconUrl': 'Favicon URL',
      'settings.seo': 'SEO',
      'settings.seoTitle': 'SEO Title',
      'settings.seoDesc': 'SEO Description',
      'settings.contact': 'Contact Information',
      'settings.email': 'Contact Email',
      'settings.phone': 'Contact Phone',
      'settings.social': 'Social Links',
      'settings.twitter': 'Twitter / X',
      'settings.instagram': 'Instagram',
      'settings.youtube': 'YouTube',
      'settings.tiktok': 'TikTok',
      'settings.analytics': 'Analytics',
      'settings.googleTag': 'Google Tag ID',
      'settings.fbPixel': 'Facebook Pixel ID',
      'settings.maintenance': 'Maintenance Mode',
      'settings.enableMaint': 'Enable Maintenance Mode',
      'settings.maintMsg': 'Maintenance Message',
      'settings.save': 'Save Settings',

      // ── Theme ──
      'themeEditor.loading': 'Loading theme...',
      'themeEditor.colors': 'Site Colors',
      'themeEditor.resetColors': 'Reset to Defaults',
      'themeEditor.fonts': 'Fonts',
      'themeEditor.resetFonts': 'Reset to Defaults',
      'themeEditor.fontPrimary': 'Primary Font (--far)',
      'themeEditor.fontDisplay': 'Display Font (--fd)',
      'themeEditor.fontMono': 'Mono Font (--fm)',
      'themeEditor.fontUrl': 'Google Fonts URL',
      'themeEditor.preview': 'Live Preview',
      'themeEditor.previewTitle': 'SAAD STUDIO',
      'themeEditor.previewSubtitle': 'AI Creative Platform',
      'themeEditor.previewBtn1': 'Generate',
      'themeEditor.previewBtn2': 'Explore',
      'themeEditor.previewMuted': 'Secondary text sample',
      'themeEditor.save': 'Save Theme & Fonts',
      'themeEditor.colorsReset': 'Colors reset to defaults (not saved yet)',
      'themeEditor.fontsReset': 'Fonts reset to defaults (not saved yet)',

      // Color labels (used by theme page JS)
      'color.--bg': 'Background',
      'color.--bg1': 'Background Alt 1',
      'color.--bg2': 'Background Alt 2',
      'color.--bg3': 'Background Alt 3',
      'color.--bg4': 'Background Alt 4',
      'color.--amber': 'Primary Accent',
      'color.--amber2': 'Primary Accent 2',
      'color.--amber3': 'Primary Accent 3',
      'color.--cyan': 'Secondary Accent',
      'color.--cyan2': 'Secondary Accent 2',
      'color.--red': 'Danger / Error',
      'color.--green': 'Success / Green',
      'color.--tx': 'Text Primary',
      'color.--tx2': 'Text Secondary',
      'color.--tx3': 'Text Muted',

      // Generic
      'generic.required': '*',
      'generic.save': 'Save',
      'generic.cancel': 'Cancel',
      'generic.delete': 'Delete',
      'generic.edit': 'Edit',
      'generic.loading': 'Loading...',
    },

    ar: {
      // Sidebar
      'sidebar.brand': 'سعد ستوديو',
      'sidebar.brandShort': 'سع',
      'sidebar.dashboard': 'لوحة التحكم',
      'sidebar.users': 'المستخدمون',
      'sidebar.orders': 'الطلبات',
      'sidebar.pages': 'الصفحات',
      'sidebar.media': 'الوسائط',
      'sidebar.ads': 'الإعلانات',
      'sidebar.settings': 'الإعدادات',
      'sidebar.theme': 'المظهر',

      // Header
      'header.dashboard': 'لوحة التحكم',
      'header.users': 'المستخدمون',
      'header.orders': 'الطلبات',
      'header.pages': 'الصفحات',
      'header.media': 'الوسائط',
      'header.ads': 'الإعلانات',
      'header.settings': 'الإعدادات',
      'header.theme': 'المظهر',

      // Theme dropdown
      'theme.light': 'فاتح',
      'theme.dark': 'داكن',
      'theme.auto': 'تلقائي',

      // Account dropdown
      'account.label': 'الحساب',
      'account.settings': 'الإعدادات',
      'account.logout': 'تسجيل الخروج',

      // Breadcrumbs
      'breadcrumb.home': 'الرئيسية',
      'breadcrumb.dashboard': 'لوحة التحكم',
      'breadcrumb.users': 'المستخدمون',
      'breadcrumb.orders': 'الطلبات',
      'breadcrumb.pages': 'الصفحات',
      'breadcrumb.media': 'الوسائط',
      'breadcrumb.ads': 'الإعلانات',
      'breadcrumb.settings': 'الإعدادات',
      'breadcrumb.theme': 'المظهر',

      // Footer
      'footer.copy': 'سعد ستوديو \u00a9 2025',

      // Language switcher
      'lang.switch': 'English',

      // ── Dashboard ──
      'dash.title': 'لوحة التحكم',
      'dash.totalUsers': 'إجمالي المستخدمين',
      'dash.totalCredits': 'إجمالي الرصيد',
      'dash.totalOrders': 'إجمالي الطلبات',
      'dash.revenue': 'الإيرادات (رصيد)',
      'dash.kieTitle': 'رصيد KIE API',
      'dash.kieRefresh': 'تحديث',
      'dash.kieChecking': 'جاري فحص الرصيد...',
      'dash.kieCredits': 'رصيد KIE المتاح',
      'dash.kieFailed': 'فشل في التحميل',
      'dash.kieNoKey': 'مفتاح KIE_API_KEY غير مُعدّ',
      'dash.kieNoData': 'لا توجد بيانات رصيد',

      // ── Users ──
      'users.title': 'إدارة المستخدمين',
      'users.searchPlaceholder': 'بحث بالبريد الإلكتروني...',
      'users.email': 'البريد الإلكتروني',
      'users.credits': 'الرصيد',
      'users.plan': 'الخطة',
      'users.admin': 'مشرف',
      'users.created': 'تاريخ الإنشاء',
      'users.actions': 'الإجراءات',
      'users.loading': 'جاري تحميل المستخدمين...',
      'users.empty': 'لا يوجد مستخدمون',
      'users.addCredits': '+ رصيد',
      'users.changePlan': 'الخطة',
      'users.kick': 'طرد',
      'users.modalAddCredits': 'إضافة رصيد',
      'users.creditsToAdd': 'الرصيد المراد إضافته',
      'users.user': 'المستخدم:',
      'users.cancel': 'إلغاء',
      'users.addCreditsBtn': 'إضافة رصيد',
      'users.modalChangePlan': 'تغيير الخطة',
      'users.newPlan': 'الخطة الجديدة',
      'users.changePlanBtn': 'تغيير الخطة',
      'users.starter': 'مبتدئ',
      'users.pro': 'احترافي',
      'users.creator': 'مبدع',

      // ── Orders ──
      'orders.title': 'إدارة الطلبات',
      'orders.allStatuses': 'جميع الحالات',
      'orders.pending': 'قيد الانتظار',
      'orders.approved': 'مقبول',
      'orders.rejected': 'مرفوض',
      'orders.searchPlaceholder': 'بحث بالبريد الإلكتروني...',
      'orders.email': 'البريد الإلكتروني',
      'orders.type': 'النوع',
      'orders.details': 'التفاصيل',
      'orders.status': 'الحالة',
      'orders.created': 'التاريخ',
      'orders.actions': 'الإجراءات',
      'orders.loading': 'جاري تحميل الطلبات...',
      'orders.empty': 'لا توجد طلبات',
      'orders.approve': 'قبول',
      'orders.reject': 'رفض',
      'orders.credits': 'رصيد',

      // ── Pages ──
      'pages.title': 'صفحات الموقع',
      'pages.newPage': '+ صفحة جديدة',
      'pages.loading': 'جاري تحميل الصفحات...',
      'pages.empty': 'لا توجد صفحات بعد. اضغط "+ صفحة جديدة" للإنشاء.',
      'pages.colTitle': 'العنوان',
      'pages.colSlug': 'المسار',
      'pages.colCategory': 'التصنيف',
      'pages.colPublished': 'منشور',
      'pages.colSections': 'الأقسام',
      'pages.colUpdated': 'آخر تحديث',
      'pages.colActions': 'الإجراءات',
      'pages.backToList': '\u2190 العودة للصفحات',
      'pages.editPage': 'تعديل الصفحة',
      'pages.newPageTitle': 'صفحة جديدة',
      'pages.properties': 'خصائص الصفحة',
      'pages.titleLabel': 'العنوان',
      'pages.slugLabel': 'المسار',
      'pages.categoryLabel': 'التصنيف',
      'pages.seoTitle': 'عنوان SEO',
      'pages.seoDesc': 'وصف SEO',
      'pages.published': 'منشور',
      'pages.visibleInNav': 'ظاهر في القائمة',
      'pages.savePage': 'حفظ الصفحة',
      'pages.sections': 'الأقسام',
      'pages.addSection': '+ إضافة قسم',
      'pages.noSections': 'لا توجد أقسام بعد.',
      'pages.edit': 'تعديل',
      'pages.duplicate': 'نسخ',
      'pages.delete': 'حذف',

      // ── Media ──
      'media.uploadTitle': 'رفع الصور',
      'media.dragDrop': 'اسحب وأفلت الصور هنا أو',
      'media.clickBrowse': 'انقر للتصفح',
      'media.fileTypes': 'JPEG, PNG, GIF, WebP, AVIF, SVG \u2022 الحد الأقصى 10 ميجابايت',
      'media.uploadSelected': 'رفع المحدد',
      'media.libraryTitle': 'مكتبة الوسائط',
      'media.loading': 'جاري تحميل الوسائط...',
      'media.empty': 'لا توجد صور مرفوعة بعد',
      'media.copyUrl': 'نسخ الرابط',
      'media.delete': 'حذف',

      // ── Ads ──
      'ads.title': 'إدارة الإعلانات',
      'ads.newAd': '+ إعلان جديد',
      'ads.loading': 'جاري تحميل الإعلانات...',
      'ads.empty': 'لا توجد إعلانات بعد. اضغط "+ إعلان جديد" للإنشاء.',
      'ads.colImage': 'الصورة',
      'ads.colTitle': 'العنوان',
      'ads.colType': 'النوع',
      'ads.colLink': 'الرابط',
      'ads.colActive': 'نشط',
      'ads.colCreated': 'التاريخ',
      'ads.colActions': 'الإجراءات',
      'ads.newAdModal': 'إعلان جديد',
      'ads.editAdModal': 'تعديل الإعلان',
      'ads.titleLabel': 'العنوان',
      'ads.typeLabel': 'النوع',
      'ads.banner': 'بانر',
      'ads.popup': 'منبثق',
      'ads.hero': 'رئيسي',
      'ads.linkLabel': 'الرابط (URL)',
      'ads.imageLabel': 'الصورة',
      'ads.imageUrlPlaceholder': 'رابط الصورة (أو اختر من المكتبة أدناه)',
      'ads.pickMedia': 'اختيار من مكتبة الوسائط',
      'ads.active': 'نشط',
      'ads.cancel': 'إلغاء',
      'ads.save': 'حفظ',
      'ads.edit': 'تعديل',
      'ads.delete': 'حذف',
      'ads.noImg': 'لا صورة',
      'ads.mediaLoading': 'جاري تحميل الوسائط...',

      // ── Settings ──
      'settings.loading': 'جاري تحميل الإعدادات...',
      'settings.general': 'عام',
      'settings.siteTitle': 'عنوان الموقع',
      'settings.siteDesc': 'وصف الموقع',
      'settings.logoUrl': 'رابط الشعار',
      'settings.faviconUrl': 'رابط الأيقونة',
      'settings.seo': 'تحسين محركات البحث',
      'settings.seoTitle': 'عنوان SEO',
      'settings.seoDesc': 'وصف SEO',
      'settings.contact': 'معلومات التواصل',
      'settings.email': 'البريد الإلكتروني',
      'settings.phone': 'رقم الهاتف',
      'settings.social': 'روابط التواصل الاجتماعي',
      'settings.twitter': 'تويتر / X',
      'settings.instagram': 'إنستغرام',
      'settings.youtube': 'يوتيوب',
      'settings.tiktok': 'تيك توك',
      'settings.analytics': 'التحليلات',
      'settings.googleTag': 'معرّف Google Tag',
      'settings.fbPixel': 'معرّف Facebook Pixel',
      'settings.maintenance': 'وضع الصيانة',
      'settings.enableMaint': 'تفعيل وضع الصيانة',
      'settings.maintMsg': 'رسالة الصيانة',
      'settings.save': 'حفظ الإعدادات',

      // ── Theme ──
      'themeEditor.loading': 'جاري تحميل المظهر...',
      'themeEditor.colors': 'ألوان الموقع',
      'themeEditor.resetColors': 'إعادة تعيين',
      'themeEditor.fonts': 'الخطوط',
      'themeEditor.resetFonts': 'إعادة تعيين',
      'themeEditor.fontPrimary': 'الخط الأساسي (--far)',
      'themeEditor.fontDisplay': 'خط العرض (--fd)',
      'themeEditor.fontMono': 'خط الكود (--fm)',
      'themeEditor.fontUrl': 'رابط Google Fonts',
      'themeEditor.preview': 'معاينة مباشرة',
      'themeEditor.previewTitle': 'سعد ستوديو',
      'themeEditor.previewSubtitle': 'منصة إبداعية بالذكاء الاصطناعي',
      'themeEditor.previewBtn1': 'إنشاء',
      'themeEditor.previewBtn2': 'استكشاف',
      'themeEditor.previewMuted': 'نص ثانوي تجريبي',
      'themeEditor.save': 'حفظ المظهر والخطوط',
      'themeEditor.colorsReset': 'تم إعادة تعيين الألوان (لم يُحفظ بعد)',
      'themeEditor.fontsReset': 'تم إعادة تعيين الخطوط (لم يُحفظ بعد)',

      // Color labels
      'color.--bg': 'الخلفية',
      'color.--bg1': 'خلفية بديلة 1',
      'color.--bg2': 'خلفية بديلة 2',
      'color.--bg3': 'خلفية بديلة 3',
      'color.--bg4': 'خلفية بديلة 4',
      'color.--amber': 'اللون الأساسي',
      'color.--amber2': 'اللون الأساسي 2',
      'color.--amber3': 'اللون الأساسي 3',
      'color.--cyan': 'اللون الثانوي',
      'color.--cyan2': 'اللون الثانوي 2',
      'color.--red': 'خطأ / أحمر',
      'color.--green': 'نجاح / أخضر',
      'color.--tx': 'النص الأساسي',
      'color.--tx2': 'النص الثانوي',
      'color.--tx3': 'النص الباهت',

      // Generic
      'generic.required': '*',
      'generic.save': 'حفظ',
      'generic.cancel': 'إلغاء',
      'generic.delete': 'حذف',
      'generic.edit': 'تعديل',
      'generic.loading': 'جاري التحميل...',
    }
  };

  /* ───────── Core functions ───────── */

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  }

  function setLang(lang) {
    if (!dict[lang]) return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang(lang);
  }

  function t(key) {
    const lang = getLang();
    return dict[lang][key] || dict['en'][key] || key;
  }

  function applyLang(lang) {
    const d = dict[lang] || dict['en'];

    // Set direction and lang attribute
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Toggle RTL stylesheet
    const rtlLink = document.getElementById('rtlStylesheet');
    if (rtlLink) {
      rtlLink.disabled = (lang !== 'ar');
    }

    // Translate data-i18n elements (textContent)
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (d[key] !== undefined) el.textContent = d[key];
    });

    // Translate data-i18n-html elements (innerHTML — use sparingly)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (d[key] !== undefined) el.innerHTML = d[key];
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (d[key] !== undefined) el.placeholder = d[key];
    });

    // Translate titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (d[key] !== undefined) el.title = d[key];
    });

    // Update language switcher button text
    const switcher = document.getElementById('langSwitchBtn');
    if (switcher) {
      switcher.textContent = d['lang.switch'] || (lang === 'ar' ? 'English' : 'عربي');
    }

    // Fire custom event so page JS can react
    window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
  }

  /* ───────── Auto-init ───────── */
  function init() {
    const lang = getLang();
    applyLang(lang);

    // Bind language switcher button
    const switcher = document.getElementById('langSwitchBtn');
    if (switcher) {
      switcher.addEventListener('click', function (e) {
        e.preventDefault();
        const newLang = getLang() === 'ar' ? 'en' : 'ar';
        setLang(newLang);
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globally
  window.i18n = { t, getLang, setLang, applyLang };
  window.t = t;

})();
