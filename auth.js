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

// UI 업데이트 함수 (ui.js에서 정의)
let updateUserUI;

// 알림 함수 (ui.js에서 정의)
let showNotification;

// 로딩 함수 (ui.js에서 정의) 
let showLoading;

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

// 사용자 포인트 조회
async function getUserPoints(userId) {
  try {
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

// 로그인 함수
async function login(email, password) {
  try {
    showLoading(true);
    
    if (!isValidHanilEmail(email)) {
      throw new Error('한일고등학교 이메일(@hanilgo.cnehs.kr)만 사용 가능합니다.');
    }
    
    const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
    await createUserProfile(userCredential.user);
    
    // 모달 닫기 함수 호출 (ui.js에서 정의)
    if (window.uiFunctions && window.uiFunctions.hideAllModals) {
      window.uiFunctions.hideAllModals();
    }
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
    
    // 모달 닫기 함수 호출 (ui.js에서 정의)
    if (window.uiFunctions && window.uiFunctions.hideAllModals) {
      window.uiFunctions.hideAllModals();
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
    
    await sendPasswordResetEmail(window.firebaseAuth, email);
    
    // 모달 닫기 함수 호출 (ui.js에서 정의)
    if (window.uiFunctions && window.uiFunctions.hideAllModals) {
      window.uiFunctions.hideAllModals();
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
onAuthStateChanged(window.firebaseAuth, async (user) => {
  currentUser = user;
  
  if (user) {
    // 사용자가 로그인된 상태
    console.log('User logged in:', user.email);
    
    // UI 업데이트 함수가 로드되었을 때 호출
    if (updateUserUI) {
      updateUserUI(user);
    } else {
      // UI 함수가 아직 로드되지 않았다면 잠시 후 다시 시도
      setTimeout(() => {
        if (updateUserUI) updateUserUI(user);
      }, 100);
