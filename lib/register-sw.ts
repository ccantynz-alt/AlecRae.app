/**
 * Registers the service worker for offline support and push notifications.
 * Should be called once on app startup (client-side only).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    // Check for updates periodically (every 60 minutes)
    setInterval(() => {
      registration.update().catch(() => {
        // Silent fail — update check is non-critical
      });
    }, 60 * 60 * 1000);

    // Handle updates — notify user when a new version is available
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New version available — dispatch a custom event for the UI to handle
          window.dispatchEvent(
            new CustomEvent('sw-update-available', {
              detail: { registration },
            })
          );
        }
      });
    });

    return registration;
  } catch (error) {
    console.warn('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Requests notification permission from the user.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Already granted
  if (Notification.permission === 'granted') {
    return true;
  }

  // Previously denied — cannot re-request
  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    // Safari < 16.4 uses callback-based API
    return new Promise((resolve) => {
      Notification.requestPermission((result) => {
        resolve(result === 'granted');
      });
    });
  }
}
