import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { defaultProvider, legacyProvider } from '@/lib/storage';

// دعم التحميل من مصادر مختلفة:
// 1. R2 (Cloudflare) - الخيار الأول
// 2. الخادم المحلي - الاحتياطي

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename || 'saadstudio.zxp';
    
    // التحقق من أمان الملف (منع directory traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'اسم ملف غير صحيح' },
        { status: 400 }
      );
    }
    
    // محاولة التحميل من التخزين السحابي أولاً
    const isCloudConfigured = (process.env.B2_BUCKET || process.env.R2_BUCKET) &&
      (process.env.B2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID) &&
      (process.env.B2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY);
    if (isCloudConfigured) {
      return await downloadFromR2(filename);
    }
    
    // الاحتياطي: التحميل من الخادم المحلي
    return await downloadFromLocal(filename);
  } catch (error) {
    console.error('خطأ في التحميل:', error);
    return NextResponse.json(
      { error: 'فشل في تحميل الملف' },
      { status: 500 }
    );
  }
}

async function downloadFromR2(filename: string): Promise<NextResponse> {
  const path = `downloads/${filename}`;
  
  // 1. Try default provider (Backblaze B2)
  try {
    console.log(`[api/download] Attempting B2 download for: ${path}`);
    const exists = await defaultProvider.exists({ bucket: "", path });
    if (exists) {
      const response = await defaultProvider.download({ bucket: "", path });
      const buffer = Buffer.from(await new Response(response.body).arrayBuffer());
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': response.contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': response.cacheControl,
        },
      });
    }
  } catch (error) {
    console.error('[api/download] B2 download failed, trying legacy R2:', error);
  }

  // 2. Try legacy provider (Cloudflare R2)
  try {
    console.log(`[api/download] Attempting legacy R2 download for: ${path}`);
    const response = await legacyProvider.download({ bucket: "", path });
    const buffer = Buffer.from(await new Response(response.body).arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': response.cacheControl,
      },
    });
  } catch (error) {
    console.error('[api/download] Legacy R2 download failed:', error);
  }

  // 3. Fallback: Download from local
  return await downloadFromLocal(filename);
}

async function downloadFromLocal(filename: string): Promise<NextResponse> {
  try {
    // البحث عن الملف في مكانين محتملين:
    const possiblePaths = [
      path.join(process.cwd(), 'adobe', 'New folder', filename),
      path.join(process.cwd(), 'public', 'downloads', filename),
      path.join(process.cwd(), 'public', filename),
    ];

    let filePath: string | null = null;
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        filePath = p;
        break;
      } catch {
        continue;
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { 
          error: 'الملف غير موجود',
          hint: `البحث في: ${possiblePaths.join(', ')}`
        },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('خطأ في التحميل المحلي:', error);
    return NextResponse.json(
      { error: 'فشل في تحميل الملف من الخادم' },
      { status: 500 }
    );
  }
}

