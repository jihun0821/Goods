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

// 연결 테스트용 함수 - 더 정확한 데이터베이스 정보 확인
window.testFirestoreConnection = async () => {
  try {
    const { doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    // 현재 연결된 데이터베이스 정보 정확히 파악
    let currentDbName = 'unknown';
    try {
      if (db._delegate && db._delegate._databaseId) {
        currentDbName = db._delegate._databaseId.database;
      }
    } catch (e) {
      console.warn('데이터베이스 이름 추출 실패:', e);
    }
    
    console.log('현재 연결된 데이터베이스:', currentDbName);
    
    // 테스트 문서 생성
    const testDoc = doc(db, 'connection_test', 'test_' + Date.now());
    const testData = {
      message: 'Firebase 데이터베이스 연결 테스트',
      timestamp: serverTimestamp(),
      database: currentDbName,
      targetDatabase: 'hanilpoint',
      success: currentDbName === 'hanilpoint'
    };
    
    await setDoc(testDoc, testData);
    
    // 문서 읽기
    const snapshot = await getDoc(testDoc);
    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log('✅ 연결 테스트 성공!');
      console.log('저장된 데이터:', data);
      
      if (data.success) {
        console.log('🎉 hanilpoint 데이터베이스에 성공적으로 연결됨!');
      } else {
        console.log('⚠️ 다른 데이터베이스에 연결됨:', data.database);
        console.log('해결책을 제안합니다...');
      }
      
      return data;
    }
  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error);
    
    // 오류 유형별 안내
    if (error.code === 'permission-denied') {
      console.log('💡 해결책: Firestore 보안 규칙을 확인하세요');
    } else if (error.code === 'not-found') {
      console.log('💡 해결책: 데이터베이스나 컬렉션이 존재하지 않습니다');
    } else {
      console.log('💡 일반적인 해결책:');
      console.log('1. Firebase Console에서 hanilpoint 데이터베이스 존재 확인');
      console.log('2. 보안 규칙 확인');
      console.log('3. 네트워크 연결 확인');
    }
    
    return false;
  }
};

// 추가: 모든 가능한 데이터베이스 이름으로 연결 시도
window.tryAllDatabases = async () => {
  const possibleNames = [
    '(default)',
    'default', 
    'hanilpoint',
    'hsp-auth-22845',
    'firestore'
  ];
  
  console.log('=== 모든 가능한 데이터베이스 연결 시도 ===');
  
  for (const dbName of possibleNames) {
    try {
      console.log(`\n${dbName} 시도 중...`);
      const testDb = getFirestore(app, dbName);
      
      // 실제 연결된 데이터베이스 이름 확인
      let actualName = 'unknown';
      if (testDb._delegate && testDb._delegate._databaseId) {
        actualName = testDb._delegate._databaseId.database;
      }
      
      console.log(`✅ ${dbName} -> 실제 연결: ${actualName}`);
      
      if (actualName === 'hanilpoint') {
        console.log('🎯 hanilpoint 데이터베이스 발견! 이 설정을 사용하세요:');
        console.log(`db = getFirestore(app, '${dbName}');`);
        
        // 전역 db 변수 업데이트
        window.firebaseDb = testDb;
        return testDb;
      }
      
    } catch (error) {
      console.log(`❌ ${dbName} 실패:`, error.message);
    }
  }
  
  console.log('⚠️ hanilpoint 데이터베이스를 찾지 못했습니다');
  return null;
};

console.log('연결 테스트 함수 등록 완료. window.testFirestoreConnection() 으로 테스트 가능');
