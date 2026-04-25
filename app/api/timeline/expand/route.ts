import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const KIE_CREATE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_QUERY_URL  = 'https://api.kie.ai/api/v1/jobs/recordInfo';

interface KieCreateResp {
  code?: number;
  msg?:  string;
  data?: { taskId?: string };
}

interface KieQueryResp {
  code?: number;
  data?: {
    state?:      string; // PENDING | PROCESSING | SUCCESS | FAILED
    resultJson?: string;
    failMsg?:    string;
  };
}

async function pollKieTask(key: string, taskId: string, maxTries = 50): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, 3500));

    const res = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) continue;

    const data: KieQueryResp = await res.json();
    const d = data?.data;
    if (!d) continue;

    if (d.state === 'FAILED') throw new Error(d.failMsg || 'KIE task failed');

    if (d.state === 'SUCCESS' && d.resultJson) {
      const result = JSON.parse(d.resultJson) as Record<string, unknown>;

      // images
      if (Array.isArray(result?.images)) {
        for (const img of result.images as unknown[]) {
          const u = (img as { url?: string })?.url ?? img;
          if (typeof u === 'string' && u) return u;
        }
      }
      // videos
      if (Array.isArray(result?.videos)) {
        for (const v of result.videos as unknown[]) {
          const u = (v as { url?: string })?.url ?? v;
          if (typeof u === 'string' && u) return u;
        }
      }
      throw new Error('Task succeeded but result URLs not found.');
    }
  }
  throw new Error('KIE task timed out after waiting too long. Try again later.');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
  if (!kieApiKey) {
    return NextResponse.json({ error: 'KIE_API_KEY not configured on the server.' }, { status: 500 });
  }

  let body: {
    kind?: string;
    src?: string;
    kieTaskId?: string;
    imageSize?: string;
    extendSecs?: string;
    prompt?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    kind      = '',
    src       = '',
    kieTaskId = '',
    imageSize = 'landscape_16_9',
    extendSecs = '6',
    prompt    = '',
  } = body;

  if (!kind) {
    return NextResponse.json({ error: 'kind is required (image | video).' }, { status: 400 });
  }
  if (!src) {
    return NextResponse.json({ error: 'src (clip URL) is required.' }, { status: 400 });
  }

  try {
    /* ────────────────────────────────────────────
       IMAGE EXPAND  →  ideogram/v3-reframe
    ──────────────────────────────────────────── */
    if (kind === 'image' || kind === 'psd') {
      const VALID_SIZES = new Set([
        'landscape_16_9', 'portrait_9_16', 'square_hd',
        'landscape_4_3',  'portrait_4_3',  'square',
      ]);
      const resolvedSize = VALID_SIZES.has(imageSize) ? imageSize : 'landscape_16_9';

      const createPayload = {
        model: 'ideogram/v3-reframe',
        input: {
          image_url:       src,
          image_size:      resolvedSize,
          rendering_speed: 'BALANCED',
          style:           'AUTO',
          num_images:      '1',
        },
      };

      const createRes = await fetch(KIE_CREATE_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${kieApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(createPayload),
      });
      const createData: KieCreateResp = await createRes.json();

      if (createData.code !== 200 || !createData.data?.taskId) {
        return NextResponse.json(
          { error: createData.msg || 'Failed to create ideogram reframe task.' },
          { status: 500 },
        );
      }

      const url = await pollKieTask(kieApiKey, createData.data.taskId);
      return NextResponse.json({ url, kind: 'image' });
    }

    /* ────────────────────────────────────────────
       VIDEO EXTEND  →  grok-imagine/extend
       Requires: kieTaskId from a KIE-generated video
       Accepts:  extend_times = '6' | '10'
    ──────────────────────────────────────────── */
    if (kind === 'video') {
      if (!kieTaskId) {
        return NextResponse.json({
          error:
            'Video Extend requires a KIE task ID (kieTaskId). ' +
            'Only KIE-generated videos are supported — externally uploaded videos cannot be extended.',
        }, { status: 400 });
      }

      const validSecs = extendSecs === '10' ? '10' : '6';

      const createPayload = {
        model: 'grok-imagine/extend',
        input: {
          task_id:      kieTaskId,
          prompt:       prompt || 'Continue the video naturally.',
          extend_at:    '0',
          extend_times: validSecs,
        },
      };

      const createRes = await fetch(KIE_CREATE_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${kieApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(createPayload),
      });
      const createData: KieCreateResp = await createRes.json();

      if (createData.code !== 200 || !createData.data?.taskId) {
        return NextResponse.json(
          { error: createData.msg || 'Failed to create grok video extend task.' },
          { status: 500 },
        );
      }

      const url = await pollKieTask(kieApiKey, createData.data.taskId, 60);
      return NextResponse.json({ url, kind: 'video' });
    }

    return NextResponse.json({ error: `Unsupported clip kind: ${kind}` }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
