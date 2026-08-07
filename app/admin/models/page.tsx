"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Sparkles,
  Check,
  X,
  Edit2,
  RotateCcw,
  Plus,
  Trash,
  Search,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Save,
  Image,
  Video,
} from "lucide-react";
import type { DynamicImageModel, DynamicVideoModel } from "@/lib/dynamic-model-loader";

export default function AdminModelsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageModels, setImageModels] = useState<DynamicImageModel[]>([]);
  const [videoModels, setVideoModels] = useState<DynamicVideoModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageEditBuf, setImageEditBuf] = useState<Partial<DynamicImageModel>>({});
  const [videoEditBuf, setVideoEditBuf] = useState<Partial<DynamicVideoModel>>({});

  // Adding state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModelType, setNewModelType] = useState<"image" | "video">("image");
  const [newImageModel, setNewImageModel] = useState<Partial<DynamicImageModel>>({
    id: "",
    label: "",
    sublabel: "",
    badge: "NEW",
    group: "Custom",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16"],
    maxImages: 1,
    maxRefImages: 0,
    creditCost: 2.0,
    isActive: true,
  });
  const [newVideoModel, setNewVideoModel] = useState<Partial<DynamicVideoModel>>({
    id: "",
    name: "",
    family: "custom",
    family_label: "Custom",
    family_color: "#7c3aed",
    badge: "NEW",
    description: "",
    api_route: "",
    route_confirmed: true,
    capabilities: {
      requires_image: false,
      optional_image: false,
      requires_video: false,
      optional_video: false,
      has_end_frame: false,
      aspect_ratios: ["16:9", "9:16"],
      sizes: [],
      durations: [4, 6, 8],
      resolutions: ["720p", "1080p"],
      quality_param: "resolution",
      max_reference_images: 0,
      max_reference_videos: 0,
      max_reference_video_total_seconds: 0,
      max_reference_audios: 0,
      max_reference_audio_total_seconds: 0,
      has_negative_prompt: false,
      has_seed: false,
      has_cfg_scale: false,
      has_sound: false,
      sound_param: "sound",
      has_shot_type: false,
      has_multi_prompt: false,
      has_element_list: false,
      has_scene_control: false,
      has_orientation: false,
      has_omni_tabs: false,
    },
    isActive: true,
    creditCost: 5.0,
  } as any);

  useEffect(() => {
    fetch("/api/admin/models")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/admin");
          return;
        }
        const data = await res.json();
        if (data.imageModels) setImageModels(data.imageModels);
        if (data.videoModels) setVideoModels(data.videoModels);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load models configuration", err);
        setError("Failed to load models configuration.");
        setLoading(false);
      });
  }, [router]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageModels, videoModels }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save configuration");
      setSuccess("Configuration saved and synchronized successfully!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/models", {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger sync");
      setSuccess(`Official catalog synchronized. Added ${data.newlyAddedCount} curated models and removed stale preview entries.`);
      setTimeout(() => setSuccess(null), 5000);

      // Reload registry
      const reloadRes = await fetch("/api/admin/models");
      const reloadData = await reloadRes.json();
      if (reloadData.imageModels) setImageModels(reloadData.imageModels);
      if (reloadData.videoModels) setVideoModels(reloadData.videoModels);
    } catch (err: any) {
      setError(err.message || "Failed to synchronize the official models catalog.");
    } finally {
      setIsSyncing(false);
    }
  };

  const startEdit = (model: any, type: "image" | "video") => {
    setEditingId(model.id);
    if (type === "image") {
      setImageEditBuf({ ...model });
    } else {
      setVideoEditBuf({ ...model });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setImageEditBuf({});
    setVideoEditBuf({});
  };

  const saveEdit = (type: "image" | "video") => {
    if (type === "image") {
      setImageModels((prev) =>
        prev.map((m) => (m.id === editingId ? ({ ...m, ...imageEditBuf } as DynamicImageModel) : m))
      );
    } else {
      setVideoModels((prev) =>
        prev.map((m) => (m.id === editingId ? ({ ...m, ...videoEditBuf } as DynamicVideoModel) : m))
      );
    }
    setEditingId(null);
    setImageEditBuf({});
    setVideoEditBuf({});
  };

  const toggleActive = (id: string, type: "image" | "video") => {
    if (type === "image") {
      setImageModels((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: m.isActive === false ? true : false } : m))
      );
    } else {
      setVideoModels((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: m.isActive === false ? true : false } : m))
      );
    }
  };

  const deleteModel = (id: string, type: "image" | "video") => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    if (type === "image") {
      setImageModels((prev) => prev.filter((m) => m.id !== id));
    } else {
      setVideoModels((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleAddNewModel = () => {
    if (newModelType === "image") {
      if (!newImageModel.id || !newImageModel.label) {
        alert("ID and Label are required.");
        return;
      }
      setImageModels((prev) => [...prev, newImageModel as DynamicImageModel]);
    } else {
      if (!newVideoModel.id || !newVideoModel.name || !newVideoModel.api_route) {
        alert("ID, Name, and API Route are required.");
        return;
      }
      setVideoModels((prev) => [...prev, newVideoModel as DynamicVideoModel]);
    }
    setShowAddModal(false);
    // Reset templates
    setNewImageModel({
      id: "",
      label: "",
      sublabel: "",
      badge: "NEW",
      group: "Custom",
      inputType: "text-to-image",
      aspectRatios: ["1:1", "16:9", "9:16"],
      maxImages: 1,
      maxRefImages: 0,
      creditCost: 2.0,
      isActive: true,
    });
    setNewVideoModel({
      id: "",
      name: "",
      family: "custom",
      family_label: "Custom",
      family_color: "#7c3aed",
      badge: "NEW",
      description: "",
      api_route: "",
      route_confirmed: true,
      capabilities: {
        requires_image: false,
        optional_image: false,
        requires_video: false,
        optional_video: false,
        has_end_frame: false,
        aspect_ratios: ["16:9", "9:16"],
        sizes: [],
        durations: [4, 6, 8],
        resolutions: ["720p", "1080p"],
        quality_param: "resolution",
        max_reference_images: 0,
        max_reference_videos: 0,
        max_reference_video_total_seconds: 0,
        max_reference_audios: 0,
        max_reference_audio_total_seconds: 0,
        has_negative_prompt: false,
        has_seed: false,
        has_cfg_scale: false,
        has_sound: false,
        sound_param: "sound",
        has_shot_type: false,
        has_multi_prompt: false,
        has_element_list: false,
        has_scene_control: false,
        has_orientation: false,
        has_omni_tabs: false,
      },
      isActive: true,
      creditCost: 5.0,
    } as any);
  };

  const filteredImageModels = imageModels.filter(
    (m) =>
      m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVideoModels = videoModels.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.family.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mb-4"></div>
        <p className="text-sm font-medium text-slate-400">Loading AI Models Registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 selection:bg-violet-500 selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            AI Models Registry Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Official model registry control center. Manage statuses, prices, aspect ratios, and verified upstream routes without guessed catalog rows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Custom Model
          </button>
          <button
            onClick={handleAutoSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 transition-all duration-200"
          >
            <RotateCcw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Official Catalog"}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Registry"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => {
              setActiveTab("image");
              cancelEdit();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "image"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Image className="w-4 h-4" />
            Image Models ({imageModels.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("video");
              cancelEdit();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "video"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/15"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-4 h-4" />
            Video Models ({videoModels.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search model by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Models Grid/Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        {activeTab === "image" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-900/40">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Model Info</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Credit Cost</th>
                  <th className="px-6 py-4">Aspect Ratios & Limits</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredImageModels.map((model) => {
                  const isEditing = editingId === model.id;
                  const isActive = model.isActive !== false;

                  return (
                    <tr
                      key={model.id}
                      className={`hover:bg-slate-800/20 transition-colors ${
                        !isActive ? "opacity-60 bg-slate-950/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(model.id, "image")}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : "bg-slate-800 text-slate-500 border border-slate-700/50"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <input
                              type="text"
                              value={imageEditBuf.label || ""}
                              onChange={(e) => setImageEditBuf({ ...imageEditBuf, label: e.target.value })}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white"
                              placeholder="Label"
                            />
                            <input
                              type="text"
                              value={imageEditBuf.sublabel || ""}
                              onChange={(e) => setImageEditBuf({ ...imageEditBuf, sublabel: e.target.value })}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300"
                              placeholder="Sublabel"
                            />
                            <div className="text-[10px] text-slate-500 font-mono select-all">
                              ID: {model.id}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {model.label}
                              {model.badge && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                  {model.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{model.sublabel}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {model.id}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {isEditing ? (
                          <input
                            type="text"
                            value={imageEditBuf.group || ""}
                            onChange={(e) => setImageEditBuf({ ...imageEditBuf, group: e.target.value })}
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white max-w-[120px]"
                          />
                        ) : (
                          model.group
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {isEditing ? (
                          <select
                            value={imageEditBuf.inputType || "text-to-image"}
                            onChange={(e) =>
                              setImageEditBuf({ ...imageEditBuf, inputType: e.target.value as any })
                            }
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                          >
                            <option value="text-to-image">Text to Image</option>
                            <option value="image-to-image">Image to Image</option>
                            <option value="edit">Edit / Inpaint</option>
                          </select>
                        ) : (
                          <span className="capitalize text-slate-400">{model.inputType}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-violet-300">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={imageEditBuf.creditCost ?? 2.0}
                            onChange={(e) =>
                              setImageEditBuf({ ...imageEditBuf, creditCost: parseFloat(e.target.value) })
                            }
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white max-w-[80px]"
                          />
                        ) : (
                          `${model.creditCost} credits`
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <input
                              type="text"
                              value={imageEditBuf.aspectRatios?.join(", ") || ""}
                              onChange={(e) =>
                                setImageEditBuf({
                                  ...imageEditBuf,
                                  aspectRatios: e.target.value.split(",").map((s) => s.trim()),
                                })
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                              placeholder="Aspect ratios (comma separated)"
                            />
                            <div className="flex gap-2 text-[10px]">
                              <span>Max Images: </span>
                              <input
                                type="number"
                                value={imageEditBuf.maxImages ?? 4}
                                onChange={(e) =>
                                  setImageEditBuf({ ...imageEditBuf, maxImages: parseInt(e.target.value) })
                                }
                                className="w-10 bg-slate-950 border border-slate-700 rounded text-[10px] text-center"
                              />
                              <span>Max Ref Images: </span>
                              <input
                                type="number"
                                value={imageEditBuf.maxRefImages ?? 0}
                                onChange={(e) =>
                                  setImageEditBuf({ ...imageEditBuf, maxRefImages: parseInt(e.target.value) })
                                }
                                className="w-10 bg-slate-950 border border-slate-700 rounded text-[10px] text-center"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {model.aspectRatios.map((ratio) => (
                                <span
                                  key={ratio}
                                  className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-400 font-medium"
                                >
                                  {ratio}
                                </span>
                              ))}
                            </div>
                            <div className="text-[10px] text-slate-400 flex gap-3">
                              <span>Max Images: {model.maxImages}</span>
                              <span>Max Refs: {model.maxRefImages}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => saveEdit("image")}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(model, "image")}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteModel(model.id, "image")}
                              className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/10"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-900/40">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Model Info</th>
                  <th className="px-6 py-4">Provider Route</th>
                  <th className="px-6 py-4">Price rate</th>
                  <th className="px-6 py-4">Resolutions & Durations</th>
                  <th className="px-6 py-4">Reference limits</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVideoModels.map((model) => {
                  const isEditing = editingId === model.id;
                  const isActive = model.isActive !== false;
                  const creditRate = (model as any).creditCost ?? 5.0;

                  return (
                    <tr
                      key={model.id}
                      className={`hover:bg-slate-800/20 transition-colors ${
                        !isActive ? "opacity-60 bg-slate-950/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(model.id, "video")}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : "bg-slate-800 text-slate-500 border border-slate-700/50"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <input
                              type="text"
                              value={videoEditBuf.name || ""}
                              onChange={(e) => setVideoEditBuf({ ...videoEditBuf, name: e.target.value })}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white"
                              placeholder="Name"
                            />
                            <textarea
                              value={videoEditBuf.description || ""}
                              onChange={(e) =>
                                setVideoEditBuf({ ...videoEditBuf, description: e.target.value })
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300"
                              placeholder="Description"
                              rows={2}
                            />
                            <div className="text-[10px] text-slate-500 font-mono">ID: {model.id}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {model.name}
                              {model.badge && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                  {model.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 max-w-xs line-clamp-2">
                              {model.description}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {model.id}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={videoEditBuf.api_route || ""}
                              onChange={(e) =>
                                setVideoEditBuf({ ...videoEditBuf, api_route: e.target.value })
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                              placeholder="api_route"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={videoEditBuf.family || ""}
                                onChange={(e) =>
                                  setVideoEditBuf({ ...videoEditBuf, family: e.target.value })
                                }
                                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[10px] text-white w-20"
                                placeholder="family"
                              />
                              <input
                                type="text"
                                value={videoEditBuf.family_label || ""}
                                onChange={(e) =>
                                  setVideoEditBuf({ ...videoEditBuf, family_label: e.target.value })
                                }
                                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[10px] text-white w-24"
                                placeholder="family_label"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono text-[10px] text-violet-400 bg-violet-950/20 px-2 py-1 rounded inline-block">
                              {model.api_route}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: model.family_color }}
                              ></span>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {model.family_label}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-violet-300">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={videoEditBuf.creditCost ?? 5.0}
                            onChange={(e) =>
                              setVideoEditBuf({ ...videoEditBuf, creditCost: parseFloat(e.target.value) })
                            }
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white max-w-[80px]"
                          />
                        ) : (
                          `${creditRate} credits`
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <input
                              type="text"
                              value={videoEditBuf.capabilities?.resolutions?.join(", ") || ""}
                              onChange={(e) =>
                                setVideoEditBuf({
                                  ...videoEditBuf,
                                  capabilities: {
                                    ...videoEditBuf.capabilities,
                                    resolutions: e.target.value.split(",").map((s) => s.trim()),
                                  } as any,
                                })
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                              placeholder="Resolutions (comma separated)"
                            />
                            <input
                              type="text"
                              value={videoEditBuf.capabilities?.durations?.join(", ") || ""}
                              onChange={(e) =>
                                setVideoEditBuf({
                                  ...videoEditBuf,
                                  capabilities: {
                                    ...videoEditBuf.capabilities,
                                    durations: e.target.value.split(",").map((s) => parseInt(s.trim()) || 5),
                                  } as any,
                                })
                              }
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                              placeholder="Durations (seconds)"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-wrap gap-1 mb-1">
                              {model.capabilities?.resolutions?.map((res) => (
                                <span
                                  key={res}
                                  className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-400 font-medium"
                                >
                                  {res}
                                </span>
                              ))}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Durations: {model.capabilities?.durations?.join(", ") || "fixed"}s
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 max-w-xs text-[10px]">
                            <div className="flex gap-2">
                              <span>Max Images:</span>
                              <input
                                type="number"
                                value={videoEditBuf.capabilities?.max_reference_images ?? 0}
                                onChange={(e) =>
                                  setVideoEditBuf({
                                    ...videoEditBuf,
                                    capabilities: {
                                      ...videoEditBuf.capabilities,
                                      max_reference_images: parseInt(e.target.value),
                                    } as any,
                                  })
                                }
                                className="w-8 bg-slate-950 border border-slate-700 text-center"
                              />
                              <span>Max Videos:</span>
                              <input
                                type="number"
                                value={videoEditBuf.capabilities?.max_reference_videos ?? 0}
                                onChange={(e) =>
                                  setVideoEditBuf({
                                    ...videoEditBuf,
                                    capabilities: {
                                      ...videoEditBuf.capabilities,
                                      max_reference_videos: parseInt(e.target.value),
                                    } as any,
                                  })
                                }
                                className="w-8 bg-slate-950 border border-slate-700 text-center"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 text-[11px]">
                            <div>Images: max {model.capabilities?.max_reference_images || 0}</div>
                            <div>Videos: max {model.capabilities?.max_reference_videos || 0}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => saveEdit("video")}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(model, "video")}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteModel(model.id, "video")}
                              className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/10"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Custom Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-lg font-bold text-white">Add Custom AI Model</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Model Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={newModelType === "image"}
                      onChange={() => setNewModelType("image")}
                      className="accent-violet-500"
                    />
                    Image Model
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={newModelType === "video"}
                      onChange={() => setNewModelType("video")}
                      className="accent-violet-500"
                    />
                    Video Model
                  </label>
                </div>
              </div>

              {newModelType === "image" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Model ID</label>
                      <input
                        type="text"
                        placeholder="e.g. google/imagen4-custom"
                        value={newImageModel.id || ""}
                        onChange={(e) => setNewImageModel({ ...newImageModel, id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Display Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Google Imagen 4 Custom"
                        value={newImageModel.label || ""}
                        onChange={(e) => setNewImageModel({ ...newImageModel, label: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Sublabel</label>
                      <input
                        type="text"
                        placeholder="e.g. Extra detail"
                        value={newImageModel.sublabel || ""}
                        onChange={(e) => setNewImageModel({ ...newImageModel, sublabel: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Badge</label>
                      <input
                        type="text"
                        placeholder="e.g. PRO / NEW / TOP"
                        value={newImageModel.badge || ""}
                        onChange={(e) => setNewImageModel({ ...newImageModel, badge: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Group</label>
                      <input
                        type="text"
                        value={newImageModel.group || ""}
                        onChange={(e) => setNewImageModel({ ...newImageModel, group: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Cost (credits)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newImageModel.creditCost ?? 2.0}
                        onChange={(e) =>
                          setNewImageModel({ ...newImageModel, creditCost: parseFloat(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Input type</label>
                      <select
                        value={newImageModel.inputType || "text-to-image"}
                        onChange={(e) =>
                          setNewImageModel({ ...newImageModel, inputType: e.target.value as any })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="text-to-image">Text to Image</option>
                        <option value="image-to-image">Image to Image</option>
                        <option value="edit">Edit / Inpaint</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Model ID</label>
                      <input
                        type="text"
                        placeholder="e.g. minimax-hailuo-3-t2v"
                        value={newVideoModel.id || ""}
                        onChange={(e) => setNewVideoModel({ ...newVideoModel, id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Display Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Minimax Hailuo 3"
                        value={newVideoModel.name || ""}
                        onChange={(e) => setNewVideoModel({ ...newVideoModel, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">API Route ID</label>
                    <input
                      type="text"
                      placeholder="e.g. minimax/hailuo-3/text-to-video"
                      value={newVideoModel.api_route || ""}
                      onChange={(e) => setNewVideoModel({ ...newVideoModel, api_route: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Family Key</label>
                      <input
                        type="text"
                        value={newVideoModel.family || ""}
                        onChange={(e) => setNewVideoModel({ ...newVideoModel, family: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Cost (credits)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newVideoModel.creditCost ?? 5.0}
                        onChange={(e) =>
                          setNewVideoModel({ ...newVideoModel, creditCost: parseFloat(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewModel}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md"
              >
                Add Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
