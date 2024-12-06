import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCOqBRh9kzXBHbDt5CrAEWdZxGMM_0tpBU",
  authDomain: "chiikawa-draw-chat.firebaseapp.com",
  databaseURL: "https://chiikawa-draw-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chiikawa-draw-chat",
  storageBucket: "chiikawa-draw-chat.firebasestorage.app",
  messagingSenderId: "737967188728",
  appId: "1:737967188728:web:89f96f4978a127cca4290d",
  measurementId: "G-KMRDL2DQ37"
};

// 確保只初始化一次
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);
export const auth = getAuth(app);