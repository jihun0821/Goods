async function isAdminUser(email) {
    let db;
    if (window.db) {
        db = window.db;
    } else if (window.firebase && window.firebase.getFirestore) {
        db = window.firebase.getFirestore();
        window.db = db;
    } else {
        console.error("[ADMIN CHECK] Firestore DB 접근 불가 - Firebase 초기화 필요");
        return false;
    }

    console.log("[ADMIN CHECK] isAdminUser() 실행, email:", email);

    // ... (컬렉션 전체 조회 등 생략)
    return false;
}

async function adminUIAuthWatcher() {
    console.log("[ADMIN CHECK] adminUIAuthWatcher 실행 시작");
    if (!window.firebase || !window.firebase.getAuth) {
        console.log("[ADMIN CHECK] window.firebase 또는 getAuth 없음! (초기화 대기)");
        return;
    }
    const auth = window.firebase.getAuth();
    window.firebase.onAuthStateChanged(auth, async (user) => {
        console.log("[ADMIN CHECK] onAuthStateChanged 콜백 호출됨:", user);
        if (user && user.email) {
            console.log("[ADMIN CHECK] 현재 로그인된 user.email:", `"${user.email}"`, "(length:", user.email.length, ")");
            const admin = await isAdminUser(user.email);
            setAdminVisibility(admin);
        } else {
            console.log("[ADMIN CHECK] 비로그인 상태 또는 user.email 없음. 관리자 권한 없음 처리");
            setAdminVisibility(false);
        }
    });
}
