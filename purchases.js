// purchases.js
// list.html에서 로드됩니다. window.firebase (모듈 임포트 결과)를 사용합니다.

// Firebase 설정 (기존값 유지)
const firebaseConfig = {
    apiKey: "AIzaSyC_YES_I20XByZpXjCN2p1Vp5gueS4Op24",
    authDomain: "hsp-auth-22845.firebaseapp.com",
    projectId: "hsp-auth-22845",
    storageBucket: "hsp-auth-22845.firebasestorage.app",
    messagingSenderId: "1034282361573",
    appId: "1:1034282361573:web:a15b970a18ae7033552a0c",
    measurementId: "G-EQZ1QFGDZ2"
};

let app, db, auth;
let currentUser = null;

// Firebase 초기화
function initializeFirebase() {
    if (window.firebase && window.firebase.initializeApp) {
        app = window.firebase.initializeApp(firebaseConfig);
        // 기존 코드와 호환되게 'goods' 파라미터 사용하던 부분을 그대로 유지
        db = window.firebase.getFirestore(app, 'goods');
        auth = window.firebase.getAuth(app);
        console.log("Firebase 초기화 완료 (purchases)");
        setupAuthListener();
        return true;
    }
    return false;
}

function waitForFirebaseInit() {
    const checkInit = () => {
        if (initializeFirebase()) return;
        setTimeout(checkInit, 100);
    };
    checkInit();
}

// 사이드바 토글 (list.html의 버튼과 연동)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// 로그아웃
async function logout() {
    try {
        await window.firebase.signOut(auth);
        console.log('로그아웃 성공');
        alert('로그아웃되었습니다.');
        location.href = 'index.html';
    } catch (error) {
        console.error('로그아웃 실패:', error);
    }
}

// UI 업데이트
function updateUI(user) {
    const loginButton = document.getElementById('loginButton');
    const userInfo = document.getElementById('userInfo');
    
    // Clear previous clickable element (if any)
    userInfo.innerHTML = '';
    userInfo.style.cursor = 'default';
    userInfo.onclick = null;

    if (user) {
        currentUser = user;
        loginButton.textContent = 'LOGOUT';
        loginButton.onclick = logout;

        const displayNameOrEmail = user.displayName || user.email;
        userInfo.innerHTML = `- <span id="userNickname" style="text-decoration: underline; color: #27AE60; cursor: pointer;">${escapeHtml(displayNameOrEmail)}</span>`;
        const nicknameSpan = document.getElementById('userNickname');
        if (nicknameSpan) {
            nicknameSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                // 기존 앱의 개인정보 모달 열기 함수가 있으면 호출, 없으면 이동
                if (typeof openPrivacyModal === 'function') openPrivacyModal();
            });
        }
    } else {
        currentUser = null;
        loginButton.textContent = 'LOGIN';
        loginButton.onclick = () => { if (typeof openLoginModal === 'function') openLoginModal(); else location.href='index.html'; };
    }
}

// 인증 상태 감지
function setupAuthListener() {
    window.firebase.onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('사용자 로그인됨:', user.email);
            updateUI(user);
            loadPurchases();
        } else {
            console.log('사용자 로그아웃됨');
            updateUI(null);
            // 로그인하지 않으면 리다이렉트 (기존 동작 유지)
            alert('로그인이 필요합니다.');
            location.href = 'index.html';
        }
    });
}

// 구매 목록 로드
async function loadPurchases() {
    console.log('loadPurchases 시작');
    if (!db || !currentUser) {
        console.error('db 또는 currentUser가 초기화되지 않음');
        return;
    }

    try {
        const purchasesQuery = window.firebase.query(
            window.firebase.collection(db, 'purchases'),
            window.firebase.where('buyerId', '==', currentUser.uid),
            window.firebase.orderBy('purchaseDate', 'desc')
        );

        const querySnapshot = await window.firebase.getDocs(purchasesQuery);

        console.log('데이터 가져오기 성공! 문서 수:', querySnapshot.size);

        const container = document.getElementById('purchasesContainer');
        container.innerHTML = '';

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 20px; padding: 40px;">구매한 상품이 없습니다.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const docId = docSnap.id;
            const purchase = docSnap.data();
            const card = createPurchaseCard(docId, purchase);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('구매 목록 로드 실패:', error);
        const container = document.getElementById('purchasesContainer');
        container.innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; font-size: 20px; padding: 40px; color: red;">
                구매 목록을 불러오는데 실패했습니다.<br>
                에러: ${escapeHtml(error.message || '알 수 없음')}
            </p>
        `;
    }
}

// 구매 카드 생성 (문서 ID 포함)
function createPurchaseCard(docId, purchase) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.docId = docId;

    const imageUrl = purchase.productImageUrl || 'https://via.placeholder.com/300?text=No+Image';
    const purchaseDate = purchase.purchaseDate?.toDate?.() || (purchase.purchaseDate instanceof Date ? purchase.purchaseDate : new Date());
    const formattedDate = purchaseDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let sizeHtml = '';
    if (purchase.selectedSize && String(purchase.selectedSize).trim() !== '') {
        sizeHtml = `<div class="info-box">선택 사이즈: ${escapeHtml(String(purchase.selectedSize))}</div>`;
    }

    card.innerHTML = `
        <button class="cancel-btn" title="구매 취소 (삭제)">×</button>
        <div class="title-box">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(purchase.productName)}" onerror="this.src='https://via.placeholder.com/300?text=Image+Error'">
        </div>
        <div class="info-box">${escapeHtml(String(purchase.productName))}</div>
        <div class="info-box">수량: ${Number(purchase.quantity)}개 / ${Number(purchase.totalPrice).toLocaleString()}원</div>
        ${sizeHtml}
        <div class="info-box">판매자: ${escapeHtml(String(purchase.sellerName || ''))}</div>
        <div class="description-box">구매일시: ${escapeHtml(formattedDate)}</div>
    `;

    const cancelBtn = card.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleCancelPurchase(docId, card);
    });

    return card;
}

// 구매 취소 처리: Firestore 문서 삭제
async function handleCancelPurchase(docId, cardElement) {
    if (!confirm('정말로 이 구매를 취소(삭제)하시겠습니까?')) return;

    // UI에서 일시적으로 숨기기/비활성화
    cardElement.style.opacity = '0.6';
    const btn = cardElement.querySelector('.cancel-btn');
    if (btn) btn.disabled = true;

    try {
        const docRef = window.firebase.doc(db, 'purchases', docId);
        await window.firebase.deleteDoc(docRef);

        // 삭제 성공: DOM에서 제거
        cardElement.remove();
        alert('구매가 취소되었습니다.');
    } catch (error) {
        console.error('구매 취소 실패:', error);
        // 복원
        cardElement.style.opacity = '1';
        if (btn) btn.disabled = false;
        alert('구매 취소에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
}

// 간단한 HTML 이스케이프
function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 초기화 시작
waitForFirebaseInit();