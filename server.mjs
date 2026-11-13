import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const TUNEFREE_TARGET = 'https://tunefree.sayqz.com';

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // 1. Search API (/api/search)
  if (pathname === '/api/search') {
    const keyword = reqUrl.searchParams.get('keyword') || '';
    const source = reqUrl.searchParams.get('source') || 'qq';

    if (!keyword.trim()) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, list: [] }));
      return;
    }

    try {
      let list = [];
      if (source === 'wy') {
        const url = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=25`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const json = await resp.json();
        const songs = json?.result?.songs || [];
        list = songs.map(s => {
          const album = s.al || s.album || {};
          const artists = s.ar || s.artists || [];
          let cover = album.picUrl || '/assets/branding/app_icon.png';
          if (cover.startsWith('http://')) {
            cover = cover.replace('http://', 'https://');
          }
          return {
            id: String(s.id),
            title: s.name,
            artist: artists.map(a => a.name).join(' / '),
            album: album.name || '',
            source: 'wy',
            cover,
            duration: s.dt ? Math.round(s.dt / 1000) : (s.duration ? Math.round(s.duration / 1000) : 0),
          };
        });
      } else if (source === 'kw') {
        // Kuwo Music (橙源)
        const url = `https://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(keyword)}&pn=0&rn=25&uid=794761770&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newsearch=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const json = await resp.json();
        const songs = json?.abslist || [];
        list = songs.map(s => {
          const trackId = s.DC_TARGETID || (s.MUSICRID ? s.MUSICRID.replace('MUSIC_', '') : '');
          let cover = '/assets/branding/app_icon.png';
          if (s.web_albumpic_short) {
            cover = `https://img1.kuwo.cn/star/albumcover/` + s.web_albumpic_short.replace(/^120\//, '500/');
          } else if (s.web_artistpic_short) {
            cover = `https://img1.kuwo.cn/star/starheads/` + s.web_artistpic_short.replace(/^120\//, '500/');
          } else if (s.hts_MVPIC) {
            cover = s.hts_MVPIC;
          }
          return {
            id: trackId,
            title: s.SONGNAME || s.FSONGNAME || '未知曲目',
            artist: s.ARTIST || s.FARTIST || '未知歌手',
            album: s.ALBUM || '',
            source: 'kw',
            cover,
            duration: parseInt(s.DURATION, 10) || 0,
          };
        });
      } else {
        // QQ Music
        const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=25&w=${encodeURIComponent(keyword)}&format=json`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
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

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, list }));
    } catch (err) {
      console.error('Search error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 1.5. Lyric API (/api/lyric)
  if (pathname === '/api/lyric') {
    const id = reqUrl.searchParams.get('id') || '';
    const source = reqUrl.searchParams.get('source') || 'qq';

    if (!id) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, lyric: '' }));
      return;
    }

    try {
      let lyric = '';
      if (source === 'wy') {
        const resp = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const json = await resp.json();
        lyric = json?.lrc?.lyric || '';
      } else if (source === 'kw') {
        const title = reqUrl.searchParams.get('title') || '';
        const searchResp = await fetch(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=1&w=${encodeURIComponent(title || id)}&format=json`);
        const searchJson = await searchResp.json();
        const firstMid = searchJson?.data?.song?.list?.[0]?.songmid;
        if (firstMid) {
          const resp = await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${firstMid}&format=json&nobase64=1`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://y.qq.com/' }
          });
          const json = await resp.json();
          lyric = json?.lyric || '';
        }
      } else {
        const resp = await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://y.qq.com/' }
        });
        const json = await resp.json();
        lyric = json?.lyric || '';
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, lyric }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, lyric: '', error: e.message }));
    }
    return;
  }

  // 2. Proxy TuneFree V1 APIs (/v1/*)
  if (pathname.startsWith('/v1/')) {
    const targetUrl = `${TUNEFREE_TARGET}${pathname}${reqUrl.search}`;

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];

    // Read body for POST/PUT/PATCH
    let body = null;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        redirect: 'manual', // preserve 302 redirects for /v1/play/
      });

      const respHeaders = {};
      response.headers.forEach((value, key) => {
        // Exclude problematic headers
        if (key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'content-encoding') {
          respHeaders[key] = value;
        }
      });

      // Special handling for 302 redirects (such as /v1/play/{token})
      if (response.status === 302) {
        const location = response.headers.get('location');
        respHeaders['location'] = location;
      }

      res.writeHead(response.status, respHeaders);
      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error('Proxy error:', err);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: `Proxy Failed: ${err.message}` } }));
    }
    return;
  }

  // 3. Static Files (public/index.html)
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.frag': 'text/plain; charset=utf-8',
      '.vert': 'text/plain; charset=utf-8',
      '.glsl': 'text/plain; charset=utf-8',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🎵 TuneFree Web 代理服务已启动!`);
  console.log(`📡 本地访问地址: http://localhost:${PORT}`);
  console.log(`🔗 代理目标: ${TUNEFREE_TARGET}`);
  console.log(`========================================\n`);
});
