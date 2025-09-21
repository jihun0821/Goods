// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyC_YES_I20XByZpXjCN2p1Vp5gueS4Op24",
    authDomain: "hsp-auth-22845.firebaseapp.com",
    projectId: "hsp-auth-22845",
    storageBucket: "hsp-auth-22845.firebasestorage.app",
    messagingSenderId: "1034282361573",
    appId: "1:1034282361573:web:a15b970a18ae7033552a0c",
    measurementId: "G-EQZ1QFGDZ2"
};

// Firebase 초기화 및 전역 변수 설정
let app, db, auth, storage;

// Firebase 초기화 함수
function initializeFirebase() {
    if (window.firebase && window.firebase.initializeApp) {
        app = window.firebase.initializeApp(firebaseConfig);
        db = window.firebase.getFirestore(app);
        auth = window.firebase.getAuth(app);
        storage = window.firebase.getStorage(app);
        
        // 전역 변수로 노출
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        
        console.log("Firebase 초기화 완료");
        return true;
    }
    return false;
}

// Firebase 초기화 대기
function waitForFirebaseInit() {
    return new Promise((resolve) => {
        const checkInit = () => {
            if (initializeFirebase()) {
                resolve();
            } else {
                setTimeout(checkInit, 100);
            }
        };
        checkInit();
    });
}

// DOM 요소들
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const profileModal = document.getElementById('profileModal');
const passwordResetModal = document.getElementById('passwordResetModal');
const profileEditModal = document.getElementById('profileEditModal');
const matchDetailsPanel = document.getElementById('matchDetailsPanel');
const overlay = document.getElementById('overlay');

// 현재 사용자 프로필 데이터
let currentUserProfile = null;
let isAdmin = false;

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

// ===== 인증 관련 함수들 =====

// 로그인 함수
async function handleLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
    }
    
    try {
        const userCredential = await window.firebase.signInWithEmailAndPassword(auth, email, password);
        console.log('로그인 성공:', userCredential.user.email);
        closeAllModals();
        showUserProfile();
    } catch (error) {
        console.error('로그인 실패:', error);
        alert('로그인에 실패했습니다: ' + error.message);
    }
}

// 회원가입 1단계 (이메일, 비밀번호 검증)
async function handleSignupNext() {
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // 이메일 검증
    if (!email.endsWith('@hanilgo.cnehs.kr')) {
        alert('한일고 이메일(@hanilgo.cnehs.kr)을 사용해주세요.');
        return;
    }
    
    // 비밀번호 검증
    if (password.length < 6) {
        alert('비밀번호는 6자 이상이어야 합니다.');
        return;
    }
    
    // 임시로 데이터 저장
    window.tempSignupData = { email, password };
    
    // 프로필 설정 모달로 이동
    openProfileModal();
}

// 회원가입 완료
async function handleSignupComplete() {
    const nicknameInput = document.getElementById('nickname');
    
    if (!nicknameInput) return;
    
    const nickname = nicknameInput.value.trim();
    
    if (!nickname) {
        alert('닉네임을 입력해주세요.');
        return;
    }
    
    if (nickname.length < 2 || nickname.length > 20) {
        alert('닉네임은 2자 이상 20자 이하로 입력해주세요.');
        return;
    }
    
    if (!window.tempSignupData) {
        alert('회원가입 정보가 없습니다. 다시 시도해주세요.');
        return;
    }
    
    try {
        // Firebase Auth 회원가입
        const userCredential = await window.firebase.createUserWithEmailAndPassword(
            auth, 
            window.tempSignupData.email, 
            window.tempSignupData.password
        );
        
        const user = userCredential.user;
        
        // 프로필 업데이트
        await window.firebase.updateProfile(user, {
            displayName: nickname
        });
        
        // Firestore에 프로필 저장
        await window.firebase.setDoc(window.firebase.doc(db, 'profiles', user.uid), {
            nickname: nickname,
            email: user.email,
            createdAt: new Date()
        });
        
        // 포인트 초기화
        await window.firebase.setDoc(window.firebase.doc(db, 'user_points', user.uid), {
            points: 0,
            uid: user.uid,
            createdAt: new Date()
        });
        
        console.log('회원가입 성공:', user.email);
        closeAllModals();
        showUserProfile();
        
        // 임시 데이터 삭제
        delete window.tempSignupData;
        
        alert('회원가입이 완료되었습니다!');
        
    } catch (error) {
        console.error('회원가입 실패:', error);
        alert('회원가입에 실패했습니다: ' + error.message);
    }
}

