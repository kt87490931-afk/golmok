import { supabase } from './supabase_client.js';
import { FIREBASE_CONFIG, FIREBASE_VAPID_KEY, isFirebaseConfigured } from './firebase_config.js';

let messagingInstance = null;

export async function initFCM() {
  if (!isFirebaseConfigured()) {
    console.info('FCM: firebase_config.js에 실제 Firebase 값을 입력하세요.');
    return null;
  }
  if (!('Notification' in window)) return null;

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
    const { getMessaging, getToken, onMessage, isSupported } = await import(
      'https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js'
    );

    if (!(await isSupported())) return null;

    const app = initializeApp(FIREBASE_CONFIG);
    messagingInstance = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messagingInstance, { vapidKey: FIREBASE_VAPID_KEY });
    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ fcm_token: token, push_enabled: true }).eq('id', user.id);
      }
    }

    onMessage(messagingInstance, (payload) => {
      const body = payload.notification?.body || '새 알림이 있습니다';
      if (typeof window.showToast === 'function') window.showToast(body);
    });

    return token;
  } catch (err) {
    console.error('FCM 초기화 실패:', err);
    return null;
  }
}

/** 댓글 알림 (FastAPI 연동 전까지 로그만) */
export async function sendCommentNotification(postOwnerId, commenterName) {
  const { data: owner } = await supabase
    .from('users')
    .select('fcm_token, push_enabled')
    .eq('id', postOwnerId)
    .maybeSingle();

  if (!owner?.fcm_token || !owner?.push_enabled) return;

  console.info('[FCM] 댓글 알림 대상:', postOwnerId, commenterName);
  // TODO: FastAPI /api/notify/comment 연동
}

window.initFCM = initFCM;
