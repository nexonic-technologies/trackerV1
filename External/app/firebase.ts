import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBYE6khUUPjyDpTI1ZgO_meYYbPnvW4SbA",
  authDomain: "tracker-a27af.firebaseapp.com",
  projectId: "tracker-a27af",
  storageBucket: "tracker-a27af.firebasestorage.app",
  messagingSenderId: "212199400489",
  appId: "1:212199400489:web:6583e9435f18617f192838",
  measurementId: "G-61GDBGL2F6"
};

// Initialize Firebase (SSR-safe initialization check)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messaging: Messaging | null = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    } else {
      console.warn("Firebase Messaging is not supported in this browser.");
    }
  });
}

export const requestFirebaseToken = async (): Promise<string | null> => {
  if (typeof window === "undefined" || !messaging) {
    console.warn("Firebase Messaging is not supported in this environment");
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { 
        vapidKey: 'BBdOYk64h_iZLQSPNu5TikSKjuH4nCfefTMgnvC1iDbxFh_WsRUyYsbPxV8fpNg_cpxtWLbvrHuJoM2UYtpDftc' 
      });
      return currentToken || null;
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err);
    return null;
  }
};

export const onMessageListener = (): Promise<any> => {
  if (!messaging) return new Promise((_, reject) => reject("Messaging not supported"));
  return new Promise((resolve) => {
    onMessage(messaging!, (payload) => {
      resolve(payload);
    });
  });
};
