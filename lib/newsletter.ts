import prismadb from "@/lib/prismadb";

const NEWSLETTER_CONFIG_KEY = "newsletter_subscribers_list";

export type NewsletterSubscriberItem = {
  id: string;
  email: string;
  source: string;
  status: "active" | "unsubscribed";
  createdAt: string;
  updatedAt: string;
};

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriberItem[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: NEWSLETTER_CONFIG_KEY },
    });
    if (!row?.value) return [];
    const list = JSON.parse(row.value);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("[getNewsletterSubscribers] error:", err);
    return [];
  }
}

export async function saveNewsletterSubscriber(email: string, source: string = "footer"): Promise<{ success: boolean; isNew: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, isNew: false };
  }

  try {
    const currentList = await getNewsletterSubscribers();
    const existingIndex = currentList.findIndex((item) => item.email === cleanEmail);

    let isNew = false;
    if (existingIndex >= 0) {
      currentList[existingIndex].status = "active";
      currentList[existingIndex].updatedAt = new Date().toISOString();
    } else {
      isNew = true;
      currentList.unshift({
        id: "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        email: cleanEmail,
        source: source || "footer",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await prismadb.platformConfig.upsert({
      where: { key: NEWSLETTER_CONFIG_KEY },
      update: { value: JSON.stringify(currentList) },
      create: { key: NEWSLETTER_CONFIG_KEY, value: JSON.stringify(currentList) },
    });

    return { success: true, isNew };
  } catch (err) {
    console.error("[saveNewsletterSubscriber] error:", err);
    return { success: false, isNew: false };
  }
}

export async function deleteNewsletterSubscriber(emailOrId: string): Promise<boolean> {
  const target = emailOrId.trim().toLowerCase();
  try {
    const currentList = await getNewsletterSubscribers();
    const filtered = currentList.filter(
      (item) => item.id !== target && item.email.toLowerCase() !== target
    );

    await prismadb.platformConfig.upsert({
      where: { key: NEWSLETTER_CONFIG_KEY },
      update: { value: JSON.stringify(filtered) },
      create: { key: NEWSLETTER_CONFIG_KEY, value: JSON.stringify(filtered) },
    });

    return true;
  } catch (err) {
    console.error("[deleteNewsletterSubscriber] error:", err);
    return false;
  }
}
