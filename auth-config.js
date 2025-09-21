// auth-config.js - 설정, 유틸리티, 헬퍼 클래스들

// 설정 및 상수
require('dotenv').config();

const CONFIG = {
  EMAIL_DOMAIN: process.env.EMAIL_DOMAIN,
  NICKNAME_MIN_LENGTH: Number(process.env.NICKNAME_MIN_LENGTH),
  NICKNAME_MAX_LENGTH: Number(process.env.NICKNAME_MAX_LENGTH),
  AVATAR_BASE_URL: process.env.AVATAR_BASE_URL,
  FIREBASE_CONFIG: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  }
};

const ERROR_MESSAGES = {
  INVALID_EMAIL: '한일고 이메일(@hanilgo.cnehs.kr)만 가입할 수 있습니다.',
  NICKNAME_REQUIRED: '닉네임을 입력해주세요.',
  NICKNAME_LENGTH: '닉네임은 2자 이상 20자 이하로 입력해주세요.',
  EMAIL_PASSWORD_REQUIRED: '이메일과 비밀번호를 입력해주세요.',
  LOGIN_REQUIRED: '로그인이 필요합니다.',
  EMAIL_VERIFICATION_REQUIRED: '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
  TEMP_DATA_MISSING: '임시 사용자 데이터가 없습니다.',
  PROFILE_IMAGE_NOT_SUPPORTED: '현재 버전에서는 프로필 이미지 업로드가 지원되지 않습니다.',
  UNKNOWN_ERROR: '비밀번호가 잘못되었습니다.',
  EMAIL_NOT_VERIFIED_YET: '이메일 인증이 아직 완료되지 않았습니다.\n메일함에서 인증 링크를 클릭한 후 다시 시도해주세요.'
};

const LOADING_MESSAGES = {
  CREATING_ACCOUNT: '계정 생성 중...',
  SENDING_EMAIL: '이메일 전송 중...',
  LOGGING_IN: '로그인 중...',
  SAVING_PROFILE: '프로필 저장 중...',
  CHECKING_VERIFICATION: '이메일 인증 확인 중...'
};

// 에러 처리 클래스
class ErrorHandler {
  static handleAuthError(error) {
    const errorMessages = {
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
      'auth/invalid-email': '유효하지 않은 이메일 주소입니다.',
      'auth/user-not-found': '존재하지 않는 사용자입니다.',
      'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
      'auth/too-many-requests': '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
      'auth/network-request-failed': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'
    };
    
    return errorMessages[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  static logAndNotify(error, context) {
    console.error(`${context} 오류:`, error);
    const message = this.handleAuthError(error);
    alert(message);
  }
}

// 유틸리티 클래스
class Utils {
  static closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  static showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
  }

  static clearForm(formId) {
    const form = document.getElementById(formId);
    if (form && typeof form.reset === 'function') {
      // form 요소인 경우
      form.reset();
    } else if (form) {
      // form 요소가 아니지만 요소가 존재하는 경우, 내부의 input들을 수동으로 초기화
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });
    }
    // form이 null이거나 존재하지 않는 경우는 조용히 무시
  }

  static closeAllModals() {
    const modals = ['loginModal', 'signupModal', 'profileModal', 'passwordResetModal'];
    modals.forEach(modalId => this.closeModal(modalId));
  }

  static generateAvatarUrl(nickname, size = 80) {
    return `${CONFIG.AVATAR_BASE_URL}?name=${encodeURIComponent(nickname)}&background=667eea&color=fff&size=${size}&bold=true`;
  }
}

// 검증 클래스
class Validator {
  static isHanilEmail(email) {
    return email.endsWith(CONFIG.EMAIL_DOMAIN);
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@hanilgo\.cnehs\.kr$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password.length >= 6;
  }

  static validateNickname(nickname) {
    return nickname.length >= CONFIG.NICKNAME_MIN_LENGTH && 
           nickname.length <= CONFIG.NICKNAME_MAX_LENGTH;
  }
}

// 로딩 상태 관리 클래스
class LoadingManager {
  static showLoading(element, text) {
    if (element) {
      element.disabled = true;
      element.dataset.originalText = element.textContent;
      element.textContent = text;
    }
  }

  static hideLoading(element) {
    if (element) {
      element.disabled = false;
      element.textContent = element.dataset.originalText || element.textContent;
    }
  }
}

// 이벤트 관리 클래스
class EventManager {
  constructor() {
    this.listeners = [];
  }

  addListener(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
      this.listeners.push({ element, event, handler });
    }
  }

  removeAllListeners() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }
}

// Firebase 초기화 관리 클래스
class FirebaseManager {
  constructor() {
    this.firebase = null;
    this.app = null;
    this.auth = null;
    this.db = null;
  }

