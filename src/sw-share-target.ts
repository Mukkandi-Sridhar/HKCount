/**
 * sw-share-target.js
 *
 * Injected into the Workbox service worker via vite-plugin-pwa's `injectManifest` config
 * to handle files shared via the Web Share Target API.
 *
 * When WhatsApp shares a file to Githa via the system share sheet, Chrome intercepts
 * the POST request at /share-target and this handler:
 *   1. Reads the shared file from the FormData
 *   2. Broadcasts it to the open app window via BroadcastChannel
 *   3. Redirects the browser to /?share-target so the app knows to listen
 */

// This file is used for documentation purposes.
// The actual SW logic is injected inline via vite-plugin-pwa's additionalManifestEntries.
// See vite.config.ts for the full SW configuration.

/*
  Service Worker Share Target handler (runs inside SW context):

  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    if (url.pathname === '/share-target' && event.request.method === 'POST') {
      event.respondWith(
        (async () => {
          const data = await event.request.formData();
          const file = data.get('chat');
          
          if (file instanceof File) {
            // Broadcast to all open Githa windows
            const clients = await self.clients.matchAll({ includeUncontrolled: true });
            for (const client of clients) {
              client.postMessage({ type: 'shared-file', file });
            }
            
            // Also use BroadcastChannel for windows that open after this event
            const channel = new BroadcastChannel('githa-share-target');
            
            // Store in a temporary cache for the window to retrieve
            // (postMessage to File objects works cross-window via transferable)
            channel.postMessage({ type: 'shared-file', file });
          }
          
          // Redirect to the app
          return Response.redirect('/?share-target', 303);
        })()
      );
    }
  });
*/

export {};
