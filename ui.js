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
  notification.className = `fixed top-5 right-5 z-[2000] p-4 rounded-lg font-medium shadow-lg min-w-[200px] transform transition-transform duration-300 ease-out max-md:right-3 max-md:left-3 max-md:transform max-md:translate-x-0 max-md:transition-transform max-md:duration-300 max-md:ease-out`;
  
  // 타입별 색상 적용
  if (type === 'success') {
    notification.classList.add('bg-emerald-500', 'text-white');
  } else if (type === 'error') {
    notification.classList.add('bg-red-500', 'text-white');
  } else {
    notification.classList.add('bg-blue-500', 'text-white');
  }
  
  // 모바일에서는 translateY, 데스크톱에서는 translateX 사용
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
  modal.classList.remove('hidden');
  modal.classList.add('block');
  document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
  modal.classList.add('hidden');
  modal.classList.remove('block');
  document.body.style.overflow = 'auto';
}

// 모든 모달 숨김
function hideAllModals() {
  hideModal(loginModal);
  hideModal(signupModal);
  hideModal(passwordResetModal);
}

// 사용자 UI 업데이트 함수
async function updateUserUI(user) {
  currentUser = user;
  
  if (user) {
    // 로그인된 상태
    const displayName = user.displayName || user.email.split('@')[0];
    authButtonText.textContent = displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName;
    
    // 사용자 포인트 표시
    if (window.authFunctions && window.authFunctions.getUserPoints) {
      try {
        const points = await window.authFunctions.getUserPoints(user.uid);
        userPoints.textContent = points.toLocaleString();
      } catch (error) {
        console.error('Error loading user points:', error);
        userPoints.textContent = '0';
      }
    }
  } else {
    // 로그아웃된 상태
    authButtonText.textContent = 'LOGIN';
    userPoints.textContent = '0';
  }
}

// 폼 입력 필드 초기화
function clearForm(formId) {
  const inputs = document.querySelectorAll(`#${formId} input`);
  inputs.forEach(input => input.value = '');
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
  // auth.js에서 UI 함수들을 사용할 수 있도록 설정
  if (window.authFunctions && window.authFunctions.setUIFunctions) {
    window.authFunctions.setUIFunctions({
      updateUserUI,
      showNotification,
      showLoading
    });
  }

  // 인증 버튼 클릭
  authButton?.addEventListener('click', () => {
    if (currentUser) {
      // 로그인된 상태 - 로그아웃 확인
      if (confirm('로그아웃하시겠습니까?')) {
        if (window.authFunctions && window.authFunctions.logout) {
          window.authFunctions.logout();
        }
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
    
    if (window.authFunctions && window.authFunctions.login) {
      window.authFunctions.login(email, password);
    }
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
    
    if (window.authFunctions && window.authFunctions.signup) {
      window.authFunctions.signup(email, password, passwordConfirm);
    }
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
    
    if (window.authFunctions && window.authFunctions.resetPassword) {
      window.authFunctions.resetPassword(email);
    }
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

  // auth.js가 로드되기를 기다린 후 UI 함수들을 설정
  const checkAuthFunctions = () => {
    if (window.authFunctions && window.authFunctions.setUIFunctions) {
      window.authFunctions.setUIFunctions({
        updateUserUI,
        showNotification,
        showLoading
      });
    } else {
      // auth.js가 아직 로드되지 않았다면 다시 시도
      setTimeout(checkAuthFunctions, 100);
    }
  };
  
  checkAuthFunctions();
});

// 전역 함수로 내보내기 (다른 스크립트에서 사용할 수 있도록)
window.uiFunctions = {
  showModal,
  hideModal,
  hideAllModals,
  showNotification,
  showLoading,
  updateUserUI,
  clearForm
};