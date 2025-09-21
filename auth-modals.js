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

// 경기 데이터 관리 변수들
let matchesData = [];
let currentMatchIndex = 0;
let isLoadingMatches = false;

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

// ===== 경기 데이터 관리 함수들 =====

// Firebase 초기화 후 경기 데이터 로드
async function initializeMatchData() {
    if (!window.db) {
        console.log('Firebase가 아직 초기화되지 않았습니다. 재시도 중...');
        setTimeout(initializeMatchData, 500);
        return;
    }
    
    try {
        await loadTodayMatches();
        setupMatchNavigation();
    } catch (error) {
        console.error('경기 데이터 초기화 실패:', error);
    }
}

// 오늘의 경기 데이터 로드
async function loadTodayMatches() {
    if (isLoadingMatches) return;
    
    isLoadingMatches = true;
    
    try {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        console.log('오늘 날짜:', todayString);
        
        // Firestore에서 오늘의 경기 조회
        const matchesCollection = window.firebase.collection(window.db, 'matches');
        const todayQuery = window.firebase.query(
            matchesCollection,
            window.firebase.where('date', '==', todayString)
        );
        
        const querySnapshot = await window.firebase.getDocs(todayQuery);
        
        matchesData = [];
        querySnapshot.forEach((doc) => {
            const matchData = doc.data();
            matchesData.push({
                id: doc.id,
                ...matchData
            });
        });
        
        // 시간순으로 정렬
        matchesData.sort((a, b) => {
            if (!a.time || !b.time) return 0;
            return a.time.localeCompare(b.time);
        });
        
        console.log('로드된 경기 데이터:', matchesData);
        
        // UI 업데이트
        updateMatchDisplay();
        
    } catch (error) {
        console.error('경기 데이터 로드 실패:', error);
        showNoMatchesMessage();
    } finally {
        isLoadingMatches = false;
    }
}

// 경기 표시 업데이트
function updateMatchDisplay() {
    const matchDisplay = document.getElementById('matchDisplay');
    const noMatches = document.getElementById('noMatches');
    const matchDate = document.getElementById('matchDate');
    const matchTeams = document.getElementById('matchTeams');
    const matchScore = document.getElementById('matchScore');
    const matchStatus = document.getElementById('matchStatus');
    const matchDetailsBtn = document.getElementById('matchDetailsBtn');
    const prevBtn = document.getElementById('prevMatch');
    const nextBtn = document.getElementById('nextMatch');
    
    if (!matchesData || matchesData.length === 0) {
        showNoMatchesMessage();
        return;
    }
    
    // 경기가 있을 때
    if (matchDisplay) matchDisplay.style.display = 'flex';
    if (noMatches) noMatches.style.display = 'none';
    
    // 현재 경기 데이터
    const currentMatch = matchesData[currentMatchIndex];
    
    if (!currentMatch) {
        showNoMatchesMessage();
        return;
    }
    
    // 날짜 및 시간 표시
    if (matchDate) {
        const dateText = currentMatch.date || '날짜 미정';
        const timeText = currentMatch.time ? ` ${currentMatch.time}` : '';
        matchDate.textContent = `${dateText}${timeText}`;
    }
    
    // 팀 이름 표시
    if (matchTeams) {
        const homeTeam = currentMatch.home_team || '팀1';
        const awayTeam = currentMatch.away_team || '팀2';
        matchTeams.textContent = `${homeTeam} VS ${awayTeam}`;
    }
    
    // 점수 표시 (경기 완료시)
    if (matchScore) {
        if (currentMatch.status === 'completed' && 
            currentMatch.home_score !== undefined && 
            currentMatch.away_score !== undefined) {
            matchScore.textContent = `${currentMatch.home_score} : ${currentMatch.away_score}`;
            matchScore.style.display = 'block';
        } else {
            matchScore.style.display = 'none';
        }
    }
    
    // 경기 상태 표시
    if (matchStatus) {
        let statusText = '예정';
        switch (currentMatch.status) {
            case 'scheduled':
                statusText = '예정';
                break;
            case 'live':
                statusText = '진행중';
                break;
            case 'completed':
                statusText = '완료';
                break;
            case 'cancelled':
                statusText = '취소';
                break;
            default:
                statusText = '예정';
        }
        matchStatus.textContent = statusText;
        
        // 상태에 따른 스타일링
        matchStatus.className = `match-status ${currentMatch.status || 'scheduled'}`;
    }
    
    // 상세보기 버튼 표시/숨기기
    if (matchDetailsBtn) {
        matchDetailsBtn.style.display = 'block';
        matchDetailsBtn.onclick = () => openMatchDetailsPanel(currentMatch);
    }
    
    // 네비게이션 버튼 상태 업데이트
    if (prevBtn) {
        prevBtn.disabled = currentMatchIndex === 0;
        prevBtn.style.opacity = currentMatchIndex === 0 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentMatchIndex >= matchesData.length - 1;
        nextBtn.style.opacity = currentMatchIndex >= matchesData.length - 1 ? '0.5' : '1';
    }
    
    console.log(`현재 표시중인 경기: ${currentMatchIndex + 1}/${matchesData.length}`);
}

// 경기가 없을 때 메시지 표시
function showNoMatchesMessage() {
    const matchDisplay = document.getElementById('matchDisplay');
    const noMatches = document.getElementById('noMatches');
    const matchDate = document.getElementById('matchDate');
    const matchTeams = document.getElementById('matchTeams');
    
    if (matchDisplay) matchDisplay.style.display = 'none';
    if (noMatches) noMatches.style.display = 'block';
    
    // 기본값으로 리셋
    if (matchDate) matchDate.textContent = '경기 없음';
    if (matchTeams) matchTeams.textContent = '-';
}

