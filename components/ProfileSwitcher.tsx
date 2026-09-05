"use client";

import React, { useState, useEffect } from "react";
import { useActiveProfile, UserProfile } from "@/lib/profile-context";
import { PRESET_AVATARS } from "@/lib/avatar-context";
import { useLanguage } from "@/lib/use-language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  ChevronDown,
  Plus,
  Settings,
  Sparkles,
  Layers,
  User,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ProfileSwitcher() {
  const { profiles, activeProfile, switchProfile, createProfile, isLoading } = useActiveProfile();
  const { lang } = useLanguage();
  const router = useRouter();

  const [openModal, setOpenModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!openModal && typeof document !== "undefined") {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [openModal]);

  if (isLoading || !activeProfile) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 animate-pulse text-xs text-zinc-400">
        <div className="w-4 h-4 rounded-full bg-white/10" />
        <span className="w-16 h-3 bg-white/10 rounded" />
      </div>
    );
  }

  const activeGradient =
    PRESET_AVATARS.find((p) => p.id === activeProfile.avatarPreset)?.gradient ||
    PRESET_AVATARS[0].gradient;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      setErrorMessage(lang === "ar" ? "يرجى كتابة اسم البروفايل" : "Profile name is required");
      return;
    }

    setCreating(true);
    setErrorMessage(null);

    const res = await createProfile(trimmed, selectedPreset);
    setCreating(false);

    if (res.success) {
      setOpenModal(false);
      setNewProfileName("");
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }
    } else {
      setErrorMessage(res.error || "Failed to create profile");
    }
  };

  const handleSwitch = (id: string) => {
    switchProfile(id);
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/40 transition-all text-left focus:outline-none select-none"
            aria-label="Switch Profile"
          >
            {activeProfile.avatarPhoto ? (
              <img
                src={activeProfile.avatarPhoto}
                alt={activeProfile.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : (
              <div
                className={`w-5 h-5 rounded-full bg-gradient-to-br ${activeGradient} flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20`}
              >
                {activeProfile.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="max-w-[90px] sm:max-w-[120px] truncate text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
              {activeProfile.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-72 border border-white/10 bg-slate-950/95 backdrop-blur-2xl p-2 text-white shadow-2xl shadow-black/80 rounded-2xl z-50"
        >
          {/* Active Profile Info Header */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600/10 via-slate-900 to-indigo-600/10 border border-violet-500/20 mb-1.5">
            <div className="flex items-center gap-2.5">
              {activeProfile.avatarPhoto ? (
                <img
                  src={activeProfile.avatarPhoto}
                  alt={activeProfile.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/40"
                />
              ) : (
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${activeGradient} flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-violet-500/40`}
                >
                  {activeProfile.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-white">{activeProfile.name}</p>
                  {activeProfile.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-violet-500/20 text-violet-300 rounded border border-violet-500/30">
                      {lang === "ar" ? "الرئيسي" : "Default"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  {lang === "ar" ? "البروفايل النشط حالياً" : "Active profile"}
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                {lang === "ar" ? "الكريديت مشترك للحساب" : "Shared credits balance"}
              </span>
            </div>
          </div>

          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
            {lang === "ar" ? "التبديل بين البروفايلات" : "Switch Profile"}
          </div>

          {/* Profiles List */}
          <div className="max-h-56 overflow-y-auto space-y-1 py-1 pr-1 custom-scrollbar">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile.id;
              const grad =
                PRESET_AVATARS.find((x) => x.id === p.avatarPreset)?.gradient ||
                PRESET_AVATARS[0].gradient;

              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitch(p.id)}
                  type="button"
                  className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-violet-600/20 border border-violet-500/40 text-white"
                      : "hover:bg-white/5 text-zinc-300 hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.avatarPhoto ? (
                      <img
                        src={p.avatarPhoto}
                        alt={p.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                      />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm`}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {p.generationCount !== undefined ? `${p.generationCount} ${lang === "ar" ? "توليد" : "gens"}` : ""}
                      </p>
                    </div>
                  </div>

                  {isActive && <Check className="w-4 h-4 text-violet-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-1.5 bg-white/10" />

          {/* Create Profile Button */}
          {profiles.length < 10 ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setOpenModal(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 focus:bg-violet-500/10 focus:text-violet-200 transition-colors"
            >
              <Plus className="w-4 h-4 text-violet-400" />
              {lang === "ar" ? "+ إنشاء بروفايل جديد" : "+ Add New Profile"}
            </DropdownMenuItem>
          ) : (
            <div className="px-2.5 py-1.5 text-[11px] text-zinc-500 text-center">
              {lang === "ar" ? "وصلت للحد الأقصى (10 بروفايلات)" : "Max profiles reached (10)"}
            </div>
          )}

          {/* Manage Profiles Link */}
          <DropdownMenuItem asChild>
            <Link
              href="/profile#profiles"
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-zinc-400 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white transition-colors"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              {lang === "ar" ? "إدارة جميع البروفايلات" : "Manage Profiles"}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal: Create Profile */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent
          onCloseAutoFocus={() => {
            if (typeof document !== "undefined") {
              document.body.style.pointerEvents = "";
              document.body.style.overflow = "";
            }
          }}
          className="sm:max-w-md bg-slate-950 border border-white/10 text-white p-6 rounded-2xl shadow-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              {lang === "ar" ? "إنشاء بروفايل جديد" : "Create New Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {lang === "ar"
                ? "أنشئ بروفايلاً جديداً لعزل سجل التوليدات والمعرض بشكل مستقل."
                : "Create a new profile with isolated generation history and media."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {lang === "ar" ? "اسم البروفايل" : "Profile Name"}
              </label>
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "مثلاً: قناة اليوتيوب، تصاميم العمل، تيك توك..."
                    : "e.g. YouTube Channel, Work, Personal..."
                }
                maxLength={40}
                autoFocus
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-violet-500 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                {lang === "ar" ? "لون ونمط الأيقونة" : "Icon Style & Color"}
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => {
                  const isSel = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${preset.gradient} flex items-center justify-center transition-all ${
                        isSel ? "ring-2 ring-white scale-105 shadow-lg" : "opacity-80 hover:opacity-100 hover:scale-102"
                      }`}
                    >
                      {isSel && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs text-zinc-300 space-y-1">
              <p className="font-semibold text-violet-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                {lang === "ar" ? "مميزات البروفايل المنفصل:" : "Separate profile features:"}
              </p>
              <p className="text-zinc-400 text-[11px]">
                {lang === "ar"
                  ? "• سجل توليد ومعرض صور وفيديوهات مستقل تماماً خاص بهذا البروفايل."
                  : "• Completely isolated generation history and media gallery."}
              </p>
              <p className="text-zinc-400 text-[11px]">
                {lang === "ar"
                  ? "• الرصيد والاشتراك ونفس بيانات تسجيل الدخول مشتركة ولا تتأثر."
                  : "• Shared credit balance, subscription, and login credentials."}
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
            )}

            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="text-zinc-400 hover:text-white rounded-xl"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl px-5"
              >
                {creating
                  ? lang === "ar"
                    ? "جاري الإنشاء..."
                    : "Creating..."
                  : lang === "ar"
                  ? "إنشاء البروفايل"
                  : "Create Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
