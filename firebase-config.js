// Firebase 설정 및 초기화 - Firebase v10 호환 버전 (수정됨)
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

// hanilpoint 데이터베이스 연결 - Firebase v10 방식
console.log('=== hanilpoint 데이터베이스 연결 시도 ===');

let db;
let currentDatabaseId = 'unknown';

try {
  // hanilpoint 데이터베이스에 연결
  db = getFirestore(app, 'hanilpoint');
  currentDatabaseId = 'hanilpoint';
  
  console.log('✅ hanilpoint 데이터베이스 연결 성공');
  console.log('타겟 데이터베이스 ID:', currentDatabaseId);
  
  // 연결 테스트를 더 안전한 방식으로 수정
  setTimeout(async () => {
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      // 더 안전한 연결 테스트 - 존재하지 않는 문서 읽기 시도
      const testDoc = doc(db, 'connection_test', 'test_read');
      await getDoc(testDoc); // 문서가 없어도 연결은 확인됨
      
      console.log('🎉 hanilpoint 데이터베이스 연결 확인됨!');
    } catch (error) {
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        console.log('✅ hanilpoint 데이터베이스 연결됨 (권한/문서 없음은 정상)');
      } else {
        console.error('❌ 데이터베이스 연결 테스트 실패:', error);
      }
    }
  }, 1000);
  
} catch (error) {
  console.error('❌ hanilpoint 데이터베이스 연결 실패:', error);
  
  // 기본 데이터베이스로 폴백
  console.log('기본 데이터베이스로 폴백');
  db = getFirestore(app);
  currentDatabaseId = '(default)';
}

// 디버깅용 정보 출력
console.log('프로젝트 ID:', app.options.projectId);
console.log('사용 중인 데이터베이스:', currentDatabaseId);

// 전역에서 사용할 수 있도록 export
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;
window.currentDatabaseId = currentDatabaseId; // 현재 데이터베이스 ID 저장

console.log('Firebase 전역 변수 설정 완료');

// 수정된 연결 테스트 함수
window.testFirestoreConnection = async () => {
  try {
    console.log('=== 실제 데이터베이스 연결 테스트 시작 ===');
    console.log('목표 데이터베이스: hanilpoint');
    console.log('설정된 데이터베이스:', window.currentDatabaseId);
    
    const { doc, setDoc, getDoc, serverTimestamp, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    // 안전한 컬렉션명 사용 (예약어 피함)
    const testDocId = 'db_test_' + Date.now();
    const testDoc = doc(db, 'system_test', testDocId);
    const testData = {
      message: 'hanilpoint 데이터베이스 연결 테스트',
      timestamp: serverTimestamp(),
      configuredDatabase: window.currentDatabaseId,
      testTime: new Date().toISOString(),
      success: true
    };
    
    console.log('테스트 데이터 저장 중...');
    await setDoc(testDoc, testData);
    console.log('✅ 데이터 저장 성공');
    
    // 저장된 데이터 읽기
    console.log('저장된 데이터 읽기 중...');
    const snapshot = await getDoc(testDoc);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log('✅ 데이터 읽기 성공!');
      console.log('저장된 데이터:', data);
      
      // Firebase Console에서 확인할 수 있도록 정보 출력
      console.log('📍 Firebase Console에서 확인:');
      console.log(`- 프로젝트: ${app.options.projectId}`);
      console.log(`- 데이터베이스: ${window.currentDatabaseId}`);
      console.log(`- 컬렉션: system_test`);
      console.log(`- 문서 ID: ${testDoc.id}`);
      
      // 테스트 문서 삭제 (정리)
      try {
        await deleteDoc(testDoc);
        console.log('✅ 테스트 문서 정리 완료');
      } catch (deleteError) {
        console.warn('⚠️ 테스트 문서 삭제 실패 (무시 가능):', deleteError.message);
      }
      
      return {
        success: true,
        database: window.currentDatabaseId,
        data: data
      };
    } else {
      console.error('❌ 저장된 데이터를 읽을 수 없음');
      return { success: false, error: 'Document not found after creation' };
    }
    
  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error);
    console.log('오류 상세:');
    console.log('- 코드:', error.code);
    console.log('- 메시지:', error.message);
    
    // 해결책 제시
    if (error.code === 'permission-denied') {
      console.log('💡 해결책: Firestore 보안 규칙 확인 필요');
      console.log('   규칙 예시: allow read, write: if request.auth != null;');
    } else if (error.code === 'invalid-argument') {
      console.log('💡 해결책: 컬렉션/문서 이름이 올바른지 확인');
    }
    
    return { success: false, error: error.message };
  }
};

