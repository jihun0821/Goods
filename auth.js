// Firebase Auth 모듈 import
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let currentUser = null;

// UI 요소들 (한 곳에서만 관리)
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

// 알림 메시지 표시 함수
function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  if (!notification || !notificationMessage) {
    return;
  }
  
  notificationMessage.textContent = message;
  
  // 기존 클래스 제거
  notification.className = '';
  
  // 기본 클래스 추가
  notification.className = 'fixed top-5 right-5 z-[2000] p-4 rounded-lg font-medium shadow-lg min-w-[200px] transform transition-transform duration-300 ease-out max-md:right-3 max-md:left-3 max-md:transform max-md:translate-x-0 max-md:transition-transform max-md:duration-300 max-md:ease-out';
  
  // 타입별 색상 적용
  if (type === 'success') {
    notification.classList.add('bg-emerald-500', 'text-white');
  } else if (type === 'error') {
    notification.classList.add('bg-red-500', 'text-white');
  } else {
    notification.classList.add('bg-blue-500', 'text-white');
  }
  
  // 애니메이션
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    notification.classList.remove('-translate-y-[100px]');
    notification.classList.add('translate-y-0');
  } else {
    notification.classList.remove('translate-x-[400px]');
    notification.classList.add('translate-x-0');
  }
  
  setTimeout(() => {
    if (isMobile) {
      notification.classList.remove('translate-y-0');
      notification.classList.add('-translate-y-[100px]');
    } else {
      notification.classList.remove('translate-x-0');
      notification.classList.add('translate-x-[400px]');
    }
  }, 5000);
}

