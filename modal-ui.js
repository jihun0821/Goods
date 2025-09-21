// 모달 및 UI 관련 기능
// modal-ui.js

// DOM 요소들
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const profileModal = document.getElementById('profileModal');
const passwordResetModal = document.getElementById('passwordResetModal');
const profileEditModal = document.getElementById('profileEditModal');
const matchDetailsPanel = document.getElementById('matchDetailsPanel');
const overlay = document.getElementById('overlay');

// ===== 모달 관리 함수들 =====

// 모든 모달 닫기
function closeAllModals() {
    [loginModal, signupModal, profileModal, passwordResetModal, profileEditModal].forEach(modal => {
        if (modal) modal.style.display = 'none';
    });
}

// 로그인 모달 열기
function openLoginModal() {
    closeAllModals();
    if (loginModal) loginModal.style.display = 'flex';
}

// 회원가입 모달 열기
function openSignupModal() {
    closeAllModals();
    if (signupModal) signupModal.style.display = 'flex';
}

// 프로필 설정 모달 열기
function openProfileModal() {
    closeAllModals();
    if (profileModal) profileModal.style.display = 'flex';
}

// 비밀번호 재설정 모달 열기
function openPasswordResetModal() {
    closeAllModals();
    if (passwordResetModal) passwordResetModal.style.display = 'flex';
}

