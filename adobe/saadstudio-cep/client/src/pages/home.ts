import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
import { APPS, type AppDef } from "../lib/apps";
import { Header } from "../components/header";
import { store } from "../lib/store";
import { openExternal } from "../lib/cep";
import { t, getLanguage } from "../lib/i18n";
import { API_BASE } from "../lib/api";

interface Slide {
  image: string;
  url: string;
  // Static key fields
  headingKey?: "heroHeading" | "slide2Heading" | "slide3Heading";
  subheadingKey?: "heroSubheading" | "slide2Subheading" | "slide3Subheading";
  descKey?: "heroDesc" | "slide2Desc" | "slide3Desc";
  btnKey?: "visitWebsite";
  // Dynamic fields from DB
  headingEn?: string;
  headingAr?: string;
  subheadingEn?: string;
  subheadingAr?: string;
  descEn?: string;
  descAr?: string;
  btnEn?: string;
  btnAr?: string;
}

const STATIC_SLIDES: Slide[] = [
  {
    image: "slide1.png",
    headingKey: "heroHeading",
    subheadingKey: "heroSubheading",
    descKey: "heroDesc",
    btnKey: "visitWebsite",
    url: "https://www.saadstudio.app"
  },
  {
    image: "slide2.png",
    headingKey: "slide2Heading",
    subheadingKey: "slide2Subheading",
    descKey: "slide2Desc",
    btnKey: "visitWebsite",
    url: "https://www.saadstudio.app"
  },
  {
    image: "slide3.png",
    headingKey: "slide3Heading",
    subheadingKey: "slide3Subheading",
    descKey: "slide3Desc",
    btnKey: "visitWebsite",
    url: "https://www.saadstudio.app"
  }
];

