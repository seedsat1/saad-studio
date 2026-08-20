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
  imageUrl?: string;
  imageModel?: "nano-banana-pro" | "gpt-image-2";
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
