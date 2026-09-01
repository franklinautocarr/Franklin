const CACHE_NAME = 'franklin-auto-car-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

// Navegação (abrir o app): tenta a rede primeiro, para pegar atualizações;
// se estiver offline, cai no que já foi salvo em cache.
async function handleNavigation(request){
  try{
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put('./index.html', fresh.clone());
    return fresh;
  }catch(err){
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match('./index.html');
    return cached || Response.error();
  }
}

// Demais arquivos (CSS/JS de CDN, ícones, etc.): cache primeiro (rápido e
// funciona offline), buscando na rede apenas se ainda não tiver em cache,
// e guardando o resultado para as próximas vezes.
async function handleAsset(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if(cached) return cached;

  try{
    const response = await fetch(request);
    // Respostas "opacas" (recursos de outra origem, ex.: CDN) também podem
    // ser guardadas em cache mesmo sem podermos inspecionar o status.
    if(response && (response.ok || response.type === 'opaque')){
      cache.put(request, response.clone());
    }
    return response;
  }catch(err){
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if(request.method !== 'GET') return;

  if(request.mode === 'navigate'){
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleAsset(request));
});