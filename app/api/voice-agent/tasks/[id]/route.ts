import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/is-admin";
import { getVoiceAgentTask, listVoiceAgentApprovals, updateVoiceAgentTask } from "@/lib/voice-agent/service";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await getVoiceAgentTask(userId, params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const approvals = await listVoiceAgentApprovals(userId, params.id);
  return NextResponse.json({ task, approvals });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const task = await updateVoiceAgentTask(userId, params.id, body);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}
