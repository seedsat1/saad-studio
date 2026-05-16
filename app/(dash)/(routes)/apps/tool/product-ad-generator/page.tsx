"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Eye,
  ShoppingBag,
  Package,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const CREDIT_COST_PER_SCENE = 3;
const DEFAULT_SCENES = 8;

type GenerationStatus = "idle" | "generating" | "success" | "failed";

interface ProductScene {
  id: string;
  imageUrl: string;
  description: string;
}

const PRODUCT_STYLES = [
  { id: "skincare", label: "Skincare & Beauty", icon: "💄" },
  { id: "luxury", label: "Luxury Product", icon: "✨" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌿" },
  { id: "minimalist", label: "Minimalist & Clean", icon: "⚪" },
  { id: "vibrant", label: "Vibrant & Bold", icon: "🎨" },
] as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, maxBytes = 2_500_000, maxSide = 2048): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIDE = maxSide;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

function getProductAdPrompt(style: string, productName: string, numScenes: number): string {
  const styleDescriptions: Record<string, string> = {
    skincare: "White clean background, professional lighting, showcasing skincare product with natural beauty",
    luxury: "Premium aesthetic with elegant composition, luxury lighting, sophisticated styling",
    lifestyle: "Natural and relatable scenarios with the product, warm ambient lighting",
    minimalist: "Pure white background, minimalist composition, focus on product details",
    vibrant: "Colorful and dynamic scenes, energetic composition, modern styling",
  };

  const description = styleDescriptions[style] || styleDescriptions.skincare;

  return `Generate ${numScenes} professional product advertisement scenes for "${productName}". 
Each scene should show:
- Different camera angles and compositions (close-up, medium, wide shots, hand shots, product detail shots)
- ${description}
- Consistent model/person appearance across all scenes
- Consistent product appearance and branding
- Professional advertisement quality
- Movie-like lighting and cinematography

Scenes should tell a story of the product usage, from introduction to application/satisfaction. 
Generate realistic, high-quality advertisement photography suitable for social media and marketing campaigns.`;
}

export default function ProductAdGeneratorPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productStyle, setProductStyle] = useState<string>("skincare");
  const [numScenes, setNumScenes] = useState(DEFAULT_SCENES);
  const [isDragging, setIsDragging] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [scenes, setScenes] = useState<ProductScene[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<{ id: string; url: string; prompt: string; model: string; date: string }[]>([]);

  const isGenerating = generationStatus === "generating";
  const totalCreditsNeeded = numScenes * CREDIT_COST_PER_SCENE;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/assets?type=image", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.assets) || cancelled) return;
        const adAssets = data.assets.filter((a: { model?: string }) =>
          a.model?.includes("product-ad-generator")
        );
        setHistory(
          adAssets.map((a: { id: string; url: string; prompt?: string; model?: string; date?: string }) => ({
            id: a.id,
            url: a.url,
            prompt: a.prompt || "Product Ad Scene",
            model: a.model || "Product Ad Generator",
            date: a.date || "",
          }))
        );
      } catch {
        /* ignore */
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setScenes([]);
    setGenerationStatus("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  async function handleGenerate() {
    if (isGenerating || !imageDataUrl || !productName.trim()) return;

    const gate = await guardGeneration({
      requiredCredits: totalCreditsNeeded,
      action: "apps:product-ad-generator",
    });

    if (!gate.ok) {
      if (gate.reason === "error") {
        setErrorMessage(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setScenes([]);
    setErrorMessage("");
    setGenerationStatus("generating");

    try {
      const compressed = await compressImage(imageDataUrl, 2_500_000, 1024);

      const prompt = getProductAdPrompt(productStyle, productName, numScenes);

      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          modelId: "qwen-image-edit-multiple-angles",
          numImages: numScenes,
          imageUrl: compressed,
          quality: "1k",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Generation failed");
      }

      if (data.imageUrls && Array.isArray(data.imageUrls)) {
        const newScenes: ProductScene[] = data.imageUrls.map((url: string, idx: number) => ({
          id: `scene-${idx}`,
          imageUrl: url,
          description: `Scene ${idx + 1} of ${numScenes}`,
        }));
        setScenes(newScenes);
        setGenerationStatus("success");
      } else {
        throw new Error("No images returned from generation");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(errorMsg);
      setGenerationStatus("failed");
    }
  }

  return (
    <div className={`${outfit.variable} ${plusJakarta.variable} min-h-screen flex flex-col bg-[#0f1225]`}>
      {/* Header */}
      <div className="border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 py-4">
        <Link href="/apps" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Apps</span>
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Product Ad Generator</h1>
            <p className="text-sm text-white/40">Create professional advertisement scenes for your product</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Controls */}
            <div className="lg:col-span-1">
              <div className="space-y-6 sticky top-8">
                {/* Reference Image Upload */}
                <div>
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    Product Image
                  </h2>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                      isDragging
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-white/20 hover:border-white/40 bg-white/5"
                    }`}
                  >
                    {imageDataUrl ? (
                      <div className="relative group">
                        <img src={imageDataUrl} alt="Product" className="w-full h-32 object-cover rounded-lg" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); }}
                          className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500/80 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                        <p className="text-sm text-white/60">Drop product image or click to upload</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label className="text-sm font-semibold text-white mb-2 block">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Face Serum, Skincare Cream"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>

                {/* Style Selection */}
                <div>
                  <label className="text-sm font-semibold text-white mb-3 block">Ad Style</label>
                  <div className="space-y-2">
                    {PRODUCT_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setProductStyle(style.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          productStyle === style.id
                            ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-100"
                            : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        <span className="mr-2">{style.icon}</span>
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Scenes */}
                <div>
                  <label className="text-sm font-semibold text-white mb-2 block">Number of Scenes</label>
                  <select
                    value={numScenes}
                    onChange={(e) => setNumScenes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    {[4, 6, 8, 12, 16].map((n) => (
                      <option key={n} value={n}>
                        {n} Scenes ({n * CREDIT_COST_PER_SCENE} credits)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !imageDataUrl || !productName.trim()}
                  className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Scenes
                    </>
                  )}
                </button>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{errorMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Gallery */}
            <div className="lg:col-span-2">
              {scenes.length > 0 ? (
                <div>
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Generated Scenes ({scenes.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {scenes.map((scene) => (
                      <motion.div
                        key={scene.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative rounded-xl overflow-hidden aspect-square bg-white/5 border border-white/10 hover:border-emerald-400/50 transition-all cursor-pointer"
                        onClick={() => setInspectorAsset({ id: scene.id, url: scene.imageUrl, type: "image" })}
                      >
                        <img src={scene.imageUrl} alt={scene.description} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-xs text-white">{scene.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : generationStatus === "generating" ? (
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: numScenes }).map((_, i) => (
                    <div key={i} className="rounded-xl aspect-square bg-white/5 border border-white/10 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-white/10 p-12 text-center">
                  <Palette className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Upload a product image and configure settings to generate scenes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Inspector */}
      {inspectorAsset && <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />}
    </div>
  );
}
