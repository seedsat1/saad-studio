/**
 * SAAD STUDIO — Awwwards Effects
 * 3 مؤثرات: Scroll Reveal + 3D Tilt Cards + Horizontal Scroll
 * يعتمد على GSAP + ScrollTrigger (يُحمّل تلقائياً)
 */

(function () {
  'use strict';

  // ── تحميل GSAP + ScrollTrigger تلقائياً إذا مو موجودة ──
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (!window.gsap) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
    }
    if (!window.ScrollTrigger) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
    }
    gsap.registerPlugin(ScrollTrigger);

    applyEffect1_ScrollReveal();
    applyEffect2_3DTilt();
    applyEffect3_PricingEntrance();

    console.log('[SAAD STUDIO] ✅ Awwwards effects loaded');
  }

  // ═══════════════════════════════════════════════════════
  //  المؤثر 1: Scroll Reveal — ظهور العناصر عند السكرول
  //  (مستوحى من ChainGPT)
  // ═══════════════════════════════════════════════════════
  function applyEffect1_ScrollReveal() {

    // أضف CSS للأنيميشن
    const style = document.createElement('style');
    style.textContent = `
      .fx-reveal { opacity: 0; transform: translateY(50px) scale(0.96); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
      .fx-reveal.fx-visible { opacity: 1; transform: translateY(0) scale(1); }
      .market-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, box-shadow 0.4s, opacity 0.5s !important; }
      .plan-card { transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s, opacity 0.5s !important; }
    `;
    document.head.appendChild(style);

    // Market Cards — ظهور متسلسل عند السكرول
    const marketCards = document.querySelectorAll('.market-card');
    marketCards.forEach((card, i) => {
      card.classList.add('fx-reveal');
      card.style.transitionDelay = (i % 6) * 0.08 + 's';
    });

    // Plan Cards — ظهور متسلسل
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach((card, i) => {
      card.classList.add('fx-reveal');
      card.style.transitionDelay = i * 0.12 + 's';
    });

    // Market Hero
    const heroEl = document.querySelector('.market-hero');
    if (heroEl) {
      heroEl.classList.add('fx-reveal');
    }

    // Page headers
    document.querySelectorAll('.ph').forEach(el => {
      el.classList.add('fx-reveal');
    });

    // Topup cards
    document.querySelectorAll('.topup-card').forEach((el, i) => {
      el.classList.add('fx-reveal');
      el.style.transitionDelay = i * 0.06 + 's';
    });

    // Compare table
    document.querySelectorAll('.compare-wrap').forEach(el => {
      el.classList.add('fx-reveal');
    });

    // IntersectionObserver للظهور عند السكرول
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fx-visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fx-reveal').forEach(el => observer.observe(el));

    // مراقبة الصفحات — لأن الموقع SPA، لازم نعيد المراقبة عند تغيير الصفحة
    const pagesContainer = document.querySelector('.main-body') || document.querySelector('.content') || document.body;
    const pageObserver = new MutationObserver(() => {
      document.querySelectorAll('.fx-reveal:not(.fx-visible)').forEach(el => {
        observer.observe(el);
      });
      // إعادة تفعيل الأنيميشن للعناصر في الصفحة النشطة
      setTimeout(() => {
        const activePage = document.querySelector('.page.active');
        if (activePage) {
          activePage.querySelectorAll('.fx-reveal').forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) {
              el.classList.add('fx-visible');
            }
          });
        }
      }, 100);
    });
    pageObserver.observe(pagesContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // تفعيل فوري للعناصر المرئية حالياً
    requestAnimationFrame(() => {
      document.querySelectorAll('.page.active .fx-reveal').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight + 50) {
          el.classList.add('fx-visible');
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  //  المؤثر 2: 3D Tilt — ميلان ثلاثي الأبعاد عند الماوس
  //  (مستوحى من ListAcross)
  // ═══════════════════════════════════════════════════════
  function applyEffect2_3DTilt() {

    const style = document.createElement('style');
    style.textContent = `
      .fx-tilt { transform-style: preserve-3d; will-change: transform; }
      .fx-tilt-shine { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 10; opacity: 0; transition: opacity 0.3s; background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(95,226,255,0.08) 0%, transparent 60%); }
      .fx-tilt:hover .fx-tilt-shine { opacity: 1; }
    `;
    document.head.appendChild(style);

    function applyTilt(selector) {
      document.querySelectorAll(selector).forEach(card => {
        if (card.querySelector('.fx-tilt-shine')) return;
        card.classList.add('fx-tilt');

        // إضافة طبقة اللمعان
        const shine = document.createElement('div');
        shine.className = 'fx-tilt-shine';
        card.appendChild(shine);

        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const rotX = ((y - cy) / cy) * -6;
          const rotY = ((x - cx) / cx) * 6;
          const pctX = (x / rect.width) * 100;
          const pctY = (y / rect.height) * 100;

          card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
          card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 30px rgba(0,229,255,0.06), 0 10px 30px rgba(0,0,0,0.2)`;
          card.style.setProperty('--mx', pctX + '%');
          card.style.setProperty('--my', pctY + '%');
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
          card.style.boxShadow = '';
        });
      });
    }

    // تطبيق على كروت الموديلات
    applyTilt('.market-card');
    // تطبيق على كروت الأسعار
    applyTilt('.plan-card');
    // تطبيق على كروت الرصيد
    applyTilt('.topup-card');

    // مراقبة الكروت الجديدة (SPA)
    const mo = new MutationObserver(() => {
      applyTilt('.market-card');
      applyTilt('.plan-card');
      applyTilt('.topup-card');
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ═══════════════════════════════════════════════════════
  //  المؤثر 3: Pricing Entrance — دخول سينمائي لكروت الأسعار
  //  (مستوحى من DNA Capital + GSAP)
  // ═══════════════════════════════════════════════════════
  function applyEffect3_PricingEntrance() {

    // Hero parallax: حركة خفيفة مع السكرول
    const heroEl = document.querySelector('.market-hero');
    if (heroEl) {
      window.addEventListener('scroll', () => {
        const rect = heroEl.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const pct = rect.top / window.innerHeight;
          heroEl.style.transform = `translateY(${pct * -15}px)`;
        }
      }, { passive: true });
    }

    // Staggered entrance عند فتح صفحة الأسعار
    const origNav = window.navigateTo;
    if (typeof origNav === 'function') {
      window.navigateTo = function (page) {
        origNav.apply(this, arguments);
        setTimeout(() => animatePageEntrance(page), 50);
      };
    }

    // مراقبة تغيير الصفحة النشطة
    const pageObs = new MutationObserver(() => {
      const active = document.querySelector('.page.active');
      if (active) {
        setTimeout(() => {
          active.querySelectorAll('.fx-reveal').forEach(el => {
            el.classList.remove('fx-visible');
            void el.offsetWidth;
          });
          requestAnimationFrame(() => {
            active.querySelectorAll('.fx-reveal').forEach(el => {
              if (el.getBoundingClientRect().top < window.innerHeight + 100) {
                el.classList.add('fx-visible');
              }
            });
          });
        }, 80);
      }
    });
    document.querySelectorAll('.page').forEach(p => {
      pageObs.observe(p, { attributes: true, attributeFilter: ['class'] });
    });

    function animatePageEntrance(page) {
      const pageEl = document.getElementById('page-' + page);
      if (!pageEl) return;

      // GSAP stagger animation
      const items = pageEl.querySelectorAll('.market-card, .plan-card, .topup-card');
      if (items.length && window.gsap) {
        gsap.fromTo(items,
          { y: 40, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', delay: 0.1 }
        );
      }
    }

    // Smooth counter animation للأرقام (credits, prices)
    document.querySelectorAll('.plan-price, .topup-price, .topup-credits').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.transition = 'transform 0.2s, color 0.2s';
        el.style.transform = 'scale(1.08)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
    });
  }

  // ── التشغيل ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
