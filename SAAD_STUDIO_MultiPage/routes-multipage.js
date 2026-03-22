const path = require('path');
function registerMultiPageRoutes(app) {
  const pub = __dirname;
  const pages = [
    ['/', 'index.html'],
    ['/nano', 'nano.html'], ['/nano.html', 'nano.html'],
    ['/qwen2', 'qwen2.html'], ['/qwen2.html', 'qwen2.html'],
    ['/seedream', 'seedream.html'], ['/seedream.html', 'seedream.html'],
    ['/zimage', 'zimage.html'], ['/zimage.html', 'zimage.html'],
    ['/flux2', 'flux2.html'], ['/flux2.html', 'flux2.html'],
    ['/fluxkontext', 'fluxkontext.html'], ['/fluxkontext.html', 'fluxkontext.html'],
    ['/ideogram-reframe', 'ideogram-reframe.html'], ['/ideogram-reframe.html', 'ideogram-reframe.html'],
    ['/grok', 'grok.html'], ['/grok.html', 'grok.html'],
    ['/image-tools', 'image-tools.html'], ['/image-tools.html', 'image-tools.html'],
    ['/sora2', 'sora2.html'], ['/sora2.html', 'sora2.html'],
    ['/hailuo', 'hailuo.html'], ['/hailuo.html', 'hailuo.html'],
    ['/seedance', 'seedance.html'], ['/seedance.html', 'seedance.html'],
    ['/wan26', 'wan26.html'], ['/wan26.html', 'wan26.html'],
    ['/kling', 'kling.html'], ['/kling.html', 'kling.html'],
    ['/suno', 'suno.html'], ['/suno.html', 'suno.html'],
    ['/eleven', 'eleven.html'], ['/eleven.html', 'eleven.html'],
    ['/gpt54', 'gpt54.html'], ['/gpt54.html', 'gpt54.html'],
    ['/infinitalk', 'infinitalk.html'], ['/infinitalk.html', 'infinitalk.html'],
    ['/cinema', 'cinema.html'], ['/cinema.html', 'cinema.html'],
    ['/prompt', 'prompt.html'], ['/prompt.html', 'prompt.html'],
    ['/transitions', 'transitions.html'], ['/transitions.html', 'transitions.html'],
    ['/google', 'google.html'], ['/google.html', 'google.html'],
    ['/gallery', 'gallery.html'], ['/gallery.html', 'gallery.html'],
    ['/library', 'library.html'], ['/library.html', 'library.html'],
    ['/account', 'account.html'], ['/account.html', 'account.html'],
    ['/legal', 'legal.html'], ['/legal.html', 'legal.html'],
    ['/dashboard', 'dashboard.html'], ['/dashboard.html', 'dashboard.html'],
  ];
  pages.forEach(([route, file]) => {
    app.get(route, (req, res) => res.sendFile(path.join(pub, file)));
  });
  console.log(`[MultiPage] ${pages.length} routes registered`);
}
module.exports = { registerMultiPageRoutes };
