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

// 사용자 프로필에 displayName 설정을 위한 함수
async function updateDisplayName(user, name) {
  try {
    await updateProfile(user, {
      displayName: name
    });
    console.log('Display name updated successfully');
  } catch (error) {
    console.error('Error updating display name:', error);
  }
}

// hanilpoint 데이터베이스에서만 사용자 프로필 생성/업데이트
async function createUserProfile(user, additionalData = {}) {
  try {
    console.log('=== hanilpoint 프로필 생성 시작 ===');
    console.log('사용자 UID:', user.uid);
    console.log('사용자 이메일:', user.email);
    console.log('hanilpoint Firestore 인스턴스:', !!window.firebaseDb);
    console.log('현재 데이터베이스 ID:', window.currentDatabaseId);
    console.log('현재 인증 상태:', !!window.firebaseAuth.currentUser);
    
    if (!window.firebaseDb) {
      throw new Error('hanilpoint Firestore not initialized');
    }
    
    // hanilpoint 데이터베이스 사용 확인
    if (window.currentDatabaseId !== 'hanilpoint') {
      console.warn('⚠️ 경고: hanilpoint 데이터베이스가 아닌 다른 DB 연결됨:', window.currentDatabaseId);
    }
    
    // 인증 토큰 확인
    const token = await user.getIdToken();
    console.log('인증 토큰 존재:', !!token);
    
    // hanilpoint 컬렉션에서 사용자 프로필 참조
    const userRef = doc(window.firebaseDb, 'hanilpoint', user.uid);
    console.log('문서 참조 생성 (hanilpoint):', userRef.id);
    
    // hanilpoint 컬렉션에서 기존 프로필 확인
    console.log('hanilpoint 컬렉션에서 기존 프로필 확인 중...');
    const userSnapshot = await getDoc(userRef);
    console.log('hanilpoint 프로필 존재 여부:', userSnapshot.exists());
    
    const { displayName, email, uid } = user;
    let finalDisplayName = displayName;
    
    // 기존 프로필이 있으면 기존 displayName 우선 사용
    if (userSnapshot.exists()) {
      const existingData = userSnapshot.data();
      console.log('기존 hanilpoint 프로필 데이터:', existingData);
      
      // 기존 프로필의 displayName이 있으면 그것을 우선 사용
      if (existingData.displayName) {
        finalDisplayName = existingData.displayName;
        console.log('✅ 기존 hanilpoint displayName 유지:', finalDisplayName);
      }
    }
    
    // displayName이 여전히 없으면 이메일에서 추출
    if (!finalDisplayName) {
      const emailPrefix = email.split('@')[0];
      finalDisplayName = emailPrefix;
      console.log('이메일에서 displayName 생성:', finalDisplayName);
      
      // Firebase Auth 프로필에도 displayName 설정
      await updateDisplayName(user, finalDisplayName);
    }
    
    // hanilpoint에만 프로필 저장 (기존 데이터 보존하며 업데이트)
    const userData = {
      uid,
      displayName: finalDisplayName, // 기존 이름 우선 보존
      email,
      points: userSnapshot.exists() ? (userSnapshot.data().points || 0) : 0,
      createdAt: userSnapshot.exists() ? userSnapshot.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('hanilpoint에 저장할 프로필 데이터:', userData);
    await setDoc(userRef, userData);
    console.log('✅ hanilpoint에 사용자 프로필 생성/업데이트 완료');
    
    return userRef;
  } catch (error) {
    console.error('=== hanilpoint 프로필 생성 오류 ===');
    console.error('오류 타입:', error.constructor.name);
    console.error('오류 코드:', error.code);
    console.error('오류 메시지:', error.message);
    console.error('전체 오류:', error);
    
    if (error.code === 'permission-denied') {
      console.error('권한 거부: hanilpoint Firestore 규칙을 확인하세요');
    }
    
    throw error;
  }
}

// hanilpoint 데이터베이스에서만 사용자 프로필 정보 가져오기
async function getUserProfile(userId) {
  try {
    console.log('=== hanilpoint에서 사용자 프로필 가져오기 ===');
    console.log('사용자 ID:', userId);
    console.log('현재 데이터베이스 ID:', window.currentDatabaseId);
    
    if (!window.firebaseDb) {
      console.error('hanilpoint Firestore not initialized');
      return null;
    }
    
    // hanilpoint 컬렉션에서만 조회
    const userRef = doc(window.firebaseDb, 'hanilpoint', userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      const profileData = userSnapshot.data();
      console.log('✅ hanilpoint에서 프로필 가져옴:', profileData);
      return profileData;
    } else {
      console.log('❌ hanilpoint에 프로필 없음');
      return null;
    }
  } catch (error) {
    console.error('hanilpoint에서 사용자 프로필 가져오기 실패:', error);
    return null;
  }
}

// hanilpoint 데이터베이스에서만 사용자 포인트 조회
async function getUserPoints(userId) {
  try {
    if (!window.firebaseDb) {
      return 0;
    }
    
    console.log('hanilpoint에서 포인트 조회:', userId);
    
    // hanilpoint 컬렉션에서만 포인트 조회
    const userRef = doc(window.firebaseDb, 'hanilpoint', userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      const points = userSnapshot.data().points || 0;
      console.log('✅ hanilpoint에서 포인트 가져옴:', points);
      return points;
    }
    console.log('❌ hanilpoint에서 포인트 정보 없음, 기본값 0 반환');
    return 0;
  } catch (error) {
    console.error('hanilpoint에서 사용자 포인트 가져오기 실패:', error);
    return 0;
  }
}

// UI 업데이트 - hanilpoint 데이터베이스에서만 사용자 정보 가져오기
async function updateUserUI(user) {
  currentUser = user;
  
  if (user) {
    console.log('=== UI 업데이트 시작 ===');
    console.log('사용자:', user.email);
    
    // hanilpoint 데이터베이스에서만 사용자 프로필 가져오기
    let userProfile = null;
    let displayName = user.email.split('@')[0]; // 기본값
    let userEmail = user.email;
    let points = 0;
    
    try {
      // hanilpoint에서만 프로필 조회
      userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        displayName = userProfile.displayName || displayName;
        points = userProfile.points || 0;
        console.log('✅ hanilpoint에서 가져온 사용자 프로필 사용');
        console.log('- displayName:', displayName);
        console.log('- points:', points);
      } else {
        console.log('❌ hanilpoint에 프로필이 없음, 새로 생성');
        // 프로필이 없으면 생성 시도
        try {
          await createUserProfile(user);
          // 다시 프로필 가져오기
          userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            displayName = userProfile.displayName || displayName;
            points = userProfile.points || 0;
            console.log('✅ 새로 생성된 프로필 사용');
          }
        } catch (createError) {
          console.error('프로필 생성 실패:', createError);
        }
      }
    } catch (error) {
      console.error('hanilpoint에서 사용자 프로필 가져오기 실패:', error);
      console.log('기본값 사용 - displayName:', displayName);
    }
    
    if (authButton) {
      // User Box HTML 구조로 변경
      authButton.innerHTML = `
        <div class="flex items-center gap-3 w-full">
          <img class="w-12 h-12 rounded-full" src="/-/images/profile.png" alt="user" />
          <div class="flex flex-col flex-1 min-w-0">
            <div class="text-base font-semibold text-black truncate">${displayName}</div>
            <div class="text-xs font-semibold text-black truncate">${userEmail}</div>
          </div>
        </div>
        <img class="w-3.5 h-3.5 flex-shrink-0" src="/-/images/underarrow.png" alt="dropdown icon" />
      `;
      
      // 스타일 변경
      authButton.className = "w-full md:w-72 h-16 bg-zinc-100 rounded-3xl backdrop-blur-[2px] relative flex items-center px-4 flex-shrink-0 cursor-pointer hover:bg-zinc-200 transition-all duration-300";
    }
    
    // hanilpoint에서 가져온 포인트만 표시
    if (userPoints) {
      userPoints.textContent = points.toLocaleString();
    }
    
    console.log('✅ UI 업데이트 완료');
  } else {
    // 로그아웃 상태 - 로그인 버튼으로 복원
    if (authButton) {
      authButton.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-zinc-300/90 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4m-5-4l4-4m0 0l-4-4m4 4H3"></path>
            </svg>
          </div>
          <span id="authButtonText" class="text-black font-semibold text-lg">LOGIN</span>
        </div>
      `;
      
      // 스타일 복원
      authButton.className = "w-full md:w-72 h-16 bg-white border-2 border-[#C5D4F2] rounded-3xl flex items-center justify-center px-4 flex-shrink-0 cursor-pointer hover:shadow-lg transition-all duration-300";
    }
    
    if (userPoints) {
      userPoints.textContent = '0';
    }
  }
}

// 로그인 함수 수정 - hanilpoint만 사용
async function login(email, password) {
  try {
    showLoading(true);
    
    if (!isValidHanilEmail(email)) {
      throw new Error('한일고등학교 이메일(@hanilgo.cnehs.kr)만 사용 가능합니다.');
    }
    
    if (!window.firebaseAuth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    console.log('=== 로그인 시작 ===');
    console.log('이메일:', email);
    console.log('목표 데이터베이스:', window.currentDatabaseId);
    
    const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
    console.log('✅ Firebase 인증 성공:', userCredential.user.uid);
    
    // hanilpoint 컬렉션에서만 프로필 생성/업데이트
    try {
      await createUserProfile(userCredential.user);
      console.log('✅ hanilpoint에 사용자 프로필 생성/업데이트 성공');
    } catch (profileError) {
      // 프로필 생성 실패해도 로그인은 성공한 상태
      console.error('❌ hanilpoint 프로필 생성/업데이트 실패 (로그인은 성공):', profileError);
      showNotification('로그인은 성공했지만 프로필 저장에 문제가 있습니다.', 'info');
    }
    
    hideAllModals();
    showNotification('로그인되었습니다.', 'success');
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = '로그인에 실패했습니다.';
    
    // Firebase Auth 에러만 처리
    if (error.code) {
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
    } else {
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
    console.log('=== 인증 상태 변경 ===');
    console.log('사용자:', user ? user.email : '로그아웃');
    console.log('현재 데이터베이스:', window.currentDatabaseId);
    
    currentUser = user;
    await updateUserUI(user);
  });
}

// 초기화 함수
function initialize() {
  console.log('=== auth.js 초기화 시작 ===');
  console.log('목표: hanilpoint 데이터베이스만 사용');
  
  // DOM 요소 초기화
  initializeElements();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // Firebase가 준비되면 인증 상태 리스너 설정
  const checkFirebaseReady = () => {
    if (window.firebaseAuth && window.firebaseDb) {
      console.log('✅ Firebase 준비 완료, 인증 상태 리스너 설정');
      console.log('- Auth 인스턴스:', !!window.firebaseAuth);
      console.log('- DB 인스턴스:', !!window.firebaseDb);
      console.log('- 데이터베이스 ID:', window.currentDatabaseId);
      
      setupAuthStateListener();
    } else {
      console.log('⏳ Firebase 준비 대기 중...');
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

// hanilpoint 데이터베이스 전용 디버깅 함수들
window.debugHanilpoint = {
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
  
  // default 데이터베이스의 profile 컬렉션 확인 (문제 진단용)
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
        if (window.authFunctions?.updateUserUI && window.firebaseAuth?.currentUser) {
          await window.authFunctions.updateUserUI(window.firebaseAuth.currentUser);
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

// 전역 함수로 내보내기
window.authFunctions = {
  login,
  signup,
  logout,
  resetPassword,
  getCurrentUser: () => currentUser,
  getUserPoints,
  getUserProfile,
  showNotification,
  updateUserUI,
  showLoading,
  hideAllModals,
  // 디버깅 도구 추가
  debug: window.debugHanilpoint
};

console.log('✅ auth.js 초기화 완료 - hanilpoint 전용 모드');
console.log('🔧 디버깅 도구 사용법:');
console.log('- window.debugHanilpoint.checkConnection() : 연결 상태 확인');
console.log('- window.debugHanilpoint.checkUserData() : hanilpoint 데이터 확인');
console.log('- window.debugHanilpoint.checkDefaultProfile() : default profile 확인');
console.log('- window.debugHanilpoint.forceUpdateName("새이름") : 이름 강제 변경');