// 경기 네비게이션 설정
function setupMatchNavigation() {
    const prevBtn = document.getElementById('prevMatch');
    const nextBtn = document.getElementById('nextMatch');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentMatchIndex > 0) {
                currentMatchIndex--;
                updateMatchDisplay();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentMatchIndex < matchesData.length - 1) {
                currentMatchIndex++;
                updateMatchDisplay();
            }
        });
    }
    
    console.log('경기 네비게이션 설정 완료');
}

// 경기 상세 패널 열기 (통합된 버전)
function openMatchDetailsPanel(matchData) {
    if (!matchData) {
        matchData = matchesData[currentMatchIndex];
    }
    
    if (!matchData) {
        console.error('표시할 경기 데이터가 없습니다.');
        return;
    }
    
    console.log('경기 상세 패널 열기:', matchData);
    
    // 경기 상세 정보를 패널에 로드
    loadMatchDetailsInPanel(matchData);
    
    // 패널 열기
    openMatchPanel(matchData.id);
}

// 경기 상세 정보를 패널에 로드
function loadMatchDetailsInPanel(matchData) {
    const panelContent = document.getElementById('panelContent');
    const panelTitle = document.getElementById('panelTitle');
    
    if (panelTitle) {
        panelTitle.textContent = `${matchData.home_team} VS ${matchData.away_team}`;
    }
    
    if (panelContent) {
        const statusText = getMatchStatusText(matchData.status);
        const scoreSection = matchData.status === 'completed' ? 
            `<div class="match-final-score">
                <h3>최종 스코어</h3>
                <div class="score-display">
                    <span class="team-score">${matchData.home_team} ${matchData.home_score || 0}</span>
                    <span class="score-separator">:</span>
                    <span class="team-score">${matchData.away_score || 0} ${matchData.away_team}</span>
                </div>
            </div>` : '';
        
        panelContent.innerHTML = `
            <div class="match-details-content">
                <div class="match-header">
                    <div class="match-date-time">
                        <strong>날짜:</strong> ${matchData.date} ${matchData.time || ''}
                    </div>
                    <div class="match-status-badge ${matchData.status || 'scheduled'}">
                        ${statusText}
                    </div>
                </div>
                
                ${scoreSection}
                
                <div class="match-info-grid">
                    <div class="info-item">
                        <strong>경기장:</strong> ${matchData.venue || '미정'}
                    </div>
                    <div class="info-item">
                        <strong>조:</strong> ${matchData.group || '미정'}
                    </div>
                    ${matchData.referee ? `<div class="info-item"><strong>심판:</strong> ${matchData.referee}</div>` : ''}
                </div>
                
                ${matchData.description ? `
                    <div class="match-description">
                        <h4>경기 정보</h4>
                        <p>${matchData.description}</p>
                    </div>
                ` : ''}
                
                <div class="match-actions">
                    <button onclick="refreshMatchData('${matchData.id}')" class="action-btn">
                        정보 새로고침
                    </button>
                </div>
            </div>
        `;
    }
}

// 경기 상태 텍스트 변환
function getMatchStatusText(status) {
    switch (status) {
        case 'scheduled': return '예정';
        case 'live': return '진행중';
        case 'completed': return '완료';
        case 'cancelled': return '취소';
        default: return '예정';
    }
}

// 특정 경기 데이터 새로고침
async function refreshMatchData(matchId) {
    try {
        const matchDoc = await window.firebase.getDoc(
            window.firebase.doc(window.db, 'matches', matchId)
        );
        
        if (matchDoc.exists()) {
            const updatedMatch = { id: matchDoc.id, ...matchDoc.data() };
            
            // 기존 데이터 업데이트
            const index = matchesData.findIndex(match => match.id === matchId);
            if (index !== -1) {
                matchesData[index] = updatedMatch;
                
                // 현재 표시중인 경기라면 UI 업데이트
                if (index === currentMatchIndex) {
                    updateMatchDisplay();
                    loadMatchDetailsInPanel(updatedMatch);
                }
            }
            
            console.log('경기 데이터 새로고침 완료:', updatedMatch);
        }
    } catch (error) {
        console.error('경기 데이터 새로고침 실패:', error);
    }
}

// 실시간 경기 데이터 업데이트 리스너 설정
function setupMatchDataListener() {
    if (!window.db) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const matchesCollection = window.firebase.collection(window.db, 'matches');
        const todayQuery = window.firebase.query(
            matchesCollection,
            window.firebase.where('date', '==', today)
        );
        
        // 실시간 리스너 설정
        window.firebase.onSnapshot(todayQuery, (snapshot) => {
            console.log('경기 데이터 실시간 업데이트 감지');
            
            const updatedMatches = [];
            snapshot.forEach((doc) => {
                updatedMatches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // 시간순 정렬
            updatedMatches.sort((a, b) => {
                if (!a.time || !b.time) return 0;
                return a.time.localeCompare(b.time);
            });
            
            matchesData = updatedMatches;
            updateMatchDisplay();
        }, (error) => {
            console.error('실시간 리스너 오류:', error);
        });
    } catch (error) {
        console.error('실시간 리스너 설정 실패:', error);
    }
}

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
