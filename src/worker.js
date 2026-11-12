/**
 * TuneFree Next Web - Cloudflare Worker / Pages Functions
 * 支持一键部署在 Cloudflare Workers 和 Cloudflare Pages 上
 */

const TUNEFREE_TARGET = 'https://tunefree.sayqz.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // 1. 音乐搜索接口 (/api/search)
    if (pathname === '/api/search') {
      const keyword = url.searchParams.get('keyword') || '';
      const source = url.searchParams.get('source') || 'qq';

      if (!keyword.trim()) {
        return Response.json({ success: true, list: [] }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      try {
        let list = [];
        if (source === 'wy') {
          const target = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=25`;
          const resp = await fetch(target, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          const json = await resp.json();
          const songs = json?.result?.songs || [];
          list = songs.map(s => ({
            id: String(s.id),
            title: s.name,
            artist: (s.artists || []).map(a => a.name).join(' / '),
            album: s.album?.name || '',
            source: 'wy',
            cover: s.album?.artist?.img1v1Url || (s.artists && s.artists[0]?.img1v1Url) || '/assets/branding/app_icon.png',
            duration: s.duration ? Math.round(s.duration / 1000) : 0,
          }));
        } else {
          // QQ 音乐
          const target = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=25&w=${encodeURIComponent(keyword)}&format=json`;
          const resp = await fetch(target, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          const json = await resp.json();
          const songs = json?.data?.song?.list || [];
          list = songs.map(s => ({
            id: s.songmid,
            title: s.songname,
            artist: (s.singer || []).map(a => a.name).join(' / '),
            album: s.albumname || '',
            source: 'qq',
            cover: s.albummid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${s.albummid}.jpg` : '/assets/branding/app_icon.png',
            duration: s.interval || 0,
          }));
        }

        return Response.json({ success: true, list }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return Response.json({ success: false, error: err.message }, {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 1.5 歌词获取接口 (/api/lyric)
    if (pathname === '/api/lyric') {
      const id = url.searchParams.get('id') || '';
      const source = url.searchParams.get('source') || 'qq';

      if (!id) {
        return Response.json({ success: true, lyric: '' }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      try {
        let lyric = '';
        if (source === 'wy') {
          const resp = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const json = await resp.json();
          lyric = json?.lrc?.lyric || '';
        } else {
          const resp = await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com/' }
          });
          const json = await resp.json();
          lyric = json?.lyric || '';
        }

        return Response.json({ success: true, lyric }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return Response.json({ success: false, lyric: '', error: err.message }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 2. 代理 TuneFree V1 APIs (/v1/*)
    if (pathname.startsWith('/v1/')) {
      const targetUrl = `${TUNEFREE_TARGET}${pathname}${url.search}`;

      const newHeaders = new Headers(request.headers);
      newHeaders.delete('host');
      newHeaders.delete('cf-connecting-ip');
      newHeaders.delete('cf-ipcountry');
      newHeaders.delete('cf-ray');
      newHeaders.delete('cf-visitor');

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: newHeaders,
          body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ? request.body : undefined,
          redirect: 'manual', // 保持 302 重定向供 /v1/play/{token} 跳转
        });

        const respHeaders = new Headers(response.headers);
        respHeaders.set('Access-Control-Allow-Origin', '*');
        respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        respHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, {
          status: response.status,
          headers: respHeaders,
        });
      } catch (err) {
        return Response.json({ success: false, error: { message: `Proxy Failed: ${err.message}` } }, {
          status: 502,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 3. 静态前端资源处理 (Cloudflare Workers Static Assets 或 Pages)
    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // 若直接通过 Workers 纯脚本部署且未绑定 Assets 时给出提示
    return new Response('TuneFree Next Web - 请在 Cloudflare Pages 或配置 Assets 的 Worker 中运行', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};
