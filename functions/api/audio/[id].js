/**
 * Cloudflare Pages Function — 音频代理
 * 解决网易云外层 URL 重定向到 HTTP（HTTPS 页面被浏览器拦截）的问题
 *
 * 用法: /api/audio/1908049566
 * 行为: 获取网易云重定向目标，升级 HTTP→HTTPS，302 跳转
 */
export async function onRequest(context) {
  const { params } = context;
  const songId = params.id;

  if (!songId || !/^\d+$/.test(songId)) {
    return new Response('Invalid song ID', { status: 400 });
  }

  const outerUrl = 'https://music.163.com/song/media/outer/url?id=' + songId + '.mp3';

  try {
    // 只取 HEAD，拿到重定向目标即可，不下载音频数据
    const resp = await fetch(outerUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmergencyEscape/1.0)',
        'Referer': 'https://music.163.com/'
      }
    });

    let targetUrl = resp.headers.get('location') || outerUrl;

    // 强制升级到 HTTPS —— 网易云 CDN 同时支持 HTTP/HTTPS
    targetUrl = targetUrl.replace(/^http:\/\//, 'https://');

    return Response.redirect(targetUrl, 302);
  } catch (e) {
    // 回退：直接走 HTTPS 外层 URL（可能被拦截，但至少不报错）
    return Response.redirect(outerUrl, 302);
  }
}
