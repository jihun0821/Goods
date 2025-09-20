// Firebase Auth 모듈 불러오기
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

// 알림 메시지 표시 함수
function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notificationMessage');
  
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
  const loadingSpinner = document.getElementById('loadingSpinner');
  if (!loadingSpinner) return;
  
  if (show) {
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.classList.add('block');
  } else {
    loadingSpinner.classList.add('hidden');
    loadingSpinner.classList.remove('block');
  }
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
      displayName: finalDisplayName, 
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
    
    // UI 모듈에서 모달을 숨기고 알림을 보여줌
    if (window.authUI && window.authUI.hideAllModals) {
      window.authUI.hideAllModals();
    }
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
    
    if (window.authUI && window.authUI.hideAllModals) {
      window.authUI.hideAllModals();
    }
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
    
    if (window.authUI && window.authUI.hideAllModals) {
      window.authUI.hideAllModals();
    }
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

// UI 업데이트 - hanilpoint 데이터베이스에서만 사용자 정보 가져오기
async function updateUserUI(user) {
  currentUser = user;
  
  const authButton = document.getElementById('authButton');
  const userPoints = document.getElementById('userPoints');
  
  if (user) {
    console.log('=== UI 업데이트 시작 ===');
    console.log('사용자:', user.email);
    
    // hanilpoint 데이터베이스에서만 사용자 프로필 가져오기
    let userProfile = null;
    let displayName = user.email.split('@')[0]; 
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
      // User Box HTML 구조
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
    
    // hanilpoint에서 가져온 포인트 표시
    if (userPoints) {
      userPoints.textContent = points.toLocaleString();
    }
    
    console.log('✅ UI 업데이트 완료');
  } else {
    // 로그아웃 상태/로그인 버튼으로 복원
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

// 전역 함수로 내보내기
window.authCore = {
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
  setupAuthStateListener
};