// 양쪽 데이터베이스 비교 테스트 (수정됨)
window.compareDatabases = async () => {
  try {
    console.log('=== 기본 vs hanilpoint 데이터베이스 비교 ===');
    
    const { doc, setDoc, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    // 기본 데이터베이스
    const defaultDb = getFirestore(app);
    const defaultTestDoc = doc(defaultDb, 'db_comparison', 'default_test_' + Date.now());
    
    // hanilpoint 데이터베이스  
    const hanilpointDb = getFirestore(app, 'hanilpoint');
    const hanilpointTestDoc = doc(hanilpointDb, 'db_comparison', 'hanilpoint_test_' + Date.now());
    
    const testData = {
      database: 'test',
      timestamp: serverTimestamp(),
      testId: Date.now()
    };
    
    // 양쪽에 모두 저장 시도
    console.log('기본 데이터베이스에 저장 시도...');
    try {
      await setDoc(defaultTestDoc, { ...testData, database: 'default' });
      console.log('✅ 기본 데이터베이스 저장 성공');
    } catch (e) {
      console.log('❌ 기본 데이터베이스 저장 실패:', e.message);
    }
    
    console.log('hanilpoint 데이터베이스에 저장 시도...');
    try {
      await setDoc(hanilpointTestDoc, { ...testData, database: 'hanilpoint' });
      console.log('✅ hanilpoint 데이터베이스 저장 성공');
    } catch (e) {
      console.log('❌ hanilpoint 데이터베이스 저장 실패:', e.message);
    }
    
    // Firebase Console 확인 안내
    console.log('📍 Firebase Console에서 다음을 확인하세요:');
    console.log('1. 기본 데이터베이스 → db_comparison 컬렉션');
    console.log('2. hanilpoint 데이터베이스 → db_comparison 컬렉션');
    console.log('3. 각각 다른 문서가 저장되었는지 확인');
    
  } catch (error) {
    console.error('비교 테스트 실패:', error);
  }
};

// 간단한 권한 테스트 함수 추가
window.testFirebasePermissions = async () => {
  try {
    console.log('=== Firebase 권한 테스트 ===');
    
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    // 인증 없이 읽기 시도
    console.log('1. 인증 없는 상태에서 읽기 테스트...');
    const testDoc = doc(db, 'hanilpoint', 'nonexistent_user');
    
    try {
      await getDoc(testDoc);
      console.log('✅ 읽기 권한 있음 (또는 문서 없음)');
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.log('❌ 읽기 권한 없음 - 로그인 필요');
        console.log('💡 Firestore 규칙에서 인증된 사용자만 접근 허용 중');
      } else {
        console.log('⚠️ 기타 오류:', error.message);
      }
    }
    
    // 현재 인증 상태 확인
    console.log('2. 현재 인증 상태:', window.firebaseAuth.currentUser ? '로그인됨' : '로그아웃됨');
    
  } catch (error) {
    console.error('권한 테스트 실패:', error);
  }
};

console.log('🚀 테스트 함수 준비 완료 (수정됨):');
console.log('- window.testFirestoreConnection() : 연결 테스트 (안전한 컬렉션명 사용)');
console.log('- window.compareDatabases() : 데이터베이스 비교');
console.log('- window.testFirebasePermissions() : 권한 테스트');
