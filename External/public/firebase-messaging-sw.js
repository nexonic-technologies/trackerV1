importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBYE6khUUPjyDpTI1ZgO_meYYbPnvW4SbA",
  authDomain: "tracker-a27af.firebaseapp.com",
  projectId: "tracker-a27af",
  storageBucket: "tracker-a27af.firebasestorage.app",
  messagingSenderId: "212199400489",
  appId: "1:212199400489:web:6583e9435f18617f192838",
  measurementId: "G-61GDBGL2F6"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
