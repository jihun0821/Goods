// Firebase 설정 및 초기화
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Firebase 설정 객체
const firebaseConfig = {
  apiKey: "AIzaSyC_YES_I20XByZpXjCN2p1Vp5gueS4Op24",
  authDomain: "hsp-auth-22845.firebaseapp.com",
  projectId: "hsp-auth-22845",
  storageBucket: "hsp-auth-22845.firebasestorage.app",
  messagingSenderId: "1034282361573",
  appId: "1:1034282361573:web:a15b970a18ae7033552a0c",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// hanilpoint 데이터베이스 사용을 위한 설정
const auth = getAuth(app);
const db = getFirestore(app);

// 전역에서 사용할 수 있도록 export
window.firebaseAuth = auth;
window.firebaseDb = db;

console.log('Firebase initialized with hanilpoint database');