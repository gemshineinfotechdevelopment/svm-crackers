/**
 * PWA Installation Helper & Manager
 * Handles 'beforeinstallprompt', standalone detection, service worker registration,
 * and user install triggers for Desktops (Windows/Mac), Tablets, and Mobiles (Android/iOS).
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isAppInstalled = false;

// Check if running in standalone window (installed PWA)
export const checkIsStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const getIsAppInstalled = (): boolean => {
  return isAppInstalled || checkIsStandalone();
};

// Initialize listeners & register service worker
export const initPwa = (): void => {
  if (typeof window === 'undefined') return;

  isAppInstalled = checkIsStandalone();

  // Listen for Chrome/Edge/Android native install prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa_prompt_ready'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isAppInstalled = true;
    window.dispatchEvent(new CustomEvent('pwa_installed'));
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
};

// Check if native prompt is available
export const canInstallPwa = (): boolean => {
  return deferredPrompt !== null;
};

// Trigger the install flow
export const promptPwaInstall = async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
  if (!deferredPrompt) {
    return 'unsupported';
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa_prompt_used'));
    return choice.outcome;
  } catch (error) {
    console.error('[PWA] prompt error:', error);
    return 'unsupported';
  }
};

// Detect device platform for specific installation instructions
export const getDevicePlatform = (): 'windows' | 'mac' | 'android' | 'ios' | 'other' => {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'mac';
  return 'other';
};
