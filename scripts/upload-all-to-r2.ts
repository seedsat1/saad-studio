import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

/**
 * Script لرفع ملفات التنصيب إلى Cloudflare R2
 * 
 * المتطلبات:
 * 1. بيانات Cloudflare R2 في .env
 * 2. الملفات المراد رفعها موجودة
 * 
 * الملفات المدعومة:
 * - SaadStudio.zxp (الإضافة)
 * - setup.exe (برنامج التنصيب)
 * 
 * الاستخدام:
 * npx ts-node scripts/upload-all-to-r2.ts
 */

interface FileToUpload {
  localPath: string;
  s3Key: string;
  description: string;
}

const uploadAllToR2 = async () => {
  // التحقق من متغيرات البيئة
  const requiredEnvVars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v] || process.env[v] === 'replace_me');

  if (missingVars.length > 0) {
    console.error('\n❌ خطأ: متغيرات البيئة المفقودة أو غير محدثة:\n');
    missingVars.forEach(v => {
      console.error(`   ❌ ${v} = ${process.env[v] || 'غير موجود'}`);
    });
    
    console.error('\n📋 الخطوات لإصلاح المشكلة:\n');
    console.error('1. اذهب إلى: https://dash.cloudflare.com/');
    console.error('2. اختر R2 من القائمة الجانبية');
    console.error('3. انقر على Create API Token');
    console.error('4. احفظ المفاتيح وأضفها إلى .env:\n');
    console.error('   R2_ACCOUNT_ID=your_account_id');
    console.error('   R2_ACCESS_KEY_ID=your_key');
    console.error('   R2_SECRET_ACCESS_KEY=your_secret');
    console.error('   R2_BUCKET=saadstudio-media\n');
    process.exit(1);
  }

  try {
    const accountId = process.env.R2_ACCOUNT_ID!;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
    const bucket = process.env.R2_BUCKET!;
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    console.log('\n🔧 إعدادات R2:');
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Bucket: ${bucket}`);
    console.log(`   Endpoint: ${endpoint}\n`);

    // إنشاء S3 client
    const s3Client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint,
    });

    // قائمة الملفات للرفع
    const filesToUpload: FileToUpload[] = [
      {
        localPath: path.join(process.cwd(), 'adobe', 'New folder', 'SaadStudio.zxp'),
        s3Key: 'downloads/saadstudio.zxp',
        description: '📦 إضافة SaadStudio',
      },
      {
        localPath: path.join(process.cwd(), 'adobe', 'New folder', 'aescripts + aeplugins desktop apps (setup).exe'),
        s3Key: 'downloads/setup.exe',
        description: '⚙️ برنامج التنصيب',
      },
    ];

    console.log('📂 البحث عن الملفات...\n');

    let successCount = 0;
    let failureCount = 0;

    for (const file of filesToUpload) {
      try {
        // التحقق من وجود الملف
        try {
          await fs.access(file.localPath);
        } catch {
          console.error(`❌ ${file.description}`);
          console.error(`   الملف غير موجود: ${file.localPath}\n`);
          failureCount++;
          continue;
        }

        // قراءة الملف
        console.log(`⏳ جاري معالجة ${file.description}...`);
        const fileBuffer = await fs.readFile(file.localPath);
        const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);
        const fileSizeGB = (fileBuffer.length / (1024 * 1024 * 1024)).toFixed(4);

        console.log(`   الحجم: ${fileSizeMB} MB (${fileSizeGB} GB)`);

        // رفع الملف
        console.log(`   📤 جاري الرفع إلى R2...`);
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: file.s3Key,
          Body: fileBuffer,
          ContentType: 'application/octet-stream',
          CacheControl: 'public, max-age=604800', // أسبوع واحد
          Metadata: {
            'upload-date': new Date().toISOString(),
            'filename': path.basename(file.localPath),
          },
        });

        await s3Client.send(command);
        console.log(`✅ تم الرفع بنجاح!\n`);
        successCount++;

      } catch (error) {
        console.error(`❌ خطأ في الرفع: ${error}\n`);
        failureCount++;
      }
    }

    // ملخص النتائج
    console.log('━'.repeat(50));
    console.log('\n📊 ملخص النتائج:');
    console.log(`   ✅ نجح: ${successCount}`);
    console.log(`   ❌ فشل: ${failureCount}`);
    console.log(`   📦 إجمالي: ${filesToUpload.length}\n`);

    // عرض روابط التحميل
    if (successCount > 0) {
      console.log('🔗 روابط التحميل:\n');
      console.log('   صفحة التحميل:');
      console.log('   https://www.saadstudio.app/download\n');
      console.log('   تحميل مباشر:');
      console.log('   - الإضافة: https://www.saadstudio.app/download/saadstudio.zxp');
      console.log('   - برنامج التنصيب: https://www.saadstudio.app/download/setup.exe\n');
    }

    if (failureCount > 0) {
      process.exit(1);
    }

    console.log('✅ تم الانتهاء بنجاح!\n');

  } catch (error) {
    console.error('\n❌ خطأ عام:', error);
    process.exit(1);
  }
};

uploadAllToR2();
