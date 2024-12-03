import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

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

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app); 