import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBnShUDyTKE8UjgiQYA1Os830TxKoWMKVQ",
  authDomain: "draw-7774d.firebaseapp.com",
  databaseURL: "https://draw-7774d-default-rtdb.firebaseio.com",
  projectId: "draw-7774d",
  storageBucket: "draw-7774d.firebasestorage.app",
  messagingSenderId: "853341293278",
  appId: "1:853341293278:web:4b7ee01259c97f5395904f",
  measurementId: "G-TD509FKTPS"
};

// 確保只初始化一次
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);
export const auth = getAuth(app);