import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// UI 요소들 (한 곳에서 관리)
let loginModal, signupModal, passwordResetModal, authButton, authButtonText, userPoints, notification, notificationMessage, loadingSpinner;

// DOM이 로드된 후 요소들 가져오기
function initializeElements() {
  loginModal = document.getElementById('loginModal');
  signupModal = document.getElementById('signupModal');
  passwordResetModal = document.getElementById('passwordResetModal');
  authButton = document.getElementById('authButton');
  authButtonText = document.getElementById('authButtonText');
  userPoints = document.getElementById('userPoints');
  notification = document.getElementById('notification');
  notificationMessage = document.getElementById('notificationMessage');
  loadingSpinner = document.getElementById('loadingSpinner');
}

// 모달 표시/숨김 함수
function showModal(modal) {
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('block');
    document.body.style.overflow = 'hidden';
  }
}

function hideModal(modal) {
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('block');
    document.body.style.overflow = 'auto';
  }
}

// 모든 모달 숨김
function hideAllModals() {
  hideModal(loginModal);
  hideModal(signupModal);
  hideModal(passwordResetModal);
}

// 폼 입력 필드 초기화
function clearForm(formId) {
  const inputs = document.querySelectorAll(`#${formId} input`);
  inputs.forEach(input => input.value = '');
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 인증 버튼 클릭
  authButton?.addEventListener('click', () => {
    if (window.authCore && window.authCore.getCurrentUser()) {
      // 로그인된 상태 - 로그아웃 확인
      if (confirm('로그아웃하시겠습니까?')) {
        window.authCore.logout();
      }
    } else {
      // 로그아웃 상태 - 로그인 모달 표시
      showModal(loginModal);
    }
  });

  // 로그인 모달 이벤트
  document.getElementById('closeLoginModal')?.addEventListener('click', () => hideModal(loginModal));
  document.getElementById('doLogin')?.addEventListener('click', () => {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
      window.authCore?.showNotification('이메일과 비밀번호를 입력해주세요.', 'error');
      return;
    }
    
    window.authCore?.login(email, password);
  });
  
  // Enter 키로 로그인
  document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('doLogin')?.click();
    }
  });

  // 회원가입 모달 이벤트
  document.getElementById('openSignupLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideModal(loginModal);
    showModal(signupModal);
  });
  
  document.getElementById('closeSignupModal')?.addEventListener('click', () => hideModal(signupModal));
  document.getElementById('doSignup')?.addEventListener('click', () => {
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm')?.value;
    
    if (!email || !password || !passwordConfirm) {
      window.authCore?.showNotification('모든 필드를 입력해주세요.', 'error');
      return;
    }
    
    window.authCore?.signup(email, password, passwordConfirm);
  });
  
  document.getElementById('backToLoginLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideModal(signupModal);
    showModal(loginModal);
  });

  // 비밀번호 재설정 모달 이벤트
  document.getElementById('openPasswordResetLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideModal(loginModal);
    showModal(passwordResetModal);
  });
  
  document.getElementById('closePasswordResetModal')?.addEventListener('click', () => hideModal(passwordResetModal));
  document.getElementById('doPasswordReset')?.addEventListener('click', () => {
    const email = document.getElementById('resetEmail')?.value.trim();
    
    if (!email) {
      window.authCore?.showNotification('이메일을 입력해주세요.', 'error');
      return;
    }
    
    window.authCore?.resetPassword(email);
  });
  
  document.getElementById('backToLoginFromResetLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideModal(passwordResetModal);
    showModal(loginModal);
  });

  // 모달 외부 클릭 시 닫기
  window.addEventListener('click', (e) => {
    if (e.target === loginModal) hideModal(loginModal);
    if (e.target === signupModal) hideModal(signupModal);
    if (e.target === passwordResetModal) hideModal(passwordResetModal);
  });

  // 모달이 열릴 때 폼 초기화
  if (loginModal && signupModal && passwordResetModal) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (!target.classList.contains('hidden')) {
            if (target.id === 'loginModal') clearForm('loginModal');
            if (target.id === 'signupModal') clearForm('signupModal');
            if (target.id === 'passwordResetModal') clearForm('passwordResetModal');
          }
        }
      });
    });

    observer.observe(loginModal, { attributes: true });
    observer.observe(signupModal, { attributes: true });
    observer.observe(passwordResetModal, { attributes: true });
  }
}

