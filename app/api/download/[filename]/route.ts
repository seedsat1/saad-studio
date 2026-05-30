import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// دعم التحميل من مصادر مختلفة:
// 1. R2 (Cloudflare) - الخيار الأول
// 2. الخادم المحلي - الاحتياطي

export async function GET(request: NextRequest) {
  try {
    const filename = 'saadstudio.zxp';
    
    // محاولة التحميل من R2 أولاً
    if (process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
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
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  
  const s3Client = new S3Client({
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.R2_ENDPOINT,
  });

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: `downloads/${filename}`,
    });

    const response = await s3Client.send(command);
    const bytes = await response.Body?.transformToByteArray();

    if (!bytes) {
      throw new Error('لم يتم الحصول على البيانات من R2');
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('خطأ في R2:', error);
    // العودة للاحتياطي
    return await downloadFromLocal(filename);
  }
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
