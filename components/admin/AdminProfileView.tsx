"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  ShieldCheck,
  User as UserIcon,
  Lock,
  KeyRound,
  Mail,
  Calendar,
  Clock,
  Shield,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Smartphone,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface AdminProfileViewProps {
  initialTab?: "profile" | "security";
}

export function AdminProfileView({ initialTab = "profile" }: AdminProfileViewProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [activeTab, setActiveTab] = useState<"profile" | "security">(initialTab);

  // Profile Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Session State
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [isLoaded, user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      // Synchronize name to Saad Studio application database
      await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: user.primaryEmailAddress?.emailAddress,
        }),
      }).catch(() => {});

      setProfileSuccess("Admin profile updated successfully.");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update admin profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image size must be less than 5MB.");
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError("");

    try {
      await user.setProfileImage({ file });
      setProfileSuccess("Profile picture updated.");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err: any) {
      setAvatarError(err?.message || "Failed to upload profile picture.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const userWithPasswordApi = user as unknown as {
        updatePassword?: (payload: { currentPassword: string; newPassword: string }) => Promise<unknown>;
      };

      if (typeof userWithPasswordApi.updatePassword !== "function") {
        throw new Error("Password management is not supported for this authentication method.");
      }

      await userWithPasswordApi.updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Your admin password has been updated successfully.");
      setTimeout(() => setPasswordSuccess(""), 5000);
    } catch (err: any) {
      setPasswordError(err?.errors?.[0]?.longMessage || err?.message || "Failed to update password. Verify your current password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch (error) {
      console.error("[AdminProfileView] Failed to sign out:", error);
      window.location.href = "/sign-in";
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const adminName = user?.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.username || "System Admin";
  const adminEmail = user?.primaryEmailAddress?.emailAddress || "admin@saadstudio.com";
  const adminCreatedAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";
  const adminLastSignIn = user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "Current Session";

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Link href="/admin/control-center" className="hover:text-cyan-400 transition-colors">
            ADMIN
          </Link>
          <span>/</span>
          <span className="text-cyan-400">ACCOUNT & SECURITY</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-cyan-400" />
          <span>Admin Account & Identity</span>
        </h1>
        <p className="text-xs text-slate-400">
          Manage your verified administrator credentials, authentication methods, and security profile.
        </p>
      </div>

      {/* Admin Identity Hero Card */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/80 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={adminName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/50 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl font-bold">
                  {adminName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold"
                title="Change Avatar"
              >
                {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{adminName}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Shield className="h-3 w-3" />
                  SYSTEM ADMIN
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>{adminEmail}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-emerald-400 font-semibold">Verified</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors disabled:opacity-50"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                <span>Ending session...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Logout Session</span>
              </>
            )}
          </button>
        </div>

        {avatarError && (
          <div className="mt-4 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{avatarError}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "profile"
              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <UserIcon className="h-4 w-4" />
          <span>Profile Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "security"
              ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* TAB CONTENT: PROFILE */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 space-y-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase text-slate-300">
                Administrator Identity
              </h3>

              {profileSuccess && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Administrator Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={adminEmail}
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900/50 text-xs text-slate-400 cursor-not-allowed font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-400 uppercase">
                      Primary
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Email updates require authentication provider verification flows.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                System Account Metadata
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-500">Access Role</span>
                  <span className="font-mono font-bold text-cyan-400">ADMIN</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-500">Identity Source</span>
                  <span className="font-mono text-slate-300">Clerk Auth Provider</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-500">Created At</span>
                  <span className="font-mono text-slate-300">{adminCreatedAt}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">Last Sign-in</span>
                  <span className="font-mono text-slate-300">{adminLastSignIn}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SECURITY */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 space-y-5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase text-slate-300">
                  Change Password
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Update your administrative password. Uses the canonical authentication provider encryption standards.
              </p>

              {passwordSuccess && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-cyan-400" />
                <span>Security & Sessions</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Current Session</span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Last active: {adminLastSignIn}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">2-Factor Authentication</span>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase">
                      {user?.twoFactorEnabled ? "Enabled" : "Configurable in Clerk"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Protects administrative actions against unauthorized credential reuse.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                  <span>Terminate Current Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
