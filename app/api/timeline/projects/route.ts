import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export const dynamic = 'force-dynamic';

// ── GET /api/timeline/projects  →  list user's projects (id, name, updatedAt only)
export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await prismadb.timelineProject.findMany({
    where: { userId },
    select: { id: true, name: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ projects });
}

// ── POST /api/timeline/projects  →  create or update a project
//    Body: { id?, name, state: {...} }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; name?: string; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { id, name, state } = body;

  if (!state || typeof state !== 'object') {
    return NextResponse.json({ error: 'state is required.' }, { status: 400 });
  }

  const projectName = (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 120) : 'Untitled Project';

  // Update existing project (must belong to same user)
  if (id && typeof id === 'string') {
    const existing = await prismadb.timelineProject.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }
    const updated = await prismadb.timelineProject.update({
      where: { id },
      data: { name: projectName, stateJson: state as object, updatedAt: new Date() },
      select: { id: true, name: true, updatedAt: true },
    });
    return NextResponse.json({ project: updated });
  }

  // Create new project
  const created = await prismadb.timelineProject.create({
    data: { userId, name: projectName, stateJson: state as object },
    select: { id: true, name: true, updatedAt: true },
  });

  return NextResponse.json({ project: created }, { status: 201 });
}
