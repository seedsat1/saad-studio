export interface ContextItem {
  id: string;
  source: "file" | "memory" | "doc" | "attachment";
  title: string;
  content: string;
  tokensEstimate: number;
}

export interface ContextPayload {
  items: ContextItem[];
  totalTokens: number;
}

export class ContextManager {
  private static compressionHooks: Array<
    (payload: ContextPayload) => Promise<ContextPayload>
  > = [];

  static registerCompressionHook(
    hook: (payload: ContextPayload) => Promise<ContextPayload>
  ): void {
    this.compressionHooks.push(hook);
  }

  static async assembleContext(items: ContextItem[]): Promise<ContextPayload> {
    let payload: ContextPayload = {
      items,
      totalTokens: items.reduce((acc, curr) => acc + curr.tokensEstimate, 0),
    };

    // Apply compression hooks sequentially (e.g. summarizing/truncating)
    for (const hook of this.compressionHooks) {
      payload = await hook(payload);
    }

    return payload;
  }

  static selectFiles(
    files: Array<{ path: string; content: string }>,
    query: string
  ): ContextItem[] {
    // Simple mock filter for file selections
    const term = query.toLowerCase();
    return files
      .filter((f) => f.path.toLowerCase().includes(term) || f.content.toLowerCase().includes(term))
      .map((f) => ({
        id: `file:${f.path}`,
        source: "file",
        title: f.path,
        content: f.content,
        tokensEstimate: Math.ceil(f.content.length / 4), // Simple rule of thumb
      }));
  }

  static selectMemories(
    memories: Array<{ id: string; content: string; tags: string[] }>,
    tags: string[]
  ): ContextItem[] {
    return memories
      .filter((m) => m.tags.some((t) => tags.includes(t)))
      .map((m) => ({
        id: `memory:${m.id}`,
        source: "memory",
        title: `Memory: ${m.id}`,
        content: m.content,
        tokensEstimate: Math.ceil(m.content.length / 4),
      }));
  }

  static selectDocs(
    docs: Array<{ title: string; content: string }>,
    query: string
  ): ContextItem[] {
    const term = query.toLowerCase();
    return docs
      .filter((d) => d.title.toLowerCase().includes(term) || d.content.toLowerCase().includes(term))
      .map((d) => ({
        id: `doc:${d.title}`,
        source: "doc",
        title: d.title,
        content: d.content,
        tokensEstimate: Math.ceil(d.content.length / 4),
      }));
  }

  static routeAttachments(
    attachments: Array<{ filename: string; mimeType: string; content: string }>
  ): ContextItem[] {
    return attachments.map((a) => ({
      id: `attachment:${a.filename}`,
      source: "attachment",
      title: a.filename,
      content: `[Attachment: ${a.filename} (${a.mimeType})] ${a.content}`,
      tokensEstimate: Math.ceil(a.content.length / 4),
    }));
  }

  static clearCompressionHooks(): void {
    this.compressionHooks = [];
  }
}
