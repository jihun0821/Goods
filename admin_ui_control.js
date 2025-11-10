// admin_ui_control.js
// 관리자는 goods DB의 admins 컬렉션에서만 확인

async function isAdminUser(email) {
    let db;
    // window.db는 index.html에서 이미 생성 및 전역 할당되어 있음
    if (window.db) {
        db = window.db;
    } else if (window.firebase && window.firebase.getFirestore) {
        db = window.firebase.getFirestore();
        window.db = db;
    } else {
        console.error("Firestore DB 접근 불가 - Firebase 초기화 필요");
        return false;
    }
    // 점검용 로그: 어떤 이메일로 체크하는지 찍기
    console.log("[ADMIN CHECK] 체크할 이메일:", email);

    const adminDocRef = window.firebase.doc(db, "admins", email);
    console.log("[ADMIN CHECK] Firestore admins 컬렉션 문서ID:", adminDocRef.id);

    const adminDocSnap = await window.firebase.getDoc(adminDocRef);
    console.log("[ADMIN CHECK] Firestore admins 문서 존재 여부 (exists):", adminDocSnap.exists());

    return adminDocSnap.exists();
}

function setAdminVisibility(isAdmin) {
    const registerBtn = document.querySelector('.login-box[onclick="openProductModal()"]');
    if (registerBtn) {
        registerBtn.style.display = isAdmin ? "block" : "none";
    }
    const manageSection = Array.from(document.querySelectorAll('ul.option-list li'))
        .find(li => li.textContent.includes('관리 페이지'));
    if (manageSection) {
        manageSection.style.display = isAdmin ? "list-item" : "none";
    }
    // 추가 로그: 실제 무엇이 보이나
    console.log(`[ADMIN CHECK] setAdminVisibility: isAdmin = ${isAdmin}`);
}

async function adminUIAuthWatcher() {
    if (!window.firebase || !window.firebase.getAuth) return;
    const auth = window.firebase.getAuth();
    window.firebase.onAuthStateChanged(auth, async (user) => {
        if (user && user.email) {
            console.log("[ADMIN CHECK] 현재 로그인된 user.email:", user.email);
            const admin = await isAdminUser(user.email);
            setAdminVisibility(admin);
        } else {
            console.log("[ADMIN CHECK] 비로그인 상태, 관리자 권한 없음 처리");
            setAdminVisibility(false);
        }
    });
}

// DOMContentLoaded에서 Firebase, db가 초기화된 이후에만 adminUIAuthWatcher를 실행!
document.addEventListener('DOMContentLoaded', () => {
    setAdminVisibility(false);
    // Firebase가 window에 초기화됐는지 확실히 체크 후 실행!
    const tryAdminUIWatcher = () => {
        if (window.firebase && window.firebase.getAuth && window.db) {
            adminUIAuthWatcher();
        } else {
            setTimeout(tryAdminUIWatcher, 100); // 0.1초 후 다시
        }
    };
    tryAdminUIWatcher();
});
