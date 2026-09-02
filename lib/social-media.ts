import prismadb from "@/lib/prismadb";

const SOCIAL_POSTS_CONFIG_KEY = "social_media_posts_history";
const SOCIAL_ACCOUNTS_CONFIG_KEY = "social_media_accounts_config";

export type SocialPlatformType = "twitter" | "instagram" | "linkedin" | "facebook" | "telegram" | "tiktok";

export type PlatformContentItem = {
  platform: SocialPlatformType;
  title?: string;
  content: string;
  hashtags: string[];
  charCount: number;
};

export type SocialMediaPostRecord = {
  id: string;
  topicPrompt: string;
  language: "ar" | "en";
  mediaType?: "image" | "video";
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:5";
  imageUrl?: string;
  imageModel?: "nano-banana-pro" | "grok-imagine" | "gpt-image-2";
  videoUrl?: string;
  videoModel?: "kling-3.0/video" | "bytedance/seedance-2" | "google/gemini-omni-flash";
  platforms: {
    twitter?: PlatformContentItem;
    instagram?: PlatformContentItem;
    linkedin?: PlatformContentItem;
    facebook?: PlatformContentItem;
    telegram?: PlatformContentItem;
    tiktok?: PlatformContentItem;
  };
  status: "draft" | "published" | "scheduled";
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SocialAccountsConfig = {
  bufferAccessToken?: string;
  bufferProfileId?: string;
  bufferProfileIds?: Partial<Record<Exclude<SocialPlatformType, "telegram">, string>>;
  telegramBotToken?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
  ayrshareApiKey?: string;
  customWebhookUrl?: string;
};

export async function getSocialPosts(): Promise<SocialMediaPostRecord[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: SOCIAL_POSTS_CONFIG_KEY },
    });
    if (!row?.value) return [];
    const list = JSON.parse(row.value);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("[getSocialPosts] error:", err);
    return [];
  }
}

export async function saveSocialPost(post: Omit<SocialMediaPostRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<SocialMediaPostRecord> {
  const currentList = await getSocialPosts();
  const nowIso = new Date().toISOString();

  let finalPost: SocialMediaPostRecord;

  if (post.id) {
    const idx = currentList.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      finalPost = {
        ...currentList[idx],
        ...post,
        id: post.id,
        updatedAt: nowIso,
      };
      currentList[idx] = finalPost;
    } else {
      finalPost = {
        ...post,
        id: post.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      currentList.unshift(finalPost);
    }
  } else {
    finalPost = {
      ...post,
      id: "post_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    currentList.unshift(finalPost);
  }

  await prismadb.platformConfig.upsert({
    where: { key: SOCIAL_POSTS_CONFIG_KEY },
    update: { value: JSON.stringify(currentList.slice(0, 100)) },
    create: { key: SOCIAL_POSTS_CONFIG_KEY, value: JSON.stringify(currentList.slice(0, 100)) },
  });

  return finalPost;
}

export async function deleteSocialPost(id: string): Promise<boolean> {
  try {
    const currentList = await getSocialPosts();
    const filtered = currentList.filter((p) => p.id !== id);
    await prismadb.platformConfig.upsert({
      where: { key: SOCIAL_POSTS_CONFIG_KEY },
      update: { value: JSON.stringify(filtered) },
      create: { key: SOCIAL_POSTS_CONFIG_KEY, value: JSON.stringify(filtered) },
    });
    return true;
  } catch (err) {
    console.error("[deleteSocialPost] error:", err);
    return false;
  }
}

export async function getSocialAccountsConfig(): Promise<SocialAccountsConfig> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: SOCIAL_ACCOUNTS_CONFIG_KEY },
    });
    if (!row?.value) return {};
    return JSON.parse(row.value);
  } catch {
    return {};
  }
}

