export type WebBudgetNotification = {
  id: string;
  title: string;
  body: string;
  url?: string;
};

export function isWebNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestWebNotificationPermission() {
  if (!isWebNotificationSupported()) return 'denied' as NotificationPermission;
  return Notification.requestPermission();
}

export async function sendWebBudgetNotification(notification: WebBudgetNotification) {
  if (!isWebNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) return false;

  registration.active.postMessage({
    type: 'SHOW_NOTIFICATION',
    title: `Budget It: ${notification.title}`,
    body: notification.body,
    tag: `budget-it-${notification.id}`,
    url: notification.url || '/',
  });

  return true;
}