// 로딩 스피너 표시/숨김
function showLoading(show = true) {
  if (!loadingSpinner) return;
  
  if (show) {
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.classList.add('block');
  } else {
    loadingSpinner.classList.add('hidden');
    loadingSpinner.classList.remove('block');
  }
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

// 이메일 유효성 검사
function isValidHanilEmail(email) {
  return email.endsWith('@hanilgo.cnehs.kr');
}

// 사용자 데이터를 Firestore에 저장
async function createUserProfile(user, additionalData = {}) {
  try {
    if (!window.firebaseDb) {
      throw new Error('Firestore not initialized');
    }
    
    const userRef = doc(window.firebaseDb, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      const { displayName, email, uid } = user;
      const createdAt = serverTimestamp();
      
      await setDoc(userRef, {
        uid,
        displayName: displayName || email.split('@')[0],
        email,
        points: 0,
        createdAt,
        ...additionalData
      });
      
      console.log('User profile created in hanilpoint database');
    }
    
    return userRef;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

// 사용자 포인트 조회
async function getUserPoints(userId) {
  try {
    if (!window.firebaseDb) {
      return 0;
    }
    
    const userRef = doc(window.firebaseDb, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      return userSnapshot.data().points || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting user points:', error);
    return 0;
  }
}

// UI 업데이트
async function updateUserUI(user) {
  currentUser = user;
  
  if (user) {
    if (authButtonText) {
      const displayName = user.displayName || user.email.split('@')[0];
      authButtonText.textContent = displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName;
    }
    if (authButton) {
      authButton.classList.add('user-info-button');
    }
    
    // 포인트 가져오기
    if (userPoints) {
      try {
        const points = await getUserPoints(user.uid);
        userPoints.textContent = points.toLocaleString();
      } catch (error) {
        console.error('Error loading user points:', error);
        userPoints.textContent = '0';
      }
    }
  } else {
    if (authButtonText) {
      authButtonText.textContent = 'LOGIN';
    }
    if (authButton) {
      authButton.classList.remove('user-info-button');
    }
    if (userPoints) {
      userPoints.textContent = '0';
    }
  }
}

// 로그인 함수
async function login(email, password) {
  try {
    showLoading(true);
    
    if (!isValidHanilEmail(email)) {
      throw new Error('한일고등학교 이메일(@hanilgo.cnehs.kr)만 사용 가능합니다.');
    }
    
    if (!window.firebaseAuth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
    await createUserProfile(userCredential.user);
    
    hideAllModals();
    showNotification('로그인되었습니다.', 'success');
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = '로그인에 실패했습니다.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = '등록되지 않은 이메일입니다.';
        break;
      case 'auth/wrong-password':
        errorMessage = '비밀번호가 올바르지 않습니다.';
        break;
      case 'auth/invalid-email':
        errorMessage = '올바른 이메일 형식이 아닙니다.';
        break;
      case 'auth/too-many-requests':
        errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
        break;
      default:
        errorMessage = error.message;
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    showLoading(false);
  }
}

// 회원가입 함수
async function signup(email, password, passwordConfirm) {
  try {
    showLoading(true);
    
    if (!isValidHanilEmail(email)) {
      throw new Error('한일고등학교 이메일(@hanilgo.cnehs.kr)만 사용 가능합니다.');
    }
    
    if (password.length < 6) {
      throw new Error('비밀번호는 6자 이상이어야 합니다.');
    }
    
    if (password !== passwordConfirm) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
    
    if (!window.firebaseAuth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
    await createUserProfile(userCredential.user);
    
    hideAllModals();
    showNotification('회원가입이 완료되었습니다.', 'success');
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = '회원가입에 실패했습니다.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = '이미 사용 중인 이메일입니다.';
        break;
      case 'auth/invalid-email':
        errorMessage = '올바른 이메일 형식이 아닙니다.';
        break;
      case 'auth/weak-password':
        errorMessage = '비밀번호가 너무 약합니다.';
        break;
      default:
        errorMessage = error.message;
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    showLoading(false);
  }
}

// 비밀번호 재설정 함수
async function resetPassword(email) {
  try {
    showLoading(true);
    
    if (!isValidHanilEmail(email)) {
      throw new Error('한일고등학교 이메일(@hanilgo.cnehs.kr)만 사용 가능합니다.');
    }
    
    if (!window.firebaseAuth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    await sendPasswordResetEmail(window.firebaseAuth, email);
    
    hideAllModals();
    showNotification('비밀번호 재설정 이메일이 발송되었습니다.', 'success');
  } catch (error) {
    console.error('Password reset error:', error);
    let errorMessage = '이메일 발송에 실패했습니다.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = '등록되지 않은 이메일입니다.';
        break;
      case 'auth/invalid-email':
        errorMessage = '올바른 이메일 형식이 아닙니다.';
        break;
      default:
        errorMessage = error.message;
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    showLoading(false);
  }
}

// 로그아웃 함수
async function logout() {
  try {
    showLoading(true);
    
    if (!window.firebaseAuth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    await signOut(window.firebaseAuth);
    showNotification('로그아웃되었습니다.', 'success');
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('로그아웃에 실패했습니다.', 'error');
  } finally {
    showLoading(false);
  }
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
    if (currentUser) {
      // 로그인된 상태 - 로그아웃 확인
      if (confirm('로그아웃하시겠습니까?')) {
        logout();
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
      showNotification('이메일과 비밀번호를 입력해주세요.', 'error');
      return;
    }
    
    login(email, password);
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
      showNotification('모든 필드를 입력해주세요.', 'error');
      return;
    }
    
    signup(email, password, passwordConfirm);
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
      showNotification('이메일을 입력해주세요.', 'error');
      return;
    }
    
    resetPassword(email);
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

// Firebase 인증 상태 리스너 설정
function setupAuthStateListener() {
  if (!window.firebaseAuth) {
    console.error('Firebase Auth not initialized');
    return;
  }
  
  onAuthStateChanged(window.firebaseAuth, async (user) => {
    console.log('Auth state changed:', user ? user.email : 'logged out');
    currentUser = user;
    await updateUserUI(user);
  });
}

// 초기화 함수
function initialize() {
  console.log('Initializing auth.js...');
  
  // DOM 요소 초기화
  initializeElements();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // Firebase가 준비되면 인증 상태 리스너 설정
  const checkFirebaseReady = () => {
    if (window.firebaseAuth && window.firebaseDb) {
      console.log('Firebase is ready, setting up auth state listener');
      setupAuthStateListener();
    } else {
      console.log('Waiting for Firebase to be ready...');
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
window.authFunctions = {
  login,
  signup,
  logout,
  resetPassword,
  getCurrentUser: () => currentUser,
  getUserPoints,
  showNotification,
  updateUserUI,
  showLoading,
  hideAllModals
};