export async function saveSocialAccountsConfig(config: SocialAccountsConfig): Promise<boolean> {
  try {
    await prismadb.platformConfig.upsert({
      where: { key: SOCIAL_ACCOUNTS_CONFIG_KEY },
      update: { value: JSON.stringify(config) },
      create: { key: SOCIAL_ACCOUNTS_CONFIG_KEY, value: JSON.stringify(config) },
    });
    return true;
  } catch {
    return false;
  }
}

const STORYBOARDS_CONFIG_KEY = "social_media_storyboards_history";

export type StoryboardThemeType = "cyberpunk" | "luxury-gold" | "hologram" | "cinema-master";
export type StoryboardTemplateType =
  | "day-night"
  | "car-call"
  | "character-3d"
  | "workflow-battle"
  // ── Modern social-media viral formats ────────────────────────────────
  | "product-hero"        // Product launch: hero + detail + lifestyle
  | "before-after"        // Transformation reveal (very viral on Reels/TikTok)
  | "quote-poster"        // Typography-forward cinematic quote card
  | "step-tutorial"       // 3-step visual tutorial (IG carousel)
  | "launch-countdown"    // Teaser + countdown + reveal
  | "viral-comparison";   // This-vs-that meme comparison

export type StoryboardShowcaseRecord = {
  id: string;
  title: string;
  templateType?: StoryboardTemplateType;
  outputMode?: "images_only" | "video_and_images";
  theme: StoryboardThemeType;
  conceptPrompt: string;
  language: "ar" | "en";
  heroImage?: {
    url?: string;
    label?: string;
    modelBadge?: string;
    prompt?: string;
  };
  video: {
    url?: string;
    model: string;
    modelBadge: string;
    prompt: string;
  };
  referenceFrames: {
    frame1: {
      url?: string;
      label: string;
      modelBadge: string;
      prompt: string;
    };
    frame2: {
      url?: string;
      label: string;
      modelBadge: string;
      prompt: string;
    };
  };
  promptBlueprint: {
    camera: string;
    lighting: string;
    composition: string;
    fullText: string;
  };
  assets: {
    character: {
      url?: string;
      label: string;
      prompt: string;
    };
    environment: {
      url?: string;
      label: string;
      prompt: string;
    };
  };
  captionText: string;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
};

export async function getStoryboards(): Promise<StoryboardShowcaseRecord[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: STORYBOARDS_CONFIG_KEY },
    });
    if (!row?.value) return [];
    const list = JSON.parse(row.value);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("[getStoryboards] error:", err);
    return [];
  }
}

export async function saveStoryboard(storyboard: Omit<StoryboardShowcaseRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<StoryboardShowcaseRecord> {
  const currentList = await getStoryboards();
  const nowIso = new Date().toISOString();
  let finalRecord: StoryboardShowcaseRecord;

  if (storyboard.id) {
    const idx = currentList.findIndex((s) => s.id === storyboard.id);
    if (idx >= 0) {
      finalRecord = {
        ...currentList[idx],
        ...storyboard,
        id: storyboard.id,
        updatedAt: nowIso,
      };
      currentList[idx] = finalRecord;
    } else {
      finalRecord = {
        ...storyboard,
        id: storyboard.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      currentList.unshift(finalRecord);
    }
  } else {
    finalRecord = {
      ...storyboard,
      id: "sb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    currentList.unshift(finalRecord);
  }

  await prismadb.platformConfig.upsert({
    where: { key: STORYBOARDS_CONFIG_KEY },
    update: { value: JSON.stringify(currentList.slice(0, 50)) },
    create: { key: STORYBOARDS_CONFIG_KEY, value: JSON.stringify(currentList.slice(0, 50)) },
  });

  return finalRecord;
}

export async function deleteStoryboard(id: string): Promise<boolean> {
  try {
    const currentList = await getStoryboards();
    const filtered = currentList.filter((s) => s.id !== id);
    await prismadb.platformConfig.upsert({
      where: { key: STORYBOARDS_CONFIG_KEY },
      update: { value: JSON.stringify(filtered) },
      create: { key: STORYBOARDS_CONFIG_KEY, value: JSON.stringify(filtered) },
    });
    return true;
  } catch {
    return false;
  }
}
