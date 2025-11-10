// admin_ui_control.js
// 관리자 권한을 확인하고 관리자에게만 UI 요소(제품 등록/관리 페이지)를 노출

// 1. 관리자 확인 함수 (email 기반)
async function isAdminUser(email) {
    // Firebase가 window에 선언되어 있다고 가정 (index.html head 스크립트 참고)
    if (!window.firebase) {
        console.error("Firebase not initialized!");
        return false;
    }
    // Firestore 인스턴스 가져오기 (최초 한 번만 획득)
    window.db = window.db || window.firebase.getFirestore(window.firebase.initializeApp({}));
    const adminDocRef = window.firebase.doc(window.db, "admins", email);
    const adminDocSnap = await window.firebase.getDoc(adminDocRef);
    return adminDocSnap.exists();
}

// 2. UI 요소를 숨기거나 보이게 하는 함수
function setAdminVisibility(isAdmin) {
    // 제품 등록 버튼
    const registerBtn = document.querySelector('.login-box[onclick="openProductModal()"]');
    if (registerBtn) {
        registerBtn.style.display = isAdmin ? "block" : "none";
    }
    // 관리 페이지 메뉴 (ul 내 li)
    const manageSection = Array.from(document.querySelectorAll('ul.option-list li'))
        .find(li => li.textContent.includes('관리 페이지'));
    if (manageSection) {
        manageSection.style.display = isAdmin ? "list-item" : "none";
    }
}

// 3. 인증 상태 변화 시 관리자 체크 후 UI 업데이트
async function adminUIAuthWatcher() {
    if (!window.firebase || !window.firebase.getAuth) return;
    const auth = window.firebase.getAuth();

    window.firebase.onAuthStateChanged(auth, async (user) => {
        if (user && user.email) {
            const admin = await isAdminUser(user.email);
            setAdminVisibility(admin);
        } else {
            setAdminVisibility(false);
        }
    });
}

// 4. DOMContentLoaded에서 실행
document.addEventListener('DOMContentLoaded', () => {
    // 최초에는 숨김(로그인 상태 확인 전에 관리자 노출 방지)
    setAdminVisibility(false);
    adminUIAuthWatcher();
});