  async initialize() {
    try {
      // Firebase SDK가 로드될 때까지 대기
      let attempts = 0;
      const maxAttempts = 50;
      
      while (!window.firebase && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.firebase) {
        throw new Error('Firebase SDK가 로드되지 않았습니다.');
      }

      const { 
        initializeApp, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
        signOut, onAuthStateChanged, updateProfile, sendEmailVerification,
        getFirestore, doc, setDoc, getDoc, sendPasswordResetEmail
      } = window.firebase;

      this.firebase = {
        initializeApp, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
        signOut, onAuthStateChanged, updateProfile, sendEmailVerification,
        getFirestore, doc, setDoc, getDoc, sendPasswordResetEmail
      };

      // Firebase 앱이 이미 초기화되어 있는지 확인
      try {
        this.app = window.firebase.getApp();
        console.log('기존 Firebase 앱 사용');
      } catch (error) {
        // 앱이 없으면 새로 초기화
        this.app = this.firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        console.log('새 Firebase 앱 초기화');
      }

      this.auth = this.firebase.getAuth(this.app);
      this.db = this.firebase.getFirestore(this.app);

      console.log('Firebase 초기화 완료');
      return true;
    } catch (error) {
      console.error('Firebase 초기화 실패:', error);
      throw new Error('Firebase 초기화에 실패했습니다.');
    }
  }

  getFirebase() {
    return this.firebase;
  }

  getAuth() {
    return this.auth;
  }

  getDb() {
    return this.db;
  }

  isInitialized() {
    return this.firebase && this.auth && this.db;
  }
}

// UI 관리 헬퍼 클래스
class UIHelper {
  /**
   * 프로필 모달 UI를 초기 상태로 리셋
   */
  static resetProfileModalUI() {
    const saveBtn = document.getElementById('signupSaveProfileBtn');
    const checkVerificationBtn = document.getElementById('checkVerificationBtn');
    
    if (saveBtn) {
      saveBtn.style.display = 'inline-block';
      saveBtn.disabled = false;
    }
    
    if (checkVerificationBtn) {
      checkVerificationBtn.style.display = 'none';
    }

    // 이메일 인증 안내 메시지 제거
    const guideMessage = document.querySelector('.email-verification-guide');
    if (guideMessage) {
      guideMessage.remove();
    }
  }

  /**
   * 이메일 인증 대기 상태 UI 업데이트
   */
  static updateUIForEmailVerification(signupEmail) {
    const saveBtn = document.getElementById('signupSaveProfileBtn');
    const checkVerificationBtn = document.getElementById('checkVerificationBtn');
    const buttonContainer = saveBtn?.parentElement;
    
    if (saveBtn) {
      saveBtn.style.display = 'none';
    }
    
    if (checkVerificationBtn) {
      checkVerificationBtn.style.display = 'inline-block';
      checkVerificationBtn.disabled = false;
      checkVerificationBtn.textContent = '이메일 인증 확인하기';
      
      if (buttonContainer) {
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.gap = '10px';
      }
    }

    // 더 상세한 안내 메시지 표시
    const modalContent = document.querySelector('#profileModal .auth-modal-content');
    if (modalContent) {
      let guideMessage = modalContent.querySelector('.email-verification-guide');
      if (!guideMessage) {
        guideMessage = document.createElement('div');
        guideMessage.className = 'email-verification-guide';
        guideMessage.style.cssText = `
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
          border: 1px solid #2196f3;
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
          font-size: 14px;
          color: #1976d2;
          line-height: 1.5;
        `;
        guideMessage.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 18px; margin-right: 8px;">📧</span>
            <strong style="font-size: 16px;">이메일 인증이 필요합니다</strong>
          </div>
          <div style="font-size: 13px; color: #424242;">
            • <strong>${signupEmail}</strong>로 인증 메일을 발송했습니다<br>
            • 메일함(스팸함 포함)에서 인증 링크를 클릭해주세요<br>
            • 인증 완료 후 아래 버튼을 클릭하시면 회원가입이 완료됩니다<br>
          </div>
        `;
        
        const form = modalContent.querySelector('.auth-form');
        if (form) {
          form.insertBefore(guideMessage, form.firstChild);
        }
      }
    }
  }

  /**
   * 프로필 이미지 미리보기 설정
   */
  static setupProfileImagePreview() {
    const avatarInput = document.getElementById('avatar');
    const fileUploadWrapper = document.querySelector('.file-upload-wrapper');
    
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          alert(ERROR_MESSAGES.PROFILE_IMAGE_NOT_SUPPORTED);
          e.target.value = '';
        }
      });
    }
    
    if (fileUploadWrapper) {
      fileUploadWrapper.style.display = 'none';
    }
  }

  /**
   * 폼 정리 및 초기화
   */
  static cleanupForms() {
    // 폼 초기화
    const forms = ['signupForm', 'profileForm'];
    forms.forEach(formId => {
      const form = document.getElementById(formId);
      if (form) form.reset();
    });

    // 회원가입 관련 입력 필드 초기화
    const inputs = ['signupEmail', 'signupPassword', 'nickname'];
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) input.value = '';
    });
  }
}

// 전역으로 클래스들 노출
window.AuthConfig = {
  CONFIG,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  ErrorHandler,
  Utils,
  Validator,
  LoadingManager,
  EventManager,
  FirebaseManager,
  UIHelper
};