// hanilpoint 데이터베이스 전용 디버깅 함수들
const debugHanilpoint = {
  // 현재 연결된 데이터베이스 정보 확인
  checkConnection: () => {
    console.log('=== hanilpoint 연결 상태 ===');
    console.log('Firebase Auth:', !!window.firebaseAuth);
    console.log('Firebase DB:', !!window.firebaseDb);
    console.log('현재 데이터베이스 ID:', window.currentDatabaseId);
    console.log('현재 사용자:', window.firebaseAuth?.currentUser?.email || '로그아웃 상태');
  },
  
  // hanilpoint 컬렉션 데이터 직접 확인
  checkUserData: async (userId = null) => {
    try {
      const uid = userId || window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        console.log('❌ 사용자 ID 없음 (로그인 필요)');
        return;
      }
      
      console.log('=== hanilpoint 사용자 데이터 확인 ===');
      console.log('사용자 UID:', uid);
      
      const userRef = doc(window.firebaseDb, 'hanilpoint', uid);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        console.log('✅ hanilpoint 데이터 존재:');
        console.log('- displayName:', data.displayName);
        console.log('- email:', data.email);
        console.log('- points:', data.points);
        console.log('- 전체 데이터:', data);
        return data;
      } else {
        console.log('❌ hanilpoint에 데이터 없음');
        return null;
      }
    } catch (error) {
      console.error('데이터 확인 실패:', error);
    }
  },
  
  // 데이터 베이스 잘 연결되었나 확인
  checkDefaultProfile: async (userId = null) => {
    try {
      const uid = userId || window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        console.log('❌ 사용자 ID 없음');
        return;
      }
      
      console.log('=== default DB profile 컬렉션 확인 (진단용) ===');
      
      // 기본 데이터베이스 인스턴스 생성
      const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const defaultDb = getFirestore(window.firebaseApp);
      
      const profileRef = doc(defaultDb, 'profile', uid);
      const profileSnapshot = await getDoc(profileRef);
      
      if (profileSnapshot.exists()) {
        const data = profileSnapshot.data();
        console.log('⚠️ default DB에 profile 데이터 발견:');
        console.log('- nickname:', data.nickname);
        console.log('- 전체 데이터:', data);
        console.log('💡 이 데이터가 hanilpoint를 덮어쓰고 있을 수 있습니다');
        return data;
      } else {
        console.log('✅ default DB에 profile 데이터 없음 (정상)');
        return null;
      }
    } catch (error) {
      console.error('default profile 확인 실패:', error);
    }
  },
  
  // hanilpoint에 강제로 이름 설정
  forceUpdateName: async (newDisplayName, userId = null) => {
    try {
      const uid = userId || window.firebaseAuth?.currentUser?.uid;
      if (!uid) {
        console.log('❌ 사용자 ID 없음 (로그인 필요)');
        return;
      }
      
      console.log('=== hanilpoint 이름 강제 업데이트 ===');
      console.log('새 이름:', newDisplayName);
      
      const userRef = doc(window.firebaseDb, 'hanilpoint', uid);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const existingData = userSnapshot.data();
        const updatedData = {
          ...existingData,
          displayName: newDisplayName,
          updatedAt: serverTimestamp()
        };
        
        await setDoc(userRef, updatedData);
        console.log('✅ hanilpoint 이름 업데이트 완료');
        
        // UI 업데이트
        if (window.authCore?.updateUserUI && window.firebaseAuth?.currentUser) {
          await window.authCore.updateUserUI(window.firebaseAuth.currentUser);
        }
        
        return updatedData;
      } else {
        console.log('❌ hanilpoint에 사용자 데이터가 없습니다');
      }
    } catch (error) {
      console.error('이름 업데이트 실패:', error);
    }
  }
};

// 초기화 함수
function initialize() {
  console.log('=== auth-ui.js 초기화 시작 ===');
  
  // DOM 요소 초기화
  initializeElements();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // Firebase가 준비되면 인증 상태 리스너 설정
  const checkFirebaseReady = () => {
    if (window.firebaseAuth && window.firebaseDb && window.authCore) {
      console.log('✅ Firebase와 auth-core 준비 완료, 인증 상태 리스너 설정');
      console.log('- Auth 인스턴스:', !!window.firebaseAuth);
      console.log('- DB 인스턴스:', !!window.firebaseDb);
      console.log('- 데이터베이스 ID:', window.currentDatabaseId);
      console.log('- AuthCore 모듈:', !!window.authCore);
      
      window.authCore.setupAuthStateListener();
    } else {
      console.log('⏳ Firebase 또는 auth-core 준비 대기 중...');
      setTimeout(checkFirebaseReady, 100);
    }
  };
  
  checkFirebaseReady();
}

// DOM이 로드된 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 전역 함수로 내보내기
window.authUI = {
  showModal,
  hideModal,
  hideAllModals,
  clearForm,
  initializeElements,
  setupEventListeners
};

window.debugHanilpoint = debugHanilpoint;
window.authFunctions = {
  ...window.authCore,
  debug: debugHanilpoint
};