/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker'

// const base = ''
const base = '/subdir'

const sw = self as unknown as ServiceWorkerGlobalScope

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
]

const SpaRootPath = '/__spa_root'

sw.addEventListener('install', (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE)
    await cache.addAll(ASSETS)

    // SPA route cache
    try {
      const response = await fetch('/', { headers: { Accept: 'text/html' } })
      if (response.ok) {
        await cache.put(SpaRootPath, response.clone())
      }
    } catch (e) {}
  }

  event.waitUntil(Promise.all([addFilesToCache(), sw.skipWaiting()]))
})

sw.addEventListener('activate', (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key)
    }
  }

  event.waitUntil(Promise.all([deleteOldCaches(), sw.clients.claim()]))
})

sw.addEventListener('fetch', (event) => {
  // ignore POST requests etc
  if (event.request.method !== 'GET') return

  async function respond() {
    const url = new URL(event.request.url)

    // test route

    if (url.pathname === `/current-time`) {
      const date = new Date()
      return new Response(`generaxted in the service worker base="${base}" time=${date.toLocaleString()}`)
    }

    //

    const cache = await caches.open(CACHE)

    // `build`/`files` can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname)
      if (response != null) {
        // console.log(`service worker: match assets: ${url.pathname}`)
        return response
      }
    }

    // for everything else, try the network first, but
    // fall back to the cache if we're offline
    try {
      const response = await fetch(event.request)

      if (event.request.url.startsWith('http') && response.status === 200) {
        cache.put(event.request, response.clone())
      }

      // console.log(`service worker: fetch: ${url.pathname}`)
      return response
    } catch {
      const response = await cache.match(event.request)
      if (response != null) {
        // console.log(`service worker: match cache: ${url.pathname}`)
        return response
      }
    }

    // SPA route match
    const response = await cache.match(SpaRootPath)
    if (response != null) {
      // console.log(`service worker: match cache: SPA route`)
      return response
    }

    // console.log(`service worker: not found: ${url.pathname}`)
    return new Response(null, { status: 404 })
  }

  event.respondWith(respond())
})
