const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctujarlgvrklvlusuhvi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dWphcmxndnJrbHZsdXN1aHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NDk4ODAsImV4cCI6MjA4MTIyNTg4MH0.cFPMzshQlNcwNsYoZe6DiikfY6T5IRgr09voBdybIhI';
const LOVABLE_URL = process.env.LOVABLE_URL || 'https://e2d65d6f-54c5-4e93-ab79-5765af6220ea.lovableproject.com';
const APP_SUBDOMAIN = 'app.zeyra.io';
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  try {
    const hostHeader = String(req.headers.host || "");
    const host = hostHeader.split(":")[0].trim().toLowerCase();
    console.log(`[${new Date().toISOString()}] Request: ${host || "(no-host)"}${req.url}`);

    if (req.url === '/health' || req.url === '/_health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // app.zeyra.io → Lovable dashboard
    if (host === APP_SUBDOMAIN) {
      const targetUrl = LOVABLE_URL + req.url;
      console.log(`Proxying to Lovable: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: { 'Host': new URL(LOVABLE_URL).host, 'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress, 'X-Forwarded-Proto': 'https' },
      });
      const body = await response.text();
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8', 'X-Served-By': 'zeyra-proxy-lovable' });
      res.end(body);
      return;
    }

    // pages.zeyra.io e domínios customizados → serve-page
    const servePageUrl = `${SUPABASE_URL}/functions/v1/serve-page?custom_domain=${encodeURIComponent(host)}`;
    const response = await fetch(servePageUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'X-Original-Host': host },
    });
    const html = await response.text();
    res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8', 'X-Served-By': 'zeyra-proxy' });
    res.end(html);
  } catch (err) {
    console.error(`Error:`, err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erro interno do proxy.');
  }
});

server.listen(PORT, () => console.log(`🚀 Zeyra Proxy running on port ${PORT}`));
