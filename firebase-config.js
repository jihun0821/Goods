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

// Auth 초기화
const auth = getAuth(app);
console.log('Firebase Auth 초기화 완료');

// hanilpoint 데이터베이스 명시적 지정
// 만약 hanilpoint가 기본 데이터베이스가 아니라면:
const db = getFirestore(app, 'hanilpoint');
// 기본 데이터베이스를 사용한다면:
// const db = getFirestore(app);

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

// Firestore 연결 테스트
setTimeout(async () => {
  try {
    console.log('=== Firestore 연결 테스트 ===');
    console.log('데이터베이스 인스턴스:', db.app.name);
    if (db._delegate && db._delegate._databaseId) {
      console.log('Project ID:', db._delegate._databaseId.projectId);
      console.log('Database ID:', db._delegate._databaseId.database);
    }
  } catch (error) {
    console.error('Firestore 정보 조회 오류:', error);
  }
}, 1000);
