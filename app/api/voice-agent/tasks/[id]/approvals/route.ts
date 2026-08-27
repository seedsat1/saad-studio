import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdmin } from "@/lib/is-admin";
import { approvalDecisionSchema } from "@/lib/voice-agent/schemas";
import { decideVoiceAgentApproval, listVoiceAgentApprovals } from "@/lib/voice-agent/service";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const approvals = await listVoiceAgentApprovals(userId, params.id);
  return NextResponse.json({ approvals });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = approvalDecisionSchema.parse(await req.json().catch(() => ({})));
    const task = await decideVoiceAgentApproval(userId, params.id, input.approvalId, input.action);
    if (!task) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid approval decision.", issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Approval failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
