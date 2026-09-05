"use client";

import React, { useState, useEffect } from "react";
import { useActiveProfile, UserProfile } from "@/lib/profile-context";
import { PRESET_AVATARS } from "@/lib/avatar-context";
import { useLanguage } from "@/lib/use-language";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Check,
  Edit2,
  Trash2,
  ShieldCheck,
  FolderLock,
  Layers,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
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
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { useRouter } from "next/navigation";

export function ProfileManagerSection() {
  const {
    profiles,
    activeProfile,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    isLoading,
  } = useActiveProfile();
  const { lang } = useLanguage();
  const router = useRouter();

  // Create modal state
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPreset, setCreatePreset] = useState(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal state
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPreset, setEditPreset] = useState(1);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Safeguard: reset body pointer-events whenever any modal closes
  useEffect(() => {
    if (!openCreateModal && !editingProfile && !deletingId && typeof document !== "undefined") {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [openCreateModal, editingProfile, deletingId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = createName.trim();
    if (!trimmed) {
      setCreateError(lang === "ar" ? "يرجى إدخال اسم البروفايل" : "Profile name is required");
      return;
    }

    setCreating(true);
    setCreateError(null);
    const res = await createProfile(trimmed, createPreset);
    setCreating(false);

    if (res.success) {
      setOpenCreateModal(false);
      setCreateName("");
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }
    } else {
      setCreateError(res.error || "فشل إنشاء البروفايل");
    }
  };

  const handleStartEdit = (p: UserProfile) => {
    setEditingProfile(p);
    setEditName(p.name);
    setEditPreset(p.avatarPreset);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(lang === "ar" ? "اسم البروفايل لا يمكن أن يكون فارغاً" : "Name cannot be empty");
      return;
    }

    setUpdating(true);
    setEditError(null);
    const res = await updateProfile(editingProfile.id, {
      name: trimmed,
      avatarPreset: editPreset,
    });
    setUpdating(false);

    if (res.success) {
      setEditingProfile(null);
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
      }
    } else {
      setEditError(res.error || "فشل تعديل البروفايل");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    const res = await deleteProfile(deletingId);
    setDeleting(false);
    setDeletingId(null);
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-36 bg-slate-800/60 rounded-2xl" />
          <div className="h-36 bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <section id="profiles" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            {lang === "ar" ? "إدارة البروفايلات (مساحات العمل)" : "Profiles Management"}
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {profiles.length} / 10
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {lang === "ar"
              ? "أنشئ بروفايلات بأسماء مستقلة لعزل تاريخ التوليد والمعرض، مع مشاركة نفس الإيميل والباسوورد ورصيد الكريديت."
              : "Create custom named profiles for isolated generations while sharing login credentials and credits."}
          </p>
        </div>

        {profiles.length < 10 && (
          <Button
            onClick={() => setOpenCreateModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-violet-600/25 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {lang === "ar" ? "إنشاء بروفايل جديد" : "Add Profile"}
          </Button>
        )}
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => {
          const isActive = activeProfile?.id === p.id;
          const grad =
            PRESET_AVATARS.find((x) => x.id === p.avatarPreset)?.gradient ||
            PRESET_AVATARS[0].gradient;

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-2xl p-5 border transition-all ${
                isActive
                  ? "bg-slate-900/90 border-violet-500/50 shadow-xl shadow-violet-600/10 ring-1 ring-violet-500/30"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {p.avatarPhoto ? (
                    <img
                      src={p.avatarPhoto}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 ring-2 ring-white/10"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-base font-bold text-white shrink-0 shadow-md ring-2 ring-white/10`}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                      {p.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-violet-500/20 text-violet-300 rounded border border-violet-500/30">
                          {lang === "ar" ? "الرئيسي" : "Default"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {p.generationCount !== undefined ? `${p.generationCount} ${lang === "ar" ? "عمل وتوليد" : "generations"}` : ""}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    {lang === "ar" ? "النشط" : "Active"}
                  </span>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <div>
                  {!isActive ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        switchProfile(p.id);
                        router.refresh();
                      }}
                      className="bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs rounded-lg px-3 py-1 h-8"
                    >
                      {lang === "ar" ? "التبديل لهذا البروفايل" : "Switch to this"}
                    </Button>
                  ) : (
                    <span className="text-xs text-violet-400 font-medium">
                      {lang === "ar" ? "البروفايل قيد الاستخدام حالياً" : "Currently in use"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStartEdit(p)}
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                    title={lang === "ar" ? "تعديل الاسم واللون" : "Edit profile"}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  {!p.isDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(p.id)}
                      className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                      title={lang === "ar" ? "حذف البروفايل" : "Delete profile"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal: Create Profile */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
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
                ? "أنشئ مساحة عمل جديدة لعزل أعمالك وتوليداتك."
                : "Create a separate workspace for isolated generations."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {lang === "ar" ? "اسم البروفايل" : "Profile Name"}
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "مثلاً: قناة اليوتيوب، تيك توك، تصاميم العمل..."
                    : "e.g. YouTube, TikTok, Work Projects..."
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
                  const isSel = createPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCreatePreset(preset.id)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${preset.gradient} flex items-center justify-center transition-all ${
                        isSel ? "ring-2 ring-white scale-105 shadow-lg" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {isSel && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs text-zinc-300">
              <p className="font-semibold text-violet-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                {lang === "ar" ? "نظام العزل الآمن:" : "Secure Isolation:"}
              </p>
              <p className="text-zinc-400 text-[11px]">
                {lang === "ar"
                  ? "سيكون لهذا البروفايل تاريخ توليد ومعرض خاص به، مع مشاركة الكريديت ونفس باقة الاشتراك."
                  : "This profile gets its own isolated generations history while sharing credits and plan."}
              </p>
            </div>

            {createError && <p className="text-xs text-rose-400 font-medium">{createError}</p>}

            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenCreateModal(false)}
                className="text-zinc-400 hover:text-white rounded-xl"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl px-5"
              >
                {creating ? (lang === "ar" ? "جاري الإنشاء..." : "Creating...") : (lang === "ar" ? "إنشاء البروفايل" : "Create Profile")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Profile */}
      <Dialog open={Boolean(editingProfile)} onOpenChange={(open) => !open && setEditingProfile(null)}>
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
              <Edit2 className="w-5 h-5 text-violet-400" />
              {lang === "ar" ? "تعديل البروفايل" : "Edit Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              {lang === "ar" ? "تعديل اسم أو أيقونة البروفايل." : "Edit profile name or avatar icon."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {lang === "ar" ? "اسم البروفايل" : "Profile Name"}
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
                  const isSel = editPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEditPreset(preset.id)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${preset.gradient} flex items-center justify-center transition-all ${
                        isSel ? "ring-2 ring-white scale-105 shadow-lg" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {isSel && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {editError && <p className="text-xs text-rose-400 font-medium">{editError}</p>}

            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingProfile(null)}
                className="text-zinc-400 hover:text-white rounded-xl"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={updating}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl px-5"
              >
                {updating ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ التعديلات" : "Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Delete */}
      <ConfirmActionDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={lang === "ar" ? "تأكيد حذف البروفايل" : "Delete Profile"}
        description={
          lang === "ar"
            ? "هل أنت متأكد من رغبتك في حذف هذا البروفايل؟ سيتم نقل كافة أعماله وتوليداته تلقائياً وبأمان إلى البروفايل الرئيسي لحسابك حتى لا تفقدها."
            : "Are you sure you want to delete this profile? All its creations will be safely migrated to your default profile."
        }
        confirmText={lang === "ar" ? "نعم، حذف ونقل الأعمال" : "Yes, Delete & Migrate"}
        cancelText={lang === "ar" ? "إلغاء" : "Cancel"}
      />
    </section>
  );
}