// 비밀번호 재설정 이메일 보내기
async function handlePasswordReset() {
    const emailInput = document.getElementById('resetEmail');
    
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('이메일을 입력해주세요.');
        return;
    }
    
    try {
        await window.firebase.sendPasswordResetEmail(auth, email);
        alert('비밀번호 재설정 이메일을 보냈습니다. 이메일을 확인해주세요.');
        closeAllModals();
    } catch (error) {
        console.error('비밀번호 재설정 실패:', error);
        alert('비밀번호 재설정에 실패했습니다: ' + error.message);
    }
}

// 프로필 저장
async function saveProfile() {
    const user = auth.currentUser;
    if (!user) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const newNicknameInput = document.getElementById('newNickname');
    const imageFileInput = document.getElementById('imageFileInput');
    
    if (!newNicknameInput) return;
    
    const newNickname = newNicknameInput.value.trim();
    const selectedFile = imageFileInput?.files[0];
    
    // 변경사항이 없으면 경고
    if (!newNickname && !selectedFile) {
        alert('변경할 닉네임을 입력하거나 새 프로필 사진을 선택해주세요.');
        return;
    }
    
    // 닉네임 길이 체크
    if (newNickname && (newNickname.length < 2 || newNickname.length > 20)) {
        alert('닉네임은 2자 이상 20자 이하로 입력해주세요.');
        return;
    }
    
    try {
        // 업로드 진행 표시
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) uploadProgress.style.display = 'block';
        
        let newAvatarUrl = null;
        
        // 이미지 업로드 처리
        if (selectedFile) {
            console.log('이미지 업로드 시작:', selectedFile.name);
            
            const imageRef = window.firebase.ref(storage, `profile_images/${user.uid}/${Date.now()}_${selectedFile.name}`);
            
            try {
                const uploadResult = await window.firebase.uploadBytes(imageRef, selectedFile);
                newAvatarUrl = await window.firebase.getDownloadURL(uploadResult.ref);
                console.log('이미지 업로드 성공:', newAvatarUrl);
            } catch (uploadError) {
                console.error('이미지 업로드 실패:', uploadError);
                alert('이미지 업로드에 실패했습니다.');
                return;
            }
        }
        
        // 업데이트할 데이터 준비
        const updateData = {};
        if (newNickname) updateData.nickname = newNickname;
        if (newAvatarUrl) updateData.avatar_url = newAvatarUrl;
        
        // Firestore 프로필 업데이트
        await window.firebase.setDoc(window.firebase.doc(db, 'profiles', user.uid), updateData, { merge: true });
        
        // Firebase Auth 프로필 업데이트
        const authUpdateData = {};
        if (newNickname) authUpdateData.displayName = newNickname;
        if (newAvatarUrl) authUpdateData.photoURL = newAvatarUrl;
        
        if (Object.keys(authUpdateData).length > 0) {
            await window.firebase.updateProfile(user, authUpdateData);
        }
        
        // 성공 메시지 표시
        const successMessage = document.getElementById('editSuccessMessage');
        if (successMessage) successMessage.style.display = 'block';
        
        // 프로필 새로고침
        await showUserProfile();
        
        console.log('프로필 저장 완료');
        
        // 1.5초 후 모달 닫기
        setTimeout(() => {
            closeAllModals();
        }, 1500);
        
    } catch (error) {
        console.error('프로필 저장 실패:', error);
        alert('프로필 저장에 실패했습니다.');
    } finally {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) uploadProgress.style.display = 'none';
    }
}

// 로그아웃
async function logout() {
    try {
        await window.firebase.signOut(auth);
        console.log('로그아웃 성공');
        currentUserProfile = null;
        updateUIForAuthState(false);
    } catch (error) {
        console.error('로그아웃 실패:', error);
    }
}

// ===== 사용자 프로필 관리 =====

// 사용자 프로필 표시
async function showUserProfile() {
    const user = auth.currentUser;
    
    if (user) {
        try {
            // Firestore에서 프로필 정보 가져오기
            const profileDocRef = window.firebase.doc(db, 'profiles', user.uid);
            const profileDoc = await window.firebase.getDoc(profileDocRef);
            
            let profileData = {
                email: user.email,
                nickname: user.displayName || user.email.split('@')[0],
                avatar_url: user.photoURL
            };
            
            if (profileDoc.exists()) {
                profileData = { ...profileData, ...profileDoc.data() };
            }
            
            // 포인트 정보 가져오기
            const pointsDocRef = window.firebase.doc(db, 'user_points', user.uid);
            const pointsDoc = await window.firebase.getDoc(pointsDocRef);
            profileData.points = pointsDoc.exists() ? pointsDoc.data().points || 0 : 0;
            
            currentUserProfile = profileData;
            updateUIForAuthState(true, profileData);
            
            console.log('프로필 로드 완료:', profileData);
            
        } catch (error) {
            console.error('프로필 로드 실패:', error);
            updateUIForAuthState(false);
        }
    } else {
        currentUserProfile = null;
        updateUIForAuthState(false);
    }
}