export function HomePage(): HTMLElement {
  const root = el("div.col", { style: { height: "100%" } });

  let slides: Slide[] = [...STATIC_SLIDES];
  let activeSlideIndex = 0;
  let searchQuery = "";
  let activeFilter = "All";
  let autoPlayInterval: number | null = null;

  // Helpers to resolve localized text fields dynamically
  function getSlideTitle(slide: Slide): string {
    const lang = getLanguage();
    if (lang === "ar") {
      return slide.headingAr ?? (slide.headingKey ? t(slide.headingKey) : "");
    }
    return slide.headingEn ?? (slide.headingKey ? t(slide.headingKey) : "");
  }

  function getSlideSubtitle(slide: Slide): string {
    const lang = getLanguage();
    if (lang === "ar") {
      return slide.subheadingAr ?? (slide.subheadingKey ? t(slide.subheadingKey) : "");
    }
    return slide.subheadingEn ?? (slide.subheadingKey ? t(slide.subheadingKey) : "");
  }

  function getSlideDesc(slide: Slide): string {
    const lang = getLanguage();
    if (lang === "ar") {
      return slide.descAr ?? (slide.descKey ? t(slide.descKey) : "");
    }
    return slide.descEn ?? (slide.descKey ? t(slide.descKey) : "");
  }

  function getSlideBtnText(slide: Slide): string {
    const lang = getLanguage();
    if (lang === "ar") {
      return slide.btnAr ?? (slide.btnKey ? t(slide.btnKey) : t("visitWebsite"));
    }
    return slide.btnEn ?? (slide.btnKey ? t(slide.btnKey) : t("visitWebsite"));
  }

  function getSlideImage(slide: Slide): string {
    if (slide.image.startsWith("http")) {
      return slide.image;
    }
    if (slide.image.startsWith("/")) {
      return `${API_BASE}${slide.image}`;
    }
    return slide.image; // fallback to relative local image (e.g. "slide1.png")
  }

  function handleSlideAction(slide: Slide) {
    if (!slide.url) return;
    if (slide.url.startsWith("/")) {
      navigate(slide.url);
    } else {
      openExternal(slide.url);
    }
  }

  // Fetch dynamic slides from DB layout blocks
  function fetchSlides() {
    fetch(`${API_BASE}/api/layouts?page=cep-slides`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch layouts API");
      })
      .then((data) => {
        if (data && Array.isArray(data.layoutBlocks) && data.layoutBlocks.length > 0) {
          slides = data.layoutBlocks;
          activeSlideIndex = 0;
          updateSliderUI();
          
          // Re-render dots indicator dynamically
          const dotsContainer = root.querySelector(".hero-slider__dots");
          if (dotsContainer) {
            dotsContainer.replaceChildren(
              ...slides.map((_, idx) => {
                const dot = el("span.hero-slider__dot" + (idx === activeSlideIndex ? ".active" : ""), {
                  onClick: (ev: Event) => {
                    ev.stopPropagation();
                    activeSlideIndex = idx;
                    updateSliderUI();
                    startAutoplay();
                  }
                });
                return dot;
              })
            );
          }
        }
      })
      .catch((err) => {
        console.warn("Using local static fallback slides. Reason:", err.message);
      });
  }

  // Categories mapping
  const CATEGORIES = [
    { id: "GENERATE", icon: "spark", titleKey: "sectionGenerate" as const, apps: ["image-gen", "video-gen", "expand"] },
    { id: "EDIT", icon: "magic-wand", titleKey: "sectionEdit" as const, apps: ["remove-bg", "upscale", "transitions"] },
    { id: "AUDIO", icon: "waveform", titleKey: "sectionAudio" as const, apps: ["edit-video", "ai-dubbing", "audiogram", "transcription", "avatar-pro"] },
    { id: "PRODUCTION", icon: "video", titleKey: "sectionProduction" as const, apps: ["add-captions", "edit-clips", "auto-reframe", "multi-cam-auto-switch"] },
    { id: "SYNC", icon: "settings", titleKey: "sectionSync" as const, apps: ["ai-copilot", "saad-curves", "mcp-bridge", "synchronize", "noise-removal", "eye-correction"] }
  ];

  // Check if app matches tag filter
  function matchesFilter(app: AppDef, filter: string): boolean {
    if (filter === "All") return true;
    if (filter === "Video") {
      return ["video-gen", "transitions", "avatar-pro", "add-captions", "edit-clips", "auto-reframe", "multi-cam-auto-switch", "synchronize"].includes(app.id);
    }
    if (filter === "Image") {
      return ["image-gen", "expand", "remove-bg", "upscale"].includes(app.id);
    }
    if (filter === "Audio") {
      return ["edit-video", "ai-dubbing", "audiogram", "transcription", "noise-removal"].includes(app.id);
    }
    if (filter === "AI") {
      return ["image-gen", "video-gen", "ai-dubbing", "edit-clips", "ai-copilot"].includes(app.id);
    }
    if (filter === "Utility") {
      return ["saad-curves", "synchronize", "multi-cam-auto-switch", "noise-removal", "eye-correction"].includes(app.id);
    }
    return true;
  }

  function startAutoplay() {
    stopAutoplay();
    autoPlayInterval = window.setInterval(() => {
      activeSlideIndex = (activeSlideIndex + 1) % slides.length;
      updateSliderUI();
    }, 5000);
  }

  function stopAutoplay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }

  function updateSliderUI() {
    if (slides.length === 0) return;
    const slide = slides[activeSlideIndex];
    const heroBg = root.querySelector(".hero-slider") as HTMLElement;
    if (heroBg) {
      heroBg.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.3) 100%), url(${getSlideImage(slide)})`;
    }

    const titleEl = root.querySelector(".hero-slider__title") as HTMLElement;
    if (titleEl) titleEl.textContent = getSlideTitle(slide);

    const subEl = root.querySelector(".hero-slider__sub") as HTMLElement;
    if (subEl) subEl.textContent = getSlideSubtitle(slide);

    const descEl = root.querySelector(".hero-slider__desc") as HTMLElement;
    if (descEl) descEl.textContent = getSlideDesc(slide);

    const buttonEl = root.querySelector(".hero-slider__btn") as HTMLElement;
    if (buttonEl) {
      buttonEl.innerHTML = `${getSlideBtnText(slide)} <span style="display:inline-flex;align-items:center;margin-left:4px;">${icon("arrow-up-right", 12).innerHTML}</span>`;
    }

    // Update dots
    const dots = root.querySelectorAll(".hero-slider__dot");
    dots.forEach((dot, idx) => {
      if (idx === activeSlideIndex) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  }

  function render() {
    root.replaceChildren();

    // 1. Header
    root.appendChild(Header());

    // 2. Main content container
    const mainEl = el("div.app-main.app-main--library-redesign", null);
    root.appendChild(mainEl);

    // 3. Hero section
    const currentSlide = slides[activeSlideIndex];
    
    // Left Arrow SVG
    const leftArrowSvg = el("span", {
      html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`
    });
    
    // Right Arrow SVG
    const rightArrowSvg = el("span", {
      html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`
    });

    const heroEl = el("div.hero-slider",
      {
        style: {
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.3) 100%), url(${getSlideImage(currentSlide)})`
        },
        onClick: () => handleSlideAction(slides[activeSlideIndex])
      },
      el("div.hero-slider__arrow.hero-slider__arrow--left", {
        onClick: (ev: Event) => {
          ev.stopPropagation();
          activeSlideIndex = (activeSlideIndex - 1 + slides.length) % slides.length;
          updateSliderUI();
          startAutoplay();
        }
      }, leftArrowSvg),
      el("div.hero-slider__arrow.hero-slider__arrow--right", {
        onClick: (ev: Event) => {
          ev.stopPropagation();
          activeSlideIndex = (activeSlideIndex + 1) % slides.length;
          updateSliderUI();
          startAutoplay();
        }
      }, rightArrowSvg),
      el("div.hero-slider__content", null,
        el("div.hero-slider__sub", null, getSlideSubtitle(currentSlide)),
        el("div.hero-slider__title", null, getSlideTitle(currentSlide)),
        el("div.hero-slider__desc", null, getSlideDesc(currentSlide)),
        el("button.hero-slider__btn", {
          onClick: (ev: Event) => {
            ev.stopPropagation();
            handleSlideAction(slides[activeSlideIndex]);
          }
        },
          getSlideBtnText(currentSlide),
          icon("arrow-up-right", 12)
        ),
        el("div.hero-slider__footer", null,
          el("span.hero-slider__web", null, "saadstudio.app"),
          el("div.hero-slider__socials", null,
            el("span.hero-social-icon", { onClick: (e: Event) => { e.stopPropagation(); openExternal("https://instagram.com"); } }, icon("link", 12)),
            el("span.hero-social-icon", { onClick: (e: Event) => { e.stopPropagation(); openExternal("https://youtube.com"); } }, icon("video", 12)),
            el("span.hero-social-icon", { onClick: (e: Event) => { e.stopPropagation(); openExternal("https://tiktok.com"); } }, icon("spark", 12))
          )
        )
      ),
      el("div.hero-slider__dots", null,
        ...slides.map((_, idx) => {
          const dot = el("span.hero-slider__dot" + (idx === activeSlideIndex ? ".active" : ""), {
            onClick: (ev: Event) => {
              ev.stopPropagation();
              activeSlideIndex = idx;
              updateSliderUI();
              startAutoplay();
            }
          });
          return dot;
        })
      )
    );
    mainEl.appendChild(heroEl);

    // 4. Search and Filter Bar
    const searchInput = el("input.search-bar__input", {
      type: "text",
      placeholder: t("searchPlaceholder"),
      value: searchQuery,
      onInput: (ev: Event) => {
        searchQuery = (ev.target as HTMLInputElement).value.toLowerCase();
        renderGrid();
      }
    }) as HTMLInputElement;

    const filterTagsContainer = el("div.filter-bar__tags", null);
    const filterTags = ["All", "Video", "Image", "Audio", "AI", "Utility"];
    const tagMapping: Record<string, "filterAll" | "filterVideo" | "filterImage" | "filterAudio" | "filterAI" | "filterUtility"> = {
      All: "filterAll",
      Video: "filterVideo",
      Image: "filterImage",
      Audio: "filterAudio",
      AI: "filterAI",
      Utility: "filterUtility"
    };
    
    filterTags.forEach((tag) => {
      const tagBtn = el("button.filter-tag" + (activeFilter === tag ? ".active" : ""), {
        onClick: () => {
          activeFilter = tag;
          filterTagsContainer.querySelectorAll(".filter-tag").forEach((btn) => btn.classList.remove("active"));
          tagBtn.classList.add("active");
          renderGrid();
        }
      }, t(tagMapping[tag]));
      filterTagsContainer.appendChild(tagBtn);
    });

    const filterBar = el("div.filter-bar", null,
      el("div.search-bar", null,
        el("span.search-bar__icon", null, icon("spark", 14)),
        searchInput,
        el("span.search-bar__shortcut", null, "âŒ˜K")
      ),
      filterTagsContainer,
      el("div.filter-dropdown", null,
        el("button.filter-dropdown__btn", null,
          t("filterDropdown"),
          icon("chevron-down", 14)
        )
      )
    );
    mainEl.appendChild(filterBar);

    // 5. Grid Container for Categorized Tools
    const gridContainer = el("div.categorized-grid", null);
    mainEl.appendChild(gridContainer);

    function renderGrid() {
      gridContainer.replaceChildren();

      CATEGORIES.forEach((cat) => {
        // Find apps in this category that match search query and active filter
        const matchingApps = cat.apps
          .map((id) => APPS.find((app) => app.id === id))
          .filter((app): app is AppDef => {
            if (!app) return false;
            // 1. Matches filter tab
            if (!matchesFilter(app, activeFilter)) return false;
            // 2. Matches search query
            if (searchQuery) {
              const nameTrans = t((app.id + "_name") as any).toLowerCase();
              const descTrans = t((app.id + "_desc") as any).toLowerCase();
              const nameEn = app.name.toLowerCase();
              const descEn = app.description.toLowerCase();
              if (
                !nameTrans.includes(searchQuery) &&
                !descTrans.includes(searchQuery) &&
                !nameEn.includes(searchQuery) &&
                !descEn.includes(searchQuery)
              ) {
                return false;
              }
            }
            return true;
          });

        if (matchingApps.length > 0) {
          const sectionEl = el("div.grid-category-section", null,
            el("div.grid-category-head", null,
              el("span.grid-category-head__icon", null, icon(cat.icon as any, 16)),
              el("h3.grid-category-head__title", null, t(cat.titleKey))
            ),
            el(`div.apps-grid-new.apps-grid-new--${cat.id.toLowerCase()}`, null,
              ...matchingApps.map(renderAppCard)
            )
          );
          gridContainer.appendChild(sectionEl);
        }
      });
    }

    function renderAppCard(app: AppDef) {
      // Right Chevron SVG
      const rightChevronSvg = el("span", {
        html: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>`
      });

      const card = el("button.app-card-new" + (app.comingSoon ? ".coming-soon" : ""),
        {
          onClick: () => navigate(app.route),
          style: app.color ? { "--app-color": app.color } as Record<string, string> : undefined,
          title: t((app.id + "_desc") as any),
        },
        el("div.app-card-new__main", null,
          el("div.app-card-new__icon-bubble", null, icon(app.icon, 20)),
          el("div.app-card-new__details", null,
            el("div.app-card-new__name", null, t((app.id + "_name") as any)),
            el("div.app-card-new__desc", null, t((app.id + "_desc") as any))
          )
        ),
        el("div.app-card-new__action", null,
          app.badge === "NEW" ? el("span.app-card-new__badge-new", null, t("badgeNew")) : null,
          app.comingSoon ? el("span.app-card-new__badge-soon", null, t("badgeSoon")) : null,
          el("div.app-card-new__arrow", null, rightChevronSvg)
        )
      );
      return card;
    }

    // Initial grid render
    renderGrid();

    // 6. Footer Stats Bar
    const totalToolsCount = APPS.length;
    const newFeaturesCount = APPS.filter(a => a.badge === "NEW").length;
    const comingSoonCount = APPS.filter(a => a.comingSoon).length;
    const userState = store.get().user;
    const balance = userState ? userState.creditBalance : 0;

    // Spark icon SVG
    const sparkleSvg = el("span", {
      html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/></svg>`
    });
    
    // Box/Package icon SVG
    const boxSvg = el("span", {
      html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`
    });

    // Clock icon SVG
    const clockSvg = el("span", {
      html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
    });

    const footerEl = el("div.footer-stats", null,
      el("div.footer-stat-item", null,
        el("div.footer-stat-item__icon", null, boxSvg),
        el("div.footer-stat-item__info", null,
          el("div.footer-stat-item__value", null, totalToolsCount),
          el("div.footer-stat-item__label", null, t("totalTools"))
        )
      ),
      el("div.footer-stat-item", null,
        el("div.footer-stat-item__icon", null, sparkleSvg),
        el("div.footer-stat-item__info", null,
          el("div.footer-stat-item__value", null, newFeaturesCount),
          el("div.footer-stat-item__label", null, t("newFeatures"))
        )
      ),
      el("div.footer-stat-item", null,
        el("div.footer-stat-item__icon", null, clockSvg),
        el("div.footer-stat-item__info", null,
          el("div.footer-stat-item__value", null, comingSoonCount),
          el("div.footer-stat-item__label", null, t("comingSoon"))
        )
      ),
      el("div.footer-stat-item", null,
        el("div.footer-stat-item__icon", null, icon("coin", 16)),
        el("div.footer-stat-item__info", null,
          el("div.footer-stat-item__value.credits-value", null, balance.toLocaleString()),
          el("div.footer-stat-item__label", null, t("yourCredits"))
        )
      )
    );
    root.appendChild(footerEl);

    // Setup global keyboard shortcut listener for âŒ˜K / Ctrl+K
    const onKeydown = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "k") {
        ev.preventDefault();
        searchInput.focus();
      }
    };
    document.addEventListener("keydown", onKeydown);
    root.dataset.cleanup = "true";
    (root as any)._cleanup = () => {
      document.removeEventListener("keydown", onKeydown);
      stopAutoplay();
    };
  }

  // Handle i18n change reactive rendering
  const onLangChange = () => {
    render();
    startAutoplay();
  };
  window.addEventListener("saad-language-changed", onLangChange);

  // Initial render
  render();
  fetchSlides();
  startAutoplay();

  // Watch for DOM removal to stop autoplay and clean listeners
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === root || node.contains(root)) {
          stopAutoplay();
          window.removeEventListener("saad-language-changed", onLangChange);
          if ((root as any)._cleanup) (root as any)._cleanup();
          observer.disconnect();
        }
      });
    });
  });
  setTimeout(() => {
    if (root.parentNode) {
      observer.observe(root.parentNode, { childList: true });
    }
  }, 0);

  return root;
}
