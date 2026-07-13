import { useState, useEffect } from "react";

export function useLanguage() {
  const [lang, setLang] = useState<"en" | "ar">("ar"); // Default to "ar"

  useEffect(() => {
    // Read initial language on client side
    const saved = localStorage.getItem("saad_language") as "en" | "ar";
    if (saved) {
      setLang(saved);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", saved);
        document.documentElement.setAttribute("dir", "ltr"); // Enforce LTR layout always!
      }
    } else {
      localStorage.setItem("saad_language", "ar");
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", "ar");
        document.documentElement.setAttribute("dir", "ltr"); // Enforce LTR layout always!
      }
    }

    const handleLanguageChange = () => {
      const current = (localStorage.getItem("saad_language") as "en" | "ar") || "ar";
      setLang(current);
    };

    window.addEventListener("saad-language-changed", handleLanguageChange);
    return () => {
      window.removeEventListener("saad-language-changed", handleLanguageChange);
    };
  }, []);

  const changeLanguage = (newLang: "en" | "ar") => {
    localStorage.setItem("saad_language", newLang);
    setLang(newLang);
    
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", newLang);
      document.documentElement.setAttribute("dir", "ltr"); // Enforce LTR layout always!
    }

    // Trigger local listeners
    window.dispatchEvent(new Event("saad-language-changed"));
  };

  return { lang, changeLanguage };
}
