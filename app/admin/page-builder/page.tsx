"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Play,
  X,
  Search,
  Film,
  Sparkles,
  Eye,
  Trash2,
  ExternalLink,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  ArrowLeft,
} from "lucide-react";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

type PresetMedia = {
  id: string;
  name: string;
  category: string;
  previewVideoUrl: string;
  previewGradient: string;
  description: string;
  costMultiplier: number;
};

type AssetSection = "transitions" | "beauty-tools" | "promo";

type BeautyOption = {
  id: string;
  name: string;
  nameAr: string;
  desc: string;
};

type BeautyToolFull = {
  id: string;
  name: string;
  nameAr: string;
  cat: "outfit" | "makeup" | "hair" | "body";
  thumbFile: string;
  options: BeautyOption[];
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BEAUTY TOOLS FULL DATA (mirrors beauty2.html TOOLS array)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const BEAUTY_TOOLS_FULL: BeautyToolFull[] = [
  // â”€â”€â”€ OUTFIT â”€â”€â”€
  {
    id: "outfit-change", name: "Outfit Change", nameAr: "ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ù…Ù„Ø§Ø¨Ø³", cat: "outfit", thumbFile: "outfit-change.png",
    options: [
      { id: "casual", name: "Casual", nameAr: "ÙƒØ§Ø¬ÙˆØ§Ù„", desc: "Ù…Ù„Ø§Ø¨Ø³ ÙŠÙˆÙ…ÙŠØ© Ù…Ø±ÙŠØ­Ø©" },
      { id: "elegant", name: "Elegant", nameAr: "Ø£Ù†ÙŠÙ‚", desc: "ÙØ³Ø§ØªÙŠÙ† Ø³Ù‡Ø±Ø© ÙˆØ£Ù†Ø§Ù‚Ø©" },
      { id: "sport", name: "Sport", nameAr: "Ø±ÙŠØ§Ø¶ÙŠ", desc: "Ù…Ù„Ø§Ø¨Ø³ Ø±ÙŠØ§Ø¶ÙŠØ©" },
      { id: "formal", name: "Formal", nameAr: "Ø±Ø³Ù…ÙŠ", desc: "Ø¨Ø¯Ù„Ø© ÙˆÙ…Ù„Ø§Ø¨Ø³ Ø¹Ù…Ù„" },
      { id: "streetwear", name: "Streetwear", nameAr: "Ø³ØªØ±ÙŠØª ÙˆÙŠØ±", desc: "Ø³ØªØ§ÙŠÙ„ Ø´Ø¨Ø§Ø¨ÙŠ Ø¹ØµØ±ÙŠ" },
      { id: "boho", name: "Boho", nameAr: "Ø¨ÙˆÙ‡Ùˆ", desc: "Ù„ÙˆÙƒ Ø¨ÙˆÙ‡ÙŠÙ…ÙŠ Ù†Ø§Ø¹Ù…" },
      { id: "vintage", name: "Vintage", nameAr: "ÙÙŠÙ†ØªØ¬", desc: "Ø¥Ø·Ù„Ø§Ù„Ø© ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ© Ù‚Ø¯ÙŠÙ…Ø©" },
    ],
  },
  {
    id: "evening-dress", name: "Evening Dress", nameAr: "ÙØ³Ø§ØªÙŠÙ† Ø³Ù‡Ø±Ø©", cat: "outfit", thumbFile: "evening-dress.png",
    options: [
      { id: "long-red", name: "Long Red", nameAr: "Ø·ÙˆÙŠÙ„ Ø£Ø­Ù…Ø±", desc: "ÙØ³ØªØ§Ù† Ø£Ø­Ù…Ø± ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ" },
      { id: "black-mini", name: "Black Mini", nameAr: "Ø£Ø³ÙˆØ¯ Ù‚ØµÙŠØ±", desc: "ÙØ³ØªØ§Ù† Ø£Ø³ÙˆØ¯ ØµØºÙŠØ±" },
      { id: "gold-sequin", name: "Gold Sequin", nameAr: "Ø°Ù‡Ø¨ÙŠ Ù„Ø§Ù…Ø¹", desc: "ÙØ³ØªØ§Ù† Ø³Ù‡Ø±Ø© Ø°Ù‡Ø¨ÙŠ" },
      { id: "emerald", name: "Emerald", nameAr: "Ø²Ù…Ø±Ø¯ÙŠ", desc: "ÙØ³ØªØ§Ù† Ø£Ø®Ø¶Ø± Ø²Ù…Ø±Ø¯ÙŠ" },
    ],
  },
  {
    id: "wedding-dress", name: "Wedding Dress", nameAr: "ÙØ³ØªØ§Ù† Ø²ÙØ§Ù", cat: "outfit", thumbFile: "wedding-dress.png",
    options: [
      { id: "ball-gown", name: "Ball Gown", nameAr: "Ù…Ù†ÙÙˆØ´ ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ", desc: "ÙØ³ØªØ§Ù† Ø£Ù…ÙŠØ±Ø§Øª" },
      { id: "mermaid", name: "Mermaid", nameAr: "Ù…ÙŠØ±Ù…ÙŠØ¯", desc: "ÙØ³ØªØ§Ù† Ø­ÙˆØ±ÙŠØ© Ø§Ù„Ø¨Ø­Ø±" },
      { id: "a-line", name: "A-Line", nameAr: "Ø£ÙŠÙ‡ Ù„Ø§ÙŠÙ†", desc: "Ù‚ØµØ© ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ© Ø£Ù†ÙŠÙ‚Ø©" },
      { id: "minimalist", name: "Minimalist", nameAr: "Ø¨Ø³ÙŠØ·", desc: "ÙØ³ØªØ§Ù† Ø¨Ø³ÙŠØ· Ø¹ØµØ±ÙŠ" },
    ],
  },
  {
    id: "traditional-wear", name: "Traditional Wear", nameAr: "Ø£Ø²ÙŠØ§Ø¡ ØªÙ‚Ù„ÙŠØ¯ÙŠØ©", cat: "outfit", thumbFile: "traditional-wear.png",
    options: [
      { id: "abaya", name: "Abaya", nameAr: "Ø¹Ø¨Ø§ÙŠØ©", desc: "Ø¹Ø¨Ø§ÙŠØ© Ø®Ù„ÙŠØ¬ÙŠØ© ÙØ§Ø®Ø±Ø©" },
      { id: "saree", name: "Saree", nameAr: "Ø³Ø§Ø±ÙŠ Ù‡Ù†Ø¯ÙŠ", desc: "Ø³Ø§Ø±ÙŠ Ù‡Ù†Ø¯ÙŠ Ù…Ù„ÙˆÙ†" },
      { id: "kimono", name: "Kimono", nameAr: "ÙƒÙŠÙ…ÙˆÙ†Ùˆ", desc: "ÙƒÙŠÙ…ÙˆÙ†Ùˆ ÙŠØ§Ø¨Ø§Ù†ÙŠ" },
      { id: "hanbok", name: "Hanbok", nameAr: "Ù‡Ø§Ù†Ø¨ÙˆÙƒ", desc: "Ù‡Ø§Ù†Ø¨ÙˆÙƒ ÙƒÙˆØ±ÙŠ" },
    ],
  },
  {
    id: "hijab-style", name: "Hijab Styling", nameAr: "Ø³ØªØ§ÙŠÙ„ Ø­Ø¬Ø§Ø¨", cat: "outfit", thumbFile: "hijab-styling.png",
    options: [
      { id: "turkish", name: "Turkish", nameAr: "ØªØ±ÙƒÙŠ", desc: "Ù„Ù ØªØ±ÙƒÙŠ Ø£Ù†ÙŠÙ‚" },
      { id: "khaleeji", name: "Khaleeji", nameAr: "Ø®Ù„ÙŠØ¬ÙŠ", desc: "Ø³ØªØ§ÙŠÙ„ Ø®Ù„ÙŠØ¬ÙŠ ÙØ§Ø®Ø±" },
      { id: "modern", name: "Modern", nameAr: "Ø¹ØµØ±ÙŠ", desc: "Ù„Ù Ø¹ØµØ±ÙŠ Ø¨Ø³ÙŠØ·" },
      { id: "turban", name: "Turban", nameAr: "ØªÙˆØ±Ø¨Ø§Ù†", desc: "ØªÙˆØ±Ø¨Ø§Ù† Ù…ÙˆØ¯ÙŠÙ„" },
    ],
  },
  {
    id: "cosplay", name: "Cosplay", nameAr: "ÙƒÙˆØ³Ø¨Ù„Ø§ÙŠ", cat: "outfit", thumbFile: "cosplay.png",
    options: [
      { id: "superhero", name: "Superhero", nameAr: "Ø¨Ø·Ù„ Ø®Ø§Ø±Ù‚", desc: "Ø²ÙŠ Ø£Ø¨Ø·Ø§Ù„ Ø®Ø§Ø±Ù‚ÙŠÙ†" },
      { id: "anime-char", name: "Anime", nameAr: "Ø´Ø®ØµÙŠØ© Ø£Ù†Ù…ÙŠ", desc: "Ø²ÙŠ Ø´Ø®ØµÙŠØ© Ø£Ù†Ù…ÙŠ" },
      { id: "medieval", name: "Medieval", nameAr: "Ù‚Ø±ÙˆØ³Ø·ÙŠ", desc: "Ø²ÙŠ ÙØ§Ø±Ø³ Ø£Ùˆ Ø£Ù…ÙŠØ±Ø©" },
      { id: "scifi", name: "Sci-Fi", nameAr: "Ø®ÙŠØ§Ù„ Ø¹Ù„Ù…ÙŠ", desc: "Ø²ÙŠ Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠ" },
    ],
  },

  // â”€â”€â”€ MAKEUP â”€â”€â”€
  {
    id: "full-glam", name: "Full Glam Makeup", nameAr: "Ù…ÙŠÙƒØ§Ø¨ ÙÙ„ Ù‚Ù„Ø§Ù…", cat: "makeup", thumbFile: "full-glam-makeup.png",
    options: [
      { id: "smokey", name: "Smokey Eye", nameAr: "Ø³Ù…ÙˆÙƒÙŠ Ø¢ÙŠ", desc: "Ø¹ÙŠÙˆÙ† Ø¯Ø®Ø§Ù†ÙŠØ© Ø¯Ø±Ø§Ù…ÙŠØ©" },
      { id: "glitter", name: "Glitter Glam", nameAr: "Ù‚Ù„ÙŠØªØ±", desc: "Ù…ÙŠÙƒØ§Ø¨ Ù„Ø§Ù…Ø¹ Ù„Ù„Ø³Ù‡Ø±Ø§Øª" },
      { id: "classic-red", name: "Classic Red", nameAr: "Ø£Ø­Ù…Ø± ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ", desc: "Ø±ÙˆØ¬ Ø£Ø­Ù…Ø± ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ" },
      { id: "nude-glam", name: "Soft Neutral Glam", nameAr: "Ø³ÙˆÙØª Ù†ÙŠÙˆØªØ±Ø§Ù„", desc: "Ù…ÙŠÙƒØ§Ø¨ Ù†Ø§Ø¹Ù… Ø¨Ø£Ù„ÙˆØ§Ù† Ù…Ø­Ø§ÙŠØ¯Ø©" },
    ],
  },
  {
    id: "korean-beauty", name: "Korean Beauty", nameAr: "Ù…ÙŠÙƒØ§Ø¨ ÙƒÙˆØ±ÙŠ", cat: "makeup", thumbFile: "korean-beauty.png",
    options: [
      { id: "glass-skin", name: "Glass Skin", nameAr: "Ø¨Ø´Ø±Ø© Ø²Ø¬Ø§Ø¬ÙŠØ©", desc: "Ø¨Ø´Ø±Ø© Ø´ÙØ§ÙØ© ÙˆÙ„Ø§Ù…Ø¹Ø©" },
      { id: "gradient-lip", name: "Gradient Lip", nameAr: "Ø´ÙØ§Ù‡ Ù…ØªØ¯Ø±Ø¬Ø©", desc: "Ø´ÙØ§Ù‡ ÙƒÙˆØ±ÙŠØ© Ù…ØªØ¯Ø±Ø¬Ø©" },
      { id: "fresh-look", name: "Fresh Look", nameAr: "Ù„ÙˆÙƒ Ù…Ù†Ø¹Ø´", desc: "ÙˆØ¬Ù‡ Ø·Ø¨ÙŠØ¹ÙŠ ÙˆÙ…Ù†Ø¹Ø´" },
    ],
  },
  {
    id: "arabic-makeup", name: "Arabic Makeup", nameAr: "Ù…ÙŠÙƒØ§Ø¨ Ø¹Ø±Ø¨ÙŠ", cat: "makeup", thumbFile: "arabic-makeup.png",
    options: [
      { id: "kohl-dramatic", name: "Dramatic Kohl", nameAr: "ÙƒØ­Ù„ Ø¯Ø±Ø§Ù…ÙŠ", desc: "ÙƒØ­Ù„ Ø¹Ø±ÙŠØ¶ ØªÙ‚Ù„ÙŠØ¯ÙŠ" },
      { id: "gold-arabic", name: "Gold Arabic", nameAr: "Ø°Ù‡Ø¨ÙŠ Ø¹Ø±Ø¨ÙŠ", desc: "Ø¸Ù„Ø§Ù„ Ø°Ù‡Ø¨ÙŠØ© ÙØ®Ù…Ø©" },
      { id: "bridal-arabic", name: "Bridal Arabic", nameAr: "Ø¹Ø±ÙˆØ³Ø© Ø¹Ø±Ø¨ÙŠØ©", desc: "Ù…ÙŠÙƒØ§Ø¨ Ø¹Ø±ÙˆØ³Ø© Ø¹Ø±Ø¨ÙŠØ©" },
    ],
  },
  {
    id: "lip-color", name: "Lip Color Try-On", nameAr: "ØªØ¬Ø±Ø¨Ø© Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ø±ÙˆØ¬", cat: "makeup", thumbFile: "lip-color-tryon.png",
    options: [
      { id: "red", name: "Red", nameAr: "Ø£Ø­Ù…Ø±", desc: "Ø£Ø­Ù…Ø± ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ" },
      { id: "nude", name: "Nude", nameAr: "Ù†ÙŠÙˆØ¯", desc: "Ø¨ÙŠØ¬ Ø·Ø¨ÙŠØ¹ÙŠ" },
      { id: "berry", name: "Berry", nameAr: "Ø¨ÙŠØ±ÙŠ", desc: "ØªÙˆØªÙŠ ØºØ§Ù…Ù‚" },
      { id: "pink", name: "Pink", nameAr: "ÙˆØ±Ø¯ÙŠ", desc: "ÙˆØ±Ø¯ÙŠ Ù†Ø§Ø¹Ù…" },
      { id: "brown", name: "Brown", nameAr: "Ø¨Ù†ÙŠ", desc: "Ø¨Ù†ÙŠ Ø¯Ø§ÙØ¦" },
    ],
  },
  {
    id: "eye-makeup", name: "Eye Makeup", nameAr: "Ù…ÙŠÙƒØ§Ø¨ Ø¹ÙŠÙˆÙ†", cat: "makeup", thumbFile: "eye-makeup.png",
    options: [
      { id: "cat-eye", name: "Cat Eye", nameAr: "ÙƒØ§Øª Ø¢ÙŠ", desc: "Ø¢ÙŠÙ„Ø§ÙŠÙ†Ø± Ù…Ø³Ø­ÙˆØ¨" },
      { id: "cut-crease", name: "Cut Crease", nameAr: "ÙƒØª ÙƒØ±ÙŠØ²", desc: "Ø¸Ù„Ø§Ù„ Ù…Ø­Ø¯Ø¯Ø©" },
      { id: "natural-eye", name: "Natural", nameAr: "Ø·Ø¨ÙŠØ¹ÙŠ", desc: "Ø¹ÙŠÙˆÙ† Ø·Ø¨ÙŠØ¹ÙŠØ© Ù†Ø§Ø¹Ù…Ø©" },
      { id: "glitter-eye", name: "Glitter", nameAr: "Ù‚Ù„ÙŠØªØ±", desc: "Ø¹ÙŠÙˆÙ† Ù„Ø§Ù…Ø¹Ø©" },
    ],
  },
  {
    id: "bridal-makeup", name: "Bridal Makeup", nameAr: "Ù…ÙŠÙƒØ§Ø¨ Ø¹Ø±ÙˆØ³", cat: "makeup", thumbFile: "bridal-makeup.png",
    options: [
      { id: "soft-bridal", name: "Soft & Romantic", nameAr: "Ù†Ø§Ø¹Ù… ÙˆØ±ÙˆÙ…Ø§Ù†Ø³ÙŠ", desc: "Ù„ÙˆÙƒ Ø¹Ø±ÙˆØ³Ø© Ù†Ø§Ø¹Ù…" },
      { id: "dramatic-bridal", name: "Dramatic", nameAr: "Ø¯Ø±Ø§Ù…ÙŠ", desc: "Ø¹Ø±ÙˆØ³Ø© Ø¨Ù…ÙŠÙƒØ§Ø¨ Ù‚ÙˆÙŠ" },
      { id: "boho-bridal", name: "Boho", nameAr: "Ø¨ÙˆÙ‡Ùˆ", desc: "Ø¹Ø±ÙˆØ³Ø© Ø¨ÙˆÙ‡ÙŠÙ…ÙŠØ©" },
    ],
  },
  {
    id: "skin-retouch", name: "Skin Retouch", nameAr: "ØªÙ†Ø¹ÙŠÙ… Ø§Ù„Ø¨Ø´Ø±Ø©", cat: "makeup", thumbFile: "skin-retouch.png",
    options: [
      { id: "light-retouch", name: "Light", nameAr: "Ø®ÙÙŠÙ", desc: "ØªÙ†Ø¹ÙŠÙ… Ø¨Ø³ÙŠØ· Ø·Ø¨ÙŠØ¹ÙŠ" },
      { id: "medium-retouch", name: "Medium", nameAr: "Ù…ØªÙˆØ³Ø·", desc: "ØªÙ†Ø¹ÙŠÙ… ÙˆØ§Ø¶Ø­" },
      { id: "full-retouch", name: "Full", nameAr: "ÙƒØ§Ù…Ù„", desc: "ØªÙ†Ø¹ÙŠÙ… ÙƒØ§Ù…Ù„ Ø§Ø­ØªØ±Ø§ÙÙŠ" },
    ],
  },

  // â”€â”€â”€ HAIR â”€â”€â”€
  {
    id: "hairstyle", name: "Hairstyle Change", nameAr: "ØªØºÙŠÙŠØ± Ù‚ØµØ© Ø§Ù„Ø´Ø¹Ø±", cat: "hair", thumbFile: "hairstyle-change.png",
    options: [
      { id: "bob", name: "Bob", nameAr: "Ø¨ÙˆØ¨ Ù‚ØµÙŠØ±", desc: "Ù‚ØµØ© Ø¨ÙˆØ¨ ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ©" },
      { id: "layers", name: "Layers", nameAr: "Ø·Ø¨Ù‚Ø§Øª", desc: "Ø·Ø¨Ù‚Ø§Øª Ø·ÙˆÙŠÙ„Ø©" },
      { id: "pixie", name: "Pixie", nameAr: "Ø¨ÙŠÙƒØ³ÙŠ", desc: "Ù‚ØµØ© Ø¨ÙŠÙƒØ³ÙŠ Ø¬Ø±ÙŠØ¦Ø©" },
      { id: "curly", name: "Curly", nameAr: "ÙƒÙŠØ±Ù„ÙŠ", desc: "Ø´Ø¹Ø± Ù…Ø¬Ø¹Ø¯" },
    ],
  },
  {
    id: "hair-color", name: "Hair Color", nameAr: "Ù„ÙˆÙ† Ø§Ù„Ø´Ø¹Ø±", cat: "hair", thumbFile: "hair-color.png",
    options: [
      { id: "blonde", name: "Blonde", nameAr: "Ø£Ø´Ù‚Ø±", desc: "Ø£Ø´Ù‚Ø± Ø°Ù‡Ø¨ÙŠ" },
      { id: "red-hair", name: "Red", nameAr: "Ø£Ø­Ù…Ø±", desc: "Ø£Ø­Ù…Ø± Ù†Ø§Ø±ÙŠ" },
      { id: "platinum", name: "Platinum", nameAr: "Ø¨Ù„Ø§ØªÙŠÙ†ÙŠ", desc: "Ø¨Ù„Ø§ØªÙŠÙ†ÙŠ ÙØ§ØªØ­" },
      { id: "ombre", name: "Ombre", nameAr: "Ø£ÙˆÙ…Ø¨Ø±ÙŠÙ‡", desc: "ØªØ¯Ø±Ø¬ Ù„ÙˆÙ†ÙŠ" },
      { id: "chocolate", name: "Chocolate", nameAr: "Ø´ÙˆÙƒÙˆÙ„Ø§", desc: "Ø¨Ù†ÙŠ Ø´ÙˆÙƒÙˆÙ„Ø§" },
    ],
  },
  {
    id: "beard-style", name: "Beard Styles", nameAr: "Ø³ØªØ§ÙŠÙ„ Ù„Ø­ÙŠØ©", cat: "hair", thumbFile: "beard-style.png",
    options: [
      { id: "full-beard", name: "Full Beard", nameAr: "Ù„Ø­ÙŠØ© ÙƒØ§Ù…Ù„Ø©", desc: "Ù„Ø­ÙŠØ© ÙƒØ«ÙŠÙØ© ÙƒØ§Ù…Ù„Ø©" },
      { id: "goatee", name: "Goatee", nameAr: "Ø°Ù‚Ù†", desc: "Ø°Ù‚Ù† ÙÙ‚Ø·" },
      { id: "stubble", name: "Stubble", nameAr: "Ø®ÙÙŠÙØ©", desc: "Ù„Ø­ÙŠØ© Ø®ÙÙŠÙØ©" },
      { id: "clean-shave", name: "Clean Shave", nameAr: "Ø­Ù„ÙŠÙ‚", desc: "Ø¨Ø¯ÙˆÙ† Ù„Ø­ÙŠØ©" },
    ],
  },
  {
    id: "bangs", name: "Bangs Try-On", nameAr: "ØªØ¬Ø±Ø¨Ø© ØºØ±Ø©", cat: "hair", thumbFile: "bangs-tryon.png",
    options: [
      { id: "straight-bangs", name: "Straight", nameAr: "Ø³ØªØ±ÙŠØª", desc: "ØºØ±Ø© Ù…Ø³ØªÙ‚ÙŠÙ…Ø©" },
      { id: "curtain-bangs", name: "Curtain", nameAr: "ÙƒÙŠØ±ØªÙ†", desc: "ØºØ±Ø© Ø¬Ø§Ù†Ø¨ÙŠØ©" },
      { id: "side-bangs", name: "Side Swept", nameAr: "Ø¬Ø§Ù†Ø¨ÙŠØ©", desc: "ØºØ±Ø© Ù…Ø³Ø­ÙˆØ¨Ø©" },
      { id: "wispy-bangs", name: "Wispy", nameAr: "Ø®ÙÙŠÙØ©", desc: "ØºØ±Ø© Ø®ÙÙŠÙØ© Ø´ÙØ§ÙØ©" },
    ],
  },
  {
    id: "braids", name: "Braids & Updos", nameAr: "Ø¶ÙØ§Ø¦Ø± ÙˆØªØ³Ø±ÙŠØ­Ø§Øª", cat: "hair", thumbFile: "braids-updos.png",
    options: [
      { id: "french-braid", name: "French Braid", nameAr: "Ø¶ÙÙŠØ±Ø© ÙØ±Ù†Ø³ÙŠØ©", desc: "Ø¶ÙÙŠØ±Ø© ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ©" },
      { id: "fishtail", name: "Fishtail", nameAr: "Ø°ÙŠÙ„ Ø³Ù…ÙƒØ©", desc: "Ø¶ÙÙŠØ±Ø© Ø°ÙŠÙ„ Ø³Ù…ÙƒØ©" },
      { id: "chignon", name: "Chignon", nameAr: "Ø´Ù†ÙŠÙˆÙ†", desc: "ÙƒØ¹ÙƒØ© Ø£Ù†ÙŠÙ‚Ø©" },
      { id: "messy-bun", name: "Messy Bun", nameAr: "ÙƒØ¹ÙƒØ© Ø¹Ø´ÙˆØ§Ø¦ÙŠØ©", desc: "ÙƒØ¹ÙƒØ© ÙƒØ§Ø¬ÙˆØ§Ù„" },
    ],
  },
  {
    id: "extensions", name: "Hair Extensions", nameAr: "Ø¥ÙƒØ³ØªÙ†Ø´Ù†", cat: "hair", thumbFile: "hair-extensions.png",
    options: [
      { id: "medium-ext", name: "Medium", nameAr: "Ù…ØªÙˆØ³Ø·", desc: "Ø¥Ø¶Ø§ÙØ© Ø·ÙˆÙ„ Ù…ØªÙˆØ³Ø·" },
      { id: "long-ext", name: "Long", nameAr: "Ø·ÙˆÙŠÙ„", desc: "Ø´Ø¹Ø± Ø·ÙˆÙŠÙ„ Ø¬Ø¯Ø§Ù‹" },
      { id: "volume-ext", name: "Volume", nameAr: "ÙƒØ«Ø§ÙØ©", desc: "ÙƒØ«Ø§ÙØ© Ø¨Ø¯ÙˆÙ† Ø·ÙˆÙ„" },
    ],
  },
  {
    id: "balayage", name: "Balayage", nameAr: "Ø¨Ø§Ù„Ø§ÙŠØ§Ø¬ ÙˆÙ‡Ø§ÙŠÙ„Ø§ÙŠØª", cat: "hair", thumbFile: "balayage.png",
    options: [
      { id: "sun-kissed", name: "Sun-Kissed", nameAr: "Ù„Ù…Ø³Ø© Ø´Ù…Ø³", desc: "Ø¨Ø§Ù„Ø§ÙŠØ§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ" },
      { id: "caramel-hl", name: "Caramel", nameAr: "ÙƒØ±Ø§Ù…ÙŠÙ„", desc: "Ù‡Ø§ÙŠÙ„Ø§ÙŠØª ÙƒØ±Ø§Ù…ÙŠÙ„ÙŠ" },
      { id: "ash-hl", name: "Ash", nameAr: "Ø±Ù…Ø§Ø¯ÙŠ", desc: "Ù‡Ø§ÙŠÙ„Ø§ÙŠØª Ø±Ù…Ø§Ø¯ÙŠ" },
    ],
  },

  // â”€â”€â”€ BODY â”€â”€â”€
  {
    id: "lip-enhancement", name: "Lip Enhancement", nameAr: "ØªÙƒØ¨ÙŠØ± Ø§Ù„Ø´ÙØ§ÙŠÙ", cat: "body", thumbFile: "lip-enhancement.png",
    options: [
      { id: "lip-natural", name: "Natural", nameAr: "Ø·Ø¨ÙŠØ¹ÙŠ", desc: "ØªØ¹Ø±ÙŠÙ Ø®ÙÙŠÙ ÙˆØ¯Ù‚ÙŠÙ‚" },
      { id: "lip-medium", name: "Medium", nameAr: "Ù…ØªÙˆØ³Ø·", desc: "Ø§Ù…ØªÙ„Ø§Ø¡ Ù…Ø¹ØªØ¯Ù„" },
      { id: "lip-full", name: "Full", nameAr: "Ù…Ù…ØªÙ„Ø¦", desc: "Ø­Ø¬Ù… ÙˆØ§Ø¶Ø­" },
      { id: "lip-extra", name: "Extra Full", nameAr: "Ù…Ù…ØªÙ„Ø¦ Ø¬Ø¯Ø§Ù‹", desc: "Ø­Ø¬Ù… ÙƒØ¨ÙŠØ± ÙˆØ´ÙƒÙ„ Ø¨Ø§Ø±Ø²" },
      { id: "lip-hollywood", name: "Hollywood", nameAr: "Ù‡ÙˆÙ„ÙŠÙˆÙˆØ¯", desc: "Ø£Ù‚ØµÙ‰ Ø­Ø¬Ù… ÙˆØ§Ù…ØªÙ„Ø§Ø¡" },
    ],
  },
  {
    id: "slim-body", name: "Slim Body", nameAr: "ØªÙ†Ø­ÙŠÙ Ø§Ù„Ø¬Ø³Ù…", cat: "body", thumbFile: "slim-body.png",
    options: [
      { id: "slim-light", name: "Light", nameAr: "Ø®ÙÙŠÙ", desc: "ØªÙ†Ø­ÙŠÙ Ø¨Ø³ÙŠØ· Ø·Ø¨ÙŠØ¹ÙŠ" },
      { id: "slim-moderate", name: "Moderate", nameAr: "Ù…ØªÙˆØ³Ø·", desc: "Ø®ØµØ± Ø£ØµØºØ± ÙˆØ¬Ø³Ù… Ø£Ù†Ø­Ù" },
      { id: "slim-dramatic", name: "Dramatic", nameAr: "Ø¯Ø±Ø§Ù…ÙŠ", desc: "ØªØ­ÙˆÙ„ ÙƒØ¨ÙŠØ± ÙÙŠ Ø§Ù„Ø´ÙƒÙ„" },
    ],
  },
  {
    id: "muscle-enhance", name: "Muscle Enhancement", nameAr: "Ø¥Ø¨Ø±Ø§Ø² Ø§Ù„Ø¹Ø¶Ù„Ø§Øª", cat: "body", thumbFile: "muscle-enhance.png",
    options: [
      { id: "mus-toned", name: "Toned", nameAr: "Ù…ØªÙ†Ø§Ø³Ù‚", desc: "Ø¬Ø³Ù… Ø±ÙŠØ§Ø¶ÙŠ Ø®ÙÙŠÙ" },
      { id: "mus-athletic", name: "Athletic", nameAr: "Ø±ÙŠØ§Ø¶ÙŠ", desc: "Ø¹Ø¶Ù„Ø§Øª ÙˆØ§Ø¶Ø­Ø©" },
      { id: "mus-bodybuilder", name: "Bodybuilder", nameAr: "Ø¨ÙˆØ¯ÙŠ Ø¨Ù„Ø¯Ø±", desc: "Ø¹Ø¶Ù„Ø§Øª Ø¶Ø®Ù…Ø©" },
    ],
  },
  {
    id: "nose-reshape", name: "Nose Reshape", nameAr: "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£Ù†Ù", cat: "body", thumbFile: "nose-reshape.png",
    options: [
      { id: "nose-refine", name: "Refined", nameAr: "Ù…Ù‡Ø°Ø¨", desc: "ØªØµØºÙŠØ± Ø®ÙÙŠÙ ÙˆØªÙ†Ø¹ÙŠÙ…" },
      { id: "nose-slim", name: "Slim", nameAr: "Ù†Ø­ÙŠÙ", desc: "Ø£Ù†Ù Ø£Ù†Ø­Ù ÙˆØ£Ø¶ÙŠÙ‚" },
      { id: "nose-button", name: "Button", nameAr: "ØµØºÙŠØ±", desc: "Ø£Ù†Ù ØµØºÙŠØ± Ù…Ø±ÙÙˆØ¹" },
      { id: "nose-straight", name: "Straight", nameAr: "Ù…Ø³ØªÙ‚ÙŠÙ…", desc: "Ø£Ù†Ù Ù…Ø³ØªÙ‚ÙŠÙ… ÙˆÙ…Ø­Ø¯Ø¯" },
    ],
  },
  {
    id: "skin-tan", name: "Skin Tan", nameAr: "ØªØ³Ù…ÙŠØ± Ø§Ù„Ø¨Ø´Ø±Ø©", cat: "body", thumbFile: "skin-tan.png",
    options: [
      { id: "fair", name: "Fair", nameAr: "ÙØ§ØªØ­", desc: "Ø¨Ø´Ø±Ø© ÙØ§ØªØ­Ø© Ø¬Ø¯Ø§Ù‹" },
      { id: "light-tan", name: "Light Tan", nameAr: "ØªØ§Ù† Ø®ÙÙŠÙ", desc: "Ø³Ù…Ø±Ø© Ø®ÙÙŠÙØ©" },
      { id: "golden-tan", name: "Golden", nameAr: "Ø°Ù‡Ø¨ÙŠ", desc: "ØªØ§Ù† Ø°Ù‡Ø¨ÙŠ ØµÙŠÙÙŠ" },
      { id: "deep-tan", name: "Deep", nameAr: "ØºØ§Ù…Ù‚", desc: "Ø³Ù…Ø±Ø© ØºØ§Ù…Ù‚Ø©" },
    ],
  },
];

const BEAUTY_CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: "all", label: "All", color: "bg-violet-600" },
  { id: "outfit", label: "Outfit", color: "bg-pink-600" },
  { id: "makeup", label: "Makeup", color: "bg-rose-600" },
  { id: "hair", label: "Hair", color: "bg-amber-600" },
  { id: "body", label: "Body", color: "bg-cyan-600" },
];

