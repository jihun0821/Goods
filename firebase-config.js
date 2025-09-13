// Firebase 설정 및 초기화
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Firebase 설정 객체
const firebaseConfig = {
  apiKey: "AIzaSyC_YES_I20XByZpXjCN2p1Vp5gueS4Op24",
  authDomain: "hsp-auth-22845.firebaseapp.com",
  projectId: "hsp-auth-22845",
  storageBucket: "hsp-auth-22845.firebasestorage.app",
  messagingSenderId: "1034282361573",
  appId: "1:1034282361573:web:a15b970a18ae7033552a0c",
};

console.log('Firebase 설정:', firebaseConfig);

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
console.log('Firebase 앱 초기화 완료');

// hanilpoint 데이터베이스 사용을 위한 설정
const auth = getAuth(app);
console.log('Firebase Auth 초기화 완료');

// 특정 데이터베이스 ID를 사용하는 경우 (hanilpoint)
// 기본 데이터베이스가 아닌 경우에만 사용
const db = getFirestore(app);
console.log('Firestore 초기화 완료');

// 디버깅용 정보 출력
console.log('프로젝트 ID:', app.options.projectId);
console.log('Auth 도메인:', app.options.authDomain);

// 전역에서 사용할 수 있도록 export
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;

console.log('Firebase 전역 변수 설정 완료');
console.log('Firebase initialized with project:', app.options.projectId);