// UI 상태 업데이트
function updateUIForAuthState(isLoggedIn, profileData = null) {
    const loginBtn = document.querySelector('.login-btn');
    const profileCard = document.querySelector('.profile-card');
    
    if (isLoggedIn && profileData) {
        // 로그인 상태 - 로그인 버튼을 로그아웃 버튼으로 변경
        if (loginBtn) {
            loginBtn.textContent = '로그아웃';
            loginBtn.onclick = logout;
        }
        
        // 프로필 카드 업데이트
        if (profileCard) {
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.nickname || 'USER')}&background=27AE60&color=fff&size=80&bold=true`;
            const avatarUrl = profileData.avatar_url || defaultAvatar;
            
            profileCard.innerHTML = `
                <div class="profile-img" onclick="openProfileEditModal(currentUserProfile)" style="cursor: pointer; position: relative; transition: transform 0.3s ease;" title="프로필 편집하기">
                    <img src="${avatarUrl}" alt="프로필" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem;" class="edit-overlay">
                        편집
                    </div>
                </div>
                <div id="profileName">${profileData.nickname || '사용자'}</div>
                <div class="profile-stats">
                    <div class="points" id="userPoints">${profileData.points || 0}</div>
                    <div>포인트 순위: <span id="pointRank">-</span></div>
                    <div><span id="classRank">-</span>/<span id="totalRank">-</span></div>
                </div>
            `;
            
            // 프로필 이미지 호버 효과 추가
            const profileImg = profileCard.querySelector('.profile-img');
            const editOverlay = profileCard.querySelector('.edit-overlay');
            
            if (profileImg && editOverlay) {
                profileImg.addEventListener('mouseenter', () => {
                    profileImg.style.transform = 'scale(1.05)';
                    editOverlay.style.opacity = '1';
                });
                
                profileImg.addEventListener('mouseleave', () => {
                    profileImg.style.transform = 'scale(1)';
                    editOverlay.style.opacity = '0';
                });
            }
        }
        
    } else {
        // 로그아웃 상태
        if (loginBtn) {
            loginBtn.textContent = '로그인';
            loginBtn.onclick = openLoginModal;
        }
        
        // 프로필 카드 기본 상태로 복원
        if (profileCard) {
            profileCard.innerHTML = `
                <div class="profile-img"></div>
                <h4 id="profileName">게스트</h4>
                <div class="profile-stats">
                    <div class="points" id="userPoints">0</div>
                    <div>포인트 순위: <span id="pointRank">-</span></div>
                    <div><span id="classRank">-</span>/<span id="totalRank">-</span></div>
                </div>
            `;
        }
    }
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
    
    // 로그인 관련
    const doLoginBtn = document.getElementById('doLogin');
    if (doLoginBtn) doLoginBtn.addEventListener('click', handleLogin);
    
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
    if (openProfileModalBtn) openProfileModalBtn.addEventListener('click', handleSignupNext);
    
    const signupSaveProfileBtn = document.getElementById('signupSaveProfileBtn');
    if (signupSaveProfileBtn) signupSaveProfileBtn.addEventListener('click', handleSignupComplete);
    
    // 비밀번호 재설정
    const sendResetEmailBtn = document.getElementById('sendResetEmailBtn');
    if (sendResetEmailBtn) sendResetEmailBtn.addEventListener('click', handlePasswordReset);
    
    // 프로필 편집 관련
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    
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
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignupNext();
        });
    }
    
    console.log('모든 이벤트 리스너 설정 완료');
}

// ===== 인증 상태 감지 =====

function setupAuthListener() {
    window.firebase.onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('사용자 로그인됨:', user.email);
            await showUserProfile();
        } else {
            console.log('사용자 로그아웃됨');
            currentUserProfile = null;
            updateUIForAuthState(false);
        }
    });
}

// ===== 초기화 =====

async function initialize() {
    console.log('auth-modals.js 초기화 시작');
    
    try {
        // Firebase 초기화 대기
        await waitForFirebaseInit();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 인증 상태 감지 시작
        setupAuthListener();
        
        // 전역 함수 노출
        window.openLoginModal = openLoginModal;
        window.openSignupModal = openSignupModal;
        window.openProfileModal = openProfileModal;
        window.openPasswordResetModal = openPasswordResetModal;
        window.openProfileEditModal = openProfileEditModal;
        window.openMatchPanel = openMatchPanel;
        window.closeMatchPanel = closeMatchPanel;
        window.logout = logout;
        window.currentUserProfile = currentUserProfile;
        
        console.log('auth-modals.js 초기화 완료');
        
    } catch (error) {
        console.error('초기화 실패:', error);
    }
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
