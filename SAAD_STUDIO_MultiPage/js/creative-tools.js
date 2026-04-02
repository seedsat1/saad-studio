(function(){
  const TOKEN_KEY = 'ss_token';
  const USER_KEY = 'ss_user';

  function getToken(){
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  }

  function setUser(user){
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }

  function headers(extra){
    const token = getToken();
    return { ...(token ? { 'x-user-token': token } : {}), ...(extra || {}) };
  }

  function ensureSignedIn(){
    if (getToken()) return true;
    alert('سجّل دخولك أولاً لاستخدام هذه الميزة');
    return false;
  }

  async function syncUser(){
    const token = getToken();
    if (!token) return;
    try {
      const resp = await fetch('/api/auth/me', { headers: headers() });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data && data.user) setUser(data.user);
    } catch {}
  }

  function wait(ms){
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function messageFrom(data, fallback){
    return data?.error || data?.message || data?.failMsg || fallback || 'حدث خطأ غير متوقع';
  }

  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
      reader.readAsDataURL(file);
    });
  }

  async function mediaToDataUrl(file){
    if (!file) throw new Error('الملف غير موجود');
    if (String(file.type || '').startsWith('image/')) return fileToDataUrl(file);
    if (!String(file.type || '').startsWith('video/')) throw new Error('نوع الملف غير مدعوم');

    const objectUrl = URL.createObjectURL(file);
    try {
      return await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.src = objectUrl;

        const cleanup = () => {
          video.pause();
          video.removeAttribute('src');
          video.load();
        };

        video.onloadeddata = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            cleanup();
            resolve(canvas.toDataURL('image/jpeg', 0.92));
          } catch {
            cleanup();
            reject(new Error('تعذر استخراج لقطة من الفيديو'));
          }
        };
        video.onerror = () => {
          cleanup();
          reject(new Error('تعذر قراءة الفيديو'));
        };
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function uploadKieBinaryFile(file){
    const fd = new FormData();
    fd.append('file', file, file.name || 'upload.bin');
    const resp = await fetch('/api/kie/upload-file', {
      method: 'POST',
      headers: headers(),
      body: fd
    });
    const data = await resp.json();
    if (!resp.ok || data?.error) throw new Error(messageFrom(data, 'فشل رفع الملف'));
    const url = data?.url || data?.fileUrl || data?.downloadUrl || data?.data?.url || '';
    if (!url) throw new Error('لم يتم استلام رابط الملف');
    return url;
  }

  async function poll(url, doneCheck, statusCb, maxAttempts, intervalMs){
    const attempts = maxAttempts || 90;
    const interval = intervalMs || 5000;
    for (let index = 0; index < attempts; index += 1) {
      await wait(interval);
      const resp = await fetch(url, { headers: headers() });
      const data = await resp.json();
      if (!resp.ok || data?.error) throw new Error(messageFrom(data, 'تعذر متابعة الحالة'));
      if (data.failed) throw new Error(messageFrom(data, 'فشلت المهمة'));
      if (statusCb) statusCb(data, index + 1);
      if (doneCheck(data)) return data;
    }
    throw new Error('انتهت المهلة قبل اكتمال المهمة');
  }

  async function runSeedreamEdit(options){
    const { prompt, imageFiles, statusCb } = options || {};
    if (!ensureSignedIn()) throw new Error('يرجى تسجيل الدخول أولاً');
    const files = Array.isArray(imageFiles) ? imageFiles.filter(Boolean) : [];
    if (!files.length) throw new Error('ارفع صورة واحدة على الأقل');
    if (statusCb) statusCb('رفع الصور...');
    const imageUrls = [];
    for (const file of files) imageUrls.push(await uploadKieBinaryFile(file));
    if (statusCb) statusCb('إنشاء المهمة...');
    const startResp = await fetch('/api/kie/seedream/create', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model: 'seedream/4.5-image-edit',
        input: {
          prompt,
          aspect_ratio: '1:1',
          quality: 'basic',
          image_urls: imageUrls
        }
      })
    });
    const startData = await startResp.json();
    if (!startResp.ok || startData?.error || !startData?.taskId) {
      throw new Error(messageFrom(startData, 'فشل إنشاء مهمة تعديل الصورة'));
    }
    const finalData = await poll(
      `/api/kie/seedream/status?taskId=${encodeURIComponent(startData.taskId)}`,
      (data) => data.done && Array.isArray(data.resultUrls) && data.resultUrls.length > 0,
      (data) => statusCb && statusCb(`جاري التوليد... (${data.status || 'processing'})`),
      90,
      5000
    );
    await syncUser();
    return finalData.resultUrls[0];
  }

  async function runGoogleTransition(options){
    const { prompt, startFile, endFile, statusCb, resolution, durationSeconds, aspectRatio } = options || {};
    if (!ensureSignedIn()) throw new Error('يرجى تسجيل الدخول أولاً');
    if (!startFile || !endFile) throw new Error('ارفع المشهدين أولاً');
    if (statusCb) statusCb('تجهيز المشاهد...');
    const imageBase64 = await mediaToDataUrl(startFile);
    const lastFrameBase64 = await mediaToDataUrl(endFile);
    if (statusCb) statusCb('إرسال الطلب...');
    const startResp = await fetch('/api/google-video', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        prompt,
        aspectRatio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        durationSeconds: durationSeconds || 5,
        imageBase64,
        lastFrameBase64
      })
    });
    const startData = await startResp.json();
    if (!startResp.ok || startData?.error || !startData?.operationName) {
      throw new Error(messageFrom(startData, 'فشل إنشاء الانتقال'));
    }
    const finalData = await poll(
      `/api/google-video/status?operation=${encodeURIComponent(startData.operationName)}`,
      (data) => data.done,
      (data) => statusCb && statusCb(data.done ? 'اكتملت المعالجة...' : 'جاري توليد الانتقال...'),
      120,
      5000
    );
    if (!finalData.videoUrl) throw new Error('اكتملت المهمة بدون فيديو');
    await syncUser();
    return finalData.videoUrl;
  }

  async function runKlingImageVideo(options){
    const { prompt, imageFile, tailImageFile, statusCb, duration } = options || {};
    if (!ensureSignedIn()) throw new Error('يرجى تسجيل الدخول أولاً');
    if (!imageFile) throw new Error('ارفع الصورة أولاً');
    if (statusCb) statusCb('رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(imageFile);
    let tailImageUrl = '';
    if (tailImageFile) {
      if (statusCb) statusCb('رفع صورة النهاية...');
      tailImageUrl = await uploadKieBinaryFile(tailImageFile);
    }
    if (statusCb) statusCb('إنشاء الفيديو...');
    const startResp = await fetch('/api/kie/kling/create', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        modelName: 'kling/v2-5-turbo-image-to-video-pro',
        prompt,
        imageUrls: [imageUrl],
        tailImageUrl,
        duration: String(duration || 5),
        generationMode: 'pro',
        sound: true
      })
    });
    const startData = await startResp.json();
    if (!startResp.ok || startData?.error || !startData?.taskId) {
      throw new Error(messageFrom(startData, 'فشل إنشاء فيديو Kling'));
    }
    const finalData = await poll(
      `/api/kie/kling/status?taskId=${encodeURIComponent(startData.taskId)}`,
      (data) => data.done && Array.isArray(data.videoUrls) && data.videoUrls.length > 0,
      (data) => statusCb && statusCb(`جاري توليد الفيديو... (${data.status || 'processing'})`),
      120,
      5000
    );
    await syncUser();
    return finalData.videoUrls[0];
  }

  async function runKlingMotion(options){
    const { prompt, imageFile, videoFile, statusCb } = options || {};
    if (!ensureSignedIn()) throw new Error('يرجى تسجيل الدخول أولاً');
    if (!imageFile || !videoFile) throw new Error('ارفع الصورة والفيديو المرجعي أولاً');
    if (statusCb) statusCb('رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(imageFile);
    if (statusCb) statusCb('رفع الفيديو المرجعي...');
    const videoUrl = await uploadKieBinaryFile(videoFile);
    if (statusCb) statusCb('إنشاء فيديو الحركة...');
    const startResp = await fetch('/api/kie/kling/create', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        modelName: 'kling-3.0/motion-control',
        prompt,
        imageUrls: [imageUrl],
        videoUrls: [videoUrl],
        generationMode: 'pro',
        characterOrientation: 'video'
      })
    });
    const startData = await startResp.json();
    if (!startResp.ok || startData?.error || !startData?.taskId) {
      throw new Error(messageFrom(startData, 'فشل إنشاء فيديو Motion Control'));
    }
    const finalData = await poll(
      `/api/kie/kling/status?taskId=${encodeURIComponent(startData.taskId)}`,
      (data) => data.done && Array.isArray(data.videoUrls) && data.videoUrls.length > 0,
      (data) => statusCb && statusCb(`جاري المعالجة... (${data.status || 'processing'})`),
      120,
      5000
    );
    await syncUser();
    return finalData.videoUrls[0];
  }

  async function runInfinitalk(options){
    const { prompt, imageFile, audioFile, statusCb } = options || {};
    if (!ensureSignedIn()) throw new Error('يرجى تسجيل الدخول أولاً');
    if (!imageFile || !audioFile) throw new Error('ارفع الصورة والصوت أولاً');
    if (statusCb) statusCb('رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(imageFile);
    if (statusCb) statusCb('رفع الصوت...');
    const audioUrl = await uploadKieBinaryFile(audioFile);
    if (statusCb) statusCb('إنشاء الأفاتار...');
    const startResp = await fetch('/api/kie/infinitalk/create', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model: 'infinitalk/from-audio',
        input: {
          image_url: imageUrl,
          audio_url: audioUrl,
          prompt,
          resolution: '720p'
        }
      })
    });
    const startData = await startResp.json();
    if (!startResp.ok || startData?.error || !startData?.taskId) {
      throw new Error(messageFrom(startData, 'فشل إنشاء مهمة Infinitalk'));
    }
    const finalData = await poll(
      `/api/kie/infinitalk/status?taskId=${encodeURIComponent(startData.taskId)}`,
      (data) => data.done && Array.isArray(data.resultUrls) && data.resultUrls.length > 0,
      (data) => statusCb && statusCb(`جاري توليد الأفاتار... (${data.status || 'processing'})`),
      120,
      5000
    );
    await syncUser();
    return finalData.resultUrls[0];
  }

  function buildDownload(url, label){
    return `<a class="rb rdl" href="${url}" target="_blank" rel="noopener noreferrer" download>${label || 'تحميل'}</a>`;
  }

  window.SaadCreative = {
    ensureSignedIn,
    syncUser,
    runSeedreamEdit,
    runGoogleTransition,
    runKlingImageVideo,
    runKlingMotion,
    runInfinitalk,
    buildDownload
  };
})();