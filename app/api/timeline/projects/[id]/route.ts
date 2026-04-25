import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export const dynamic = 'force-dynamic';

// ── GET /api/timeline/projects/[id]  →  load a project's full state
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prismadb.timelineProject.findFirst({
    where: { id: params.id, userId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  // Return id + name + state — stateJson is the full timeline state
  return NextResponse.json({
    id:       project.id,
    name:     project.name,
    state:    project.stateJson,
    updatedAt: project.updatedAt,
  });
}

// ── DELETE /api/timeline/projects/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prismadb.timelineProject.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  await prismadb.timelineProject.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
