// Firebase 설정 및 초기화 - hanilpoint 데이터베이스 연결
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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

console.log('Firebase 설정:', firebaseConfig);

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
console.log('Firebase 앱 초기화 완료');

// Auth 초기화 (Auth는 항상 기본 데이터베이스와 연결됨)
const auth = getAuth(app);
console.log('Firebase Auth 초기화 완료');

// hanilpoint 데이터베이스에 명시적으로 연결
// 중요: Firebase Console에서 hanilpoint라는 이름의 데이터베이스가 실제로 존재해야 합니다
let db;

try {
  // 방법 1: 데이터베이스 ID를 명시적으로 지정
  db = getFirestore(app, 'hanilpoint');
  console.log('✅ hanilpoint 데이터베이스 초기화 시도 완료');
} catch (error) {
  console.error('❌ hanilpoint 데이터베이스 연결 실패:', error);
  console.log('기본 데이터베이스로 폴백');
  db = getFirestore(app); // 기본 데이터베이스로 폴백
}

console.log('Firestore 초기화 완료');

// 디버깅용 정보 출력
console.log('프로젝트 ID:', app.options.projectId);
console.log('Auth 도메인:', app.options.authDomain);

// 전역에서 사용할 수 있도록 export
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;

console.log('Firebase 전역 변수 설정 완료');

// 고급 Firestore 연결 테스트
setTimeout(async () => {
  try {
    console.log('=== 상세 Firestore 연결 테스트 ===');
    console.log('앱 이름:', db.app.name);
    
    // Firestore 내부 정보 접근
    if (db._delegate) {
      console.log('Firestore delegate 존재:', !!db._delegate);
      
      if (db._delegate._databaseId) {
        console.log('프로젝트 ID:', db._delegate._databaseId.projectId);
        console.log('데이터베이스 ID:', db._delegate._databaseId.database);
        
        // hanilpoint 데이터베이스에 연결되었는지 확인
        if (db._delegate._databaseId.database === 'hanilpoint') {
          console.log('✅ 성공: hanilpoint 데이터베이스에 연결됨!');
        } else {
          console.log('⚠️ 경고: 기본 데이터베이스에 연결됨 (' + db._delegate._databaseId.database + ')');
        }
      }
    }
    
    // 추가 확인: Firestore 설정 정보
    console.log('Firestore 앱 설정:', {
      projectId: db.app.options.projectId,
      authDomain: db.app.options.authDomain
    });
    
  } catch (error) {
    console.error('Firestore 정보 조회 오류:', error);
  }
}, 1000);

// 연결 테스트용 함수
window.testFirestoreConnection = async () => {
  try {
    const { doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    // 테스트 문서 생성
    const testDoc = doc(db, 'connection_test', 'test_' + Date.now());
    await setDoc(testDoc, {
      message: 'hanilpoint 데이터베이스 연결 테스트',
      timestamp: serverTimestamp(),
      database: db._delegate?._databaseId?.database || 'unknown'
    });
    
    // 문서 읽기
    const snapshot = await getDoc(testDoc);
    if (snapshot.exists()) {
      console.log('✅ 연결 테스트 성공! 데이터:', snapshot.data());
      return true;
    }
  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error);
    return false;
  }
};

console.log('연결 테스트 함수 등록 완료. window.testFirestoreConnection() 으로 테스트 가능');
