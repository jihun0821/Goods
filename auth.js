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

// DOM 요소 가져오기
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const passwordResetModal = document.getElementById('passwordResetModal');
const authButton = document.getElementById('authButton');
const authButtonText = document.getElementById('authButtonText');
const userPoints = document.getElementById('userPoints');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

let currentUser = null;

// 알림 메시지 표시 함수
function showNotification(message, type = 'info') {
  notificationMessage.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// 로딩 스피너 표시/숨김
function showLoading(show = true) {
  loadingSpinner.style.display = show ? 'block' : 'none';
}

// 모달 표시/숨김 함수
function showModal(modal) {
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
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

// 사용자 포인트 가져오기
async function getUserPoints(uid) {
  try {
    const userRef = doc(window.firebaseDb, 'users', uid);
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
  if (user) {
    currentUser = user;
    authButtonText.textContent = user.displayName || user.email.split('@')[0];
    authButton.classList.add('user-info-button');
    
    // 포인트 가져오기
    const points = await getUserPoints(user.uid);
    userPoints.textContent = points.toLocaleString();
  } else {
    currentUser = null;
    authButtonText.textContent = 'LOGIN';
    authButton.classList.remove('user-info-button');
    userPoints.textContent = '0';
  }
}

// 로그인 함수
async function login(email, password) {
  try {
    showLoading(true);
    
    if (!isValidHanilEmail(email)) {
      throw new Error('한일고등학교 이메일(@hanilgo.cnehs.kr)만 사용 가능합니다.');
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
    await signOut(window.firebaseAuth);
    showNotification('로그아웃되었습니다.', 'success');
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('로그아웃에 실패했습니다.', 'error');
  } finally {
    showLoading(false);
  }
}

// 사용자 인증 상태 변경 리스너
onAuthStateChanged(window.firebaseAuth, (user) => {
  updateUserUI(user);
});

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
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
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      showNotification('이메일과 비밀번호를 입력해주세요.', 'error');
      return;
    }
    
    login(email, password);
  });
  
  // Enter 키로 로그인
  document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('doLogin').click();
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
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    
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
    const email = document.getElementById('resetEmail').value.trim();
    
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

  // 폼 입력 필드 초기화
  const clearForm = (formId) => {
    const inputs = document.querySelectorAll(`#${formId} input`);
    inputs.forEach(input => input.value = '');
  };

  // 모달이 열릴 때 폼 초기화
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target;
        if (target.style.display === 'block') {
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
});

// 전역 함수로 내보내기 (다른 스크립트에서 사용할 수 있도록)
window.authFunctions = {
  login,
  signup,
  logout,
  resetPassword,
  getCurrentUser: () => currentUser,
  getUserPoints,
  showNotification
};