const CAT_BADGE: Record<string, string> = {
  outfit: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  makeup: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  hair: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  body: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TRANSITION PRESET CATEGORY COLORS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const CATEGORY_COLORS: Record<string, string> = {
  transformation: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  fx_material: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  camera_motion: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  object_reveal: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  stylized_special: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   UPLOAD HELPER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadToSupabase(
  file: File
): Promise<{ publicUrl: string; isVideo: boolean }> {
  const signRes = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err?.error ?? "Failed to get upload URL");
  }
  const { signedUrl, publicUrl, isVideo } = (await signRes.json()) as {
    signedUrl: string;
    publicUrl: string;
    isVideo: boolean;
  };
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Upload to storage failed");
  return { publicUrl, isVideo };
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TRANSITION CARD
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TransitionCard({
  preset,
  onUpload,
  uploading,
}: {
  preset: PresetMedia;
  onUpload: (presetId: string, file: File) => void;
  uploading: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const hasVideo = !!preset.previewVideoUrl;
  const isUploading = uploading === preset.id;
  const catColor =
    CATEGORY_COLORS[preset.category] ??
    "bg-slate-500/20 text-slate-300 border-slate-500/30";

  useEffect(() => {
    if (videoRef.current && hasVideo) {
      if (hovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [hovering, hasVideo]);

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 transition-all hover:border-slate-600 hover:shadow-xl hover:shadow-black/30"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={preset.previewVideoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
              <CheckCircle2 className="w-3 h-3" /> Video Ready
            </div>
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${preset.previewGradient} flex flex-col items-center justify-center gap-2`}
          >
            <Film className="w-8 h-8 text-white/20" />
            <span className="text-[10px] text-white/30 font-semibold">No Preview Video</span>
          </div>
        )}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity ${hovering ? "opacity-100" : "opacity-0"}`}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {isUploading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> {hasVideo ? "Replace Video" : "Upload Video"}</>
            )}
          </button>
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-[9px] font-bold text-amber-300">
          x{preset.costMultiplier}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-bold text-slate-200 truncate">{preset.name}</h3>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColor} whitespace-nowrap`}>
            {preset.category.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{preset.description}</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(preset.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BEAUTY OPTION CARD (image or video upload for each option)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function OptionUploadCard({
  toolId,
  option,
  uploadedUrl,
  uploadedType,
  uploading,
  onUpload,
}: {
  toolId: string;
  option: BeautyOption;
  uploadedUrl: string;
  uploadedType: string;
  uploading: boolean;
  onUpload: (toolId: string, optionId: string, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);
  const hasMedia = !!uploadedUrl;
  const isVideo = uploadedType === "video";
  const fallbackImg = `/img/beauty-options/${toolId}/default.jpg`;

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-black/20"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-[3/4] bg-slate-950 overflow-hidden">
        {hasMedia && isVideo ? (
          <video
            src={uploadedUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : (
          <img
            src={hasMedia ? uploadedUrl : fallbackImg}
            alt={option.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
        )}

        {/* Status badge */}
        {hasMedia ? (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[8px] font-bold">
            {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
            {isVideo ? "Video" : "Image"}
          </div>
        ) : (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[8px] font-bold">
            Default
          </div>
        )}

        {/* Upload overlay */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-opacity ${hovering ? "opacity-100" : "opacity-0"}`}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {uploading ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3 h-3" /> Upload Image/Video</>
            )}
          </button>
        </div>
      </div>

      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h4 className="text-xs font-bold text-slate-200 truncate">{option.name}</h4>
          <span className="text-[9px] text-slate-600 truncate">{option.nameAr}</span>
        </div>
        <p className="text-[10px] text-slate-500 truncate">{option.desc}</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(toolId, option.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BEAUTY TOOL ROW (thumbnail + expand to options)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function BeautyToolRow({
  tool,
  isOpen,
  onToggle,
  onThumbUpload,
  onOptionUpload,
  thumbUploading,
  optionUploading,
  optionMedia,
}: {
  tool: BeautyToolFull;
  isOpen: boolean;
  onToggle: () => void;
  onThumbUpload: (toolId: string, file: File) => void;
  onOptionUpload: (toolId: string, optionId: string, file: File) => void;
  thumbUploading: boolean;
  optionUploading: string | null;
  optionMedia: Record<string, { url: string; type: string }>;
}) {
  const thumbRef = useRef<HTMLInputElement>(null);
  const catBadge = CAT_BADGE[tool.cat] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return (
    <div className={`rounded-xl border transition-all ${isOpen ? "border-violet-500/40 bg-slate-900/80" : "border-slate-700/60 bg-slate-900/40"}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-3 cursor-pointer hover:bg-slate-800/30 transition-colors rounded-xl"
        onClick={onToggle}
      >
        {/* Thumbnail */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0 group">
          <img
            src={`/img/beauty-tools/${tool.thumbFile}`}
            alt={tool.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
          />
          <div
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); thumbRef.current?.click(); }}
          >
            {thumbUploading ? (
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-white" />
            )}
          </div>
          <input
            ref={thumbRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onThumbUpload(tool.id, f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-200 truncate">{tool.name}</h3>
            <span className="text-[10px] text-slate-500">{tool.nameAr}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catBadge}`}>
              {tool.cat}
            </span>
            <span className="text-[10px] text-slate-600">
              {tool.options.length} options
            </span>
            <span className="text-[10px] text-slate-700">|</span>
            <span className="text-[10px] text-slate-600 font-mono">
              {tool.thumbFile}
            </span>
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-violet-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-600" />
          )}
        </div>
      </div>

      {/* Expanded options grid */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              <div className="border-t border-slate-800 pt-3 mb-3">
                <p className="text-[11px] text-slate-500 mb-3">
                  Upload image or video for each option â€” these appear when users select this tool
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {tool.options.map((opt) => {
                  const media = optionMedia[`${tool.id}/${opt.id}`];
                  return (
                    <OptionUploadCard
                      key={opt.id}
                      toolId={tool.id}
                      option={opt}
                      uploadedUrl={media?.url ?? ""}
                      uploadedType={media?.type ?? ""}
                      uploading={optionUploading === `${tool.id}/${opt.id}`}
                      onUpload={onOptionUpload}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PROMO UPLOAD ZONE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function PromoUploadZone({
  onUpload,
  uploads,
  onRemove,
}: {
  onUpload: (files: FileList) => void;
  uploads: { url: string; type: string; name: string }[];
  onRemove: (idx: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files);
    },
    [onUpload]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragging ? "border-violet-500 bg-violet-500/5" : "border-slate-700 bg-slate-900/30 hover:border-slate-600"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-700/10 border border-violet-500/20 flex items-center justify-center">
            <Upload className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Drop files here or click to upload</p>
            <p className="text-xs text-slate-500 mt-1">Videos (MP4, WebM) or Images (PNG, JPG, WebP)</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {uploads.map((u, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/40">
              {u.type.startsWith("video") ? (
                <video src={u.url} className="w-full aspect-video object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={u.url} alt={u.name} className="w-full aspect-video object-cover" />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => onRemove(idx)} className="p-2 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600/50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-slate-400 truncate">{u.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION TABS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const SECTIONS: { id: AssetSection; label: string; icon: React.ElementType }[] = [
  { id: "transitions", label: "Transitions", icon: Film },
  { id: "beauty-tools", label: "Beauty Studio", icon: Sparkles },
  { id: "promo", label: "Promo & Ads", icon: Megaphone },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STATS BAR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function StatsBar({ presets, optionMedia }: { presets: PresetMedia[]; optionMedia: Record<string, { url: string; type: string }> }) {
  const withVideo = presets.filter((p) => p.previewVideoUrl).length;
  const totalOptions = BEAUTY_TOOLS_FULL.reduce((s, t) => s + t.options.length, 0);
  const optionsWithMedia = Object.keys(optionMedia).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-violet-500/20 p-4">
        <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Transitions</p>
        <p className="text-2xl font-black text-white mt-1">{presets.length}</p>
        <p className="text-[10px] text-violet-500">{withVideo} with preview</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-600/5 border border-pink-500/20 p-4">
        <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Beauty Tools</p>
        <p className="text-2xl font-black text-pink-300 mt-1">{BEAUTY_TOOLS_FULL.length}</p>
        <p className="text-[10px] text-pink-500">4 categories</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 p-4">
        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Total Options</p>
        <p className="text-2xl font-black text-amber-300 mt-1">{totalOptions}</p>
        <p className="text-[10px] text-amber-500">{optionsWithMedia} with media</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/20 p-4">
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Coverage</p>
        <p className="text-2xl font-black text-emerald-300 mt-1">
          {totalOptions > 0 ? Math.round((optionsWithMedia / totalOptions) * 100) : 0}%
        </p>
        <p className="text-[10px] text-emerald-500">option media filled</p>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN PAGE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function PageBuilderPage() {
  const [section, setSection] = useState<AssetSection>("transitions");
  const [presets, setPresets] = useState<PresetMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [promoUploads, setPromoUploads] = useState<{ url: string; type: string; name: string }[]>([]);
  const [promoUploading, setPromoUploading] = useState(false);

  // Beauty state
  const [beautyCat, setBeautyCat] = useState("all");
  const [beautySearch, setBeautySearch] = useState("");
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [thumbUploading, setThumbUploading] = useState<string | null>(null);
  const [optionUploading, setOptionUploading] = useState<string | null>(null);
  const [optionMedia, setOptionMedia] = useState<Record<string, { url: string; type: string }>>({});

  // Load transition presets
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/presets/media")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.presets)) setPresets(data.presets);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load saved beauty option media from API
  useEffect(() => {
    fetch("/api/admin/beauty/media")
      .then((r) => r.json())
      .then((data) => {
        if (data.media && typeof data.media === "object") setOptionMedia(data.media);
      })
      .catch(() => {});
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // â”€â”€â”€ Transition upload â”€â”€â”€
  const handleTransitionUpload = async (presetId: string, file: File) => {
    setUploading(presetId);
    try {
      const { publicUrl } = await uploadToSupabase(file);
      const res = await fetch("/api/admin/presets/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId, previewVideoUrl: publicUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to save");
      setPresets((prev) => prev.map((p) => (p.id === presetId ? { ...p, previewVideoUrl: publicUrl } : p)));
      setToast({ msg: `Preview uploaded for "${presets.find((p) => p.id === presetId)?.name}"`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setUploading(null);
    }
  };

  // â”€â”€â”€ Beauty thumbnail upload â”€â”€â”€
  const handleThumbUpload = async (toolId: string, file: File) => {
    setThumbUploading(toolId);
    try {
      const { publicUrl } = await uploadToSupabase(file);
      // Save via API
      await fetch("/api/admin/beauty/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, type: "thumb", url: publicUrl }),
      });
      setToast({ msg: `Thumbnail uploaded for "${toolId}"`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setThumbUploading(null);
    }
  };

  // â”€â”€â”€ Beauty option media upload â”€â”€â”€
  const handleOptionUpload = async (toolId: string, optionId: string, file: File) => {
    const key = `${toolId}/${optionId}`;
    setOptionUploading(key);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      // Save via API
      await fetch("/api/admin/beauty/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, optionId, type: "option", url: publicUrl, mediaType: isVideo ? "video" : "image" }),
      });
      setOptionMedia((prev) => ({ ...prev, [key]: { url: publicUrl, type: isVideo ? "video" : "image" } }));
      setToast({ msg: `Media uploaded for "${optionId}"`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setOptionUploading(null);
    }
  };

  // â”€â”€â”€ Promo upload â”€â”€â”€
  const handlePromoUpload = async (files: FileList) => {
    setPromoUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { publicUrl } = await uploadToSupabase(file);
        setPromoUploads((prev) => [...prev, { url: publicUrl, type: file.type, name: file.name }]);
      }
      setToast({ msg: `${files.length} promo asset(s) uploaded`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setPromoUploading(false);
    }
  };

  // â”€â”€â”€ Filters â”€â”€â”€
  const transitionCategories = ["all", ...Array.from(new Set(presets.map((p) => p.category)))];
  const filteredPresets = presets.filter((p) => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredBeautyTools = BEAUTY_TOOLS_FULL.filter((t) => {
    if (beautyCat !== "all" && t.cat !== beautyCat) return false;
    if (beautySearch && !t.name.toLowerCase().includes(beautySearch.toLowerCase()) && !t.nameAr.includes(beautySearch)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* â•â•â• HEADER â•â•â• */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-none">Media Asset Manager</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Transitions, Beauty Tools & Promo Media</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/apps/tool/transitions" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-slate-800 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Transitions
            </a>
            <a href="/beauty2.html" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-pink-300 hover:text-pink-200 hover:bg-slate-800 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Beauty
            </a>
            <a href="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-300 border border-slate-800 bg-slate-900/50 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Admin
            </a>
          </div>
        </div>
      </header>

      {/* â•â•â• BODY â•â•â• */}
      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        <StatsBar presets={presets} optionMedia={optionMedia} />

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  isActive ? "border-violet-500 text-violet-300" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* â•â•â• TRANSITIONS â•â•â• */}
        {section === "transitions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transitions..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                />
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700 flex-wrap">
                {transitionCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      catFilter === cat ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-600">{filteredPresets.length} of {presets.length}</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse">
                    <div className="aspect-video bg-slate-800/60 rounded-t-xl" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800/60 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPresets.map((preset) => (
                  <TransitionCard key={preset.id} preset={preset} onUpload={handleTransitionUpload} uploading={uploading} />
                ))}
                {filteredPresets.length === 0 && (
                  <div className="col-span-full py-16 text-center">
                    <Film className="w-10 h-10 mx-auto text-slate-800 mb-3" />
                    <p className="text-sm text-slate-600">No transitions match your filter</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* â•â•â• BEAUTY STUDIO â•â•â• */}
        {section === "beauty-tools" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={beautySearch}
                  onChange={(e) => setBeautySearch(e.target.value)}
                  placeholder="Search beauty tools..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                />
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700">
                {BEAUTY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBeautyCat(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      beautyCat === cat.id ? `${cat.color} text-white` : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-600">
                {filteredBeautyTools.length} tools &middot;{" "}
                {filteredBeautyTools.reduce((s, t) => s + t.options.length, 0)} options
              </span>
            </div>

            {/* Tool list */}
            <div className="space-y-2">
              {filteredBeautyTools.map((tool) => (
                <BeautyToolRow
                  key={tool.id}
                  tool={tool}
                  isOpen={openTool === tool.id}
                  onToggle={() => setOpenTool(openTool === tool.id ? null : tool.id)}
                  onThumbUpload={handleThumbUpload}
                  onOptionUpload={handleOptionUpload}
                  thumbUploading={thumbUploading === tool.id}
                  optionUploading={optionUploading}
                  optionMedia={optionMedia}
                />
              ))}
              {filteredBeautyTools.length === 0 && (
                <div className="py-16 text-center">
                  <Sparkles className="w-10 h-10 mx-auto text-slate-800 mb-3" />
                  <p className="text-sm text-slate-600">No beauty tools match your filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* â•â•â• PROMO â•â•â• */}
        {section === "promo" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Promotional Media</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Upload videos and images for ads, banners, and promo across the site.</p>
              </div>
              {promoUploading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </div>
              )}
            </div>
            <PromoUploadZone onUpload={handlePromoUpload} uploads={promoUploads} onRemove={(idx) => setPromoUploads((p) => p.filter((_, i) => i !== idx))} />
          </div>
        )}
      </div>

      {/* â•â•â• TOAST â•â•â• */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl shadow-black/40 border text-sm font-semibold ${
              toast.type === "ok"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                : "bg-red-950/90 border-red-500/30 text-red-200"
            }`}
          >
            {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