// 프로필 편집 모달 열기
function openProfileEditModal(profileData) {
    closeAllModals();
    
    if (!profileEditModal) {
        console.error("프로필 편집 모달을 찾을 수 없습니다!");
        return;
    }
    
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.nickname || 'USER')}&background=27AE60&color=fff&size=100&bold=true`;
    
    // 현재 정보 표시
    const currentProfileImage = document.getElementById('currentProfileImage');
    const currentNickname = document.getElementById('currentNickname');
    const currentEmail = document.getElementById('currentEmail');
    const newNicknameInput = document.getElementById('newNickname');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageFileInput = document.getElementById('imageFileInput');
    const editSuccessMessage = document.getElementById('editSuccessMessage');
    
    if (currentProfileImage) {
        currentProfileImage.src = profileData.avatar_url || defaultAvatar;
    }
    
    if (currentNickname) {
        currentNickname.textContent = profileData.nickname || '사용자';
    }
    
    if (currentEmail) {
        currentEmail.textContent = profileData.email || '';
    }
    
    if (newNicknameInput) {
        newNicknameInput.value = '';
    }
    
    if (imagePreviewContainer) {
        imagePreviewContainer.style.display = 'none';
    }
    
    if (imageFileInput) {
        imageFileInput.value = '';
    }
    
    if (editSuccessMessage) {
        editSuccessMessage.style.display = 'none';
    }
    
    profileEditModal.style.display = 'flex';
    console.log("프로필 편집 모달이 열렸습니다.");
}

// ===== 경기 상세 패널 관리 =====

// 경기 상세 패널 열기
function openMatchPanel(matchId) {
    if (matchDetailsPanel && overlay) {
        loadMatchDetails(matchId);
        matchDetailsPanel.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// 경기 상세 패널 닫기
function closeMatchPanel() {
    if (matchDetailsPanel && overlay) {
        matchDetailsPanel.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 경기 상세 정보 로드 (기본 구조만)
function loadMatchDetails(matchId) {
    const panelContent = document.getElementById('panelContent');
    const panelTitle = document.getElementById('panelTitle');
    
    if (panelTitle) {
        panelTitle.textContent = '경기 상세 정보';
    }
    
    if (panelContent) {
        panelContent.innerHTML = `
            <div class="loading">
                <p>경기 정보를 불러오는 중...</p>
            </div>
        `;
    }
    
    console.log(`경기 ID ${matchId}의 상세 정보를 로드합니다.`);
}

// ===== 이벤트 리스너 설정 =====

function setupEventListeners() {
    // 모달 닫기 버튼들
    const closeButtons = document.querySelectorAll('.auth-modal-close, .profile-edit-modal-close, .close-panel');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // 취소 버튼들
    const cancelButtons = document.querySelectorAll('#cancelEditBtn');
    cancelButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // 패널 닫기
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeMatchPanel();
                closeAllModals();
            }
        });
    }
    
    // 경기 정보 클릭 이벤트 리스너 추가
    const matchInfo = document.querySelector('.match-info');
    if (matchInfo) {
        matchInfo.addEventListener('click', () => {
            // 현재 표시된 경기의 ID를 생성하거나 가져오기
            const matchDate = document.querySelector('.match-date')?.textContent || '';
            const matchTeams = document.querySelector('.match-teams')?.textContent || '';
            
            // 간단한 매치 ID 생성 (날짜와 팀 정보 기반)
            const matchId = `${matchDate}-${matchTeams.replace(/\s/g, '')}`;
            
            console.log(`경기 정보 클릭됨: ${matchId}`);
            openMatchPanel(matchId);
        });
        
        // 마우스 호버 효과를 위한 스타일 추가
        matchInfo.style.cursor = 'pointer';
    }
    
    // 로그인 관련
    const doLoginBtn = document.getElementById('doLogin');
    if (doLoginBtn) doLoginBtn.addEventListener('click', window.handleLogin);
    
    const openSignupLink = document.getElementById('openSignupLink');
    if (openSignupLink) openSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        openSignupModal();
    });
    
    const backToLoginLink = document.getElementById('backToLoginLink');
    if (backToLoginLink) backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        openLoginModal();
    });
    
    const openPasswordResetLink = document.getElementById('openPasswordResetLink');
    if (openPasswordResetLink) openPasswordResetLink.addEventListener('click', (e) => {
        e.preventDefault();
        openPasswordResetModal();
    });
    
    const backToLoginFromReset = document.getElementById('backToLoginFromReset');
    if (backToLoginFromReset) backToLoginFromReset.addEventListener('click', (e) => {
        e.preventDefault();
        openLoginModal();
    });
    
    // 회원가입 관련
    const openProfileModalBtn = document.getElementById('openProfileModalBtn');
    if (openProfileModalBtn) openProfileModalBtn.addEventListener('click', window.handleSignupNext);
    
    const signupSaveProfileBtn = document.getElementById('signupSaveProfileBtn');
    if (signupSaveProfileBtn) signupSaveProfileBtn.addEventListener('click', window.handleSignupComplete);
    
    // 비밀번호 재설정
    const sendResetEmailBtn = document.getElementById('sendResetEmailBtn');
    if (sendResetEmailBtn) sendResetEmailBtn.addEventListener('click', window.handlePasswordReset);
    
    // 프로필 편집 관련
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', window.saveProfile);
    
    const changeImageBtn = document.getElementById('changeImageBtn');
    const imageFileInput = document.getElementById('imageFileInput');
    if (changeImageBtn && imageFileInput) {
        changeImageBtn.addEventListener('click', () => imageFileInput.click());
    }
    
    // 이미지 미리보기
    if (imageFileInput) {
        imageFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 파일 크기 체크 (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('파일 크기가 너무 큽니다. 5MB 이하의 이미지를 선택해주세요.');
                    return;
                }
                
                // 파일 타입 체크
                if (!file.type.startsWith('image/')) {
                    alert('이미지 파일만 업로드할 수 있습니다.');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imagePreview = document.getElementById('imagePreview');
                    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
                    
                    if (imagePreview && imagePreviewContainer) {
                        imagePreview.src = e.target.result;
                        imagePreviewContainer.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // 이미지 취소 버튼
    const cancelImageBtn = document.getElementById('cancelImageBtn');
    if (cancelImageBtn && imageFileInput) {
        cancelImageBtn.addEventListener('click', () => {
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
            imageFileInput.value = '';
        });
    }
    
    // Enter 키로 로그인/회원가입
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.handleLogin();
        });
    }
    
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.handleSignupNext();
        });
    }
    
    console.log('모든 이벤트 리스너 설정 완료');
}

// ===== 초기화 =====

async function initializeUI() {
    console.log('modal-ui.js 초기화 시작');
    
    try {
        // Firebase 초기화 대기 (firebase-auth.js에서 정의된 함수 사용)
        await window.waitForFirebaseInit();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 인증 상태 감지 시작 (firebase-auth.js에서 정의된 함수 사용)
        window.setupAuthListener();
        
        // 전역 함수 노출 (UI 관련)
        window.openLoginModal = openLoginModal;
        window.openSignupModal = openSignupModal;
        window.openProfileModal = openProfileModal;
        window.openPasswordResetModal = openPasswordResetModal;
        window.openProfileEditModal = openProfileEditModal;
        window.openMatchPanel = openMatchPanel;
        window.closeMatchPanel = closeMatchPanel;
        window.closeAllModals = closeAllModals;
        
        console.log('modal-ui.js 초기화 완료');
        
    } catch (error) {
        console.error('UI 초기화 실패:', error);
    }
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}
