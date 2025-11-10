// admin_ui_control.js
// 관리자는 goods DB의 admins 컬렉션에서만 확인

// (1) 관리자 권한 판단 함수
async function isAdminUser(email) {
    let db;
    if (window.db) {
        db = window.db;
        console.log("[ADMIN CHECK] window.db 인스턴스에서 db 확보.");
    } else if (window.firebase && window.firebase.getFirestore) {
        db = window.firebase.getFirestore();
        window.db = db;
        console.log("[ADMIN CHECK] window.firebase.getFirestore()로 db 확보.");
    } else {
        console.error("[ADMIN CHECK] Firestore DB 접근 불가 - Firebase 초기화 필요");
        return false;
    }

    // DB 인스턴스 정보 확인
    console.log("[ADMIN CHECK] DB 인스턴스 app name:", db.app.name);
    if (db.app.options) {
        console.log("[ADMIN CHECK] DB projectId:", db.app.options.projectId);
    }

    console.log("[ADMIN CHECK] 체크할 이메일:", `"${email}"`, "(length:", email.length, ")");
    const adminDocRef = window.firebase.doc(db, "admins", email);
    console.log("[ADMIN CHECK] Firestore admins 컬렉션 문서ID:", `"${adminDocRef.id}"`, "(length:", adminDocRef.id.length, ")");

    try {
        const adminsCollection = window.firebase.collection(db, "admins");
        const allAdminDocs = await window.firebase.getDocs(adminsCollection);
        let found = false;
        allAdminDocs.forEach((doc) => {
            console.log(
                "[ADMIN CHECK][COLLECTION LIST] 문서ID:",
                `"${doc.id}"`,
                "(length:", doc.id.length, ")"
            );
            if (doc.id === email) found = true;
        });
        if (!found) {
            console.warn("[ADMIN CHECK][COLLECTION LIST] admins 컬렉션에 해당 이메일과 완벽히 일치하는 문서ID가 없습니다.");
        } else {
            console.log("[ADMIN CHECK][COLLECTION LIST] 이메일과 일치하는 문서ID가 admins 컬렉션에 존재합니다!");
        }
    } catch (err) {
        console.error("[ADMIN CHECK] admins 컬렉션 전체 로드 실패:", err);
    }

    let adminDocSnap;
    try {
        adminDocSnap = await window.firebase.getDoc(adminDocRef);
        console.log("[ADMIN CHECK] Firestore admins 문서 존재 여부 (exists):", adminDocSnap.exists());
        if (!adminDocSnap.exists()) {
            console.warn(`[ADMIN CHECK][WARNING] Firestore admins 문서를 찾지 못함! 이메일/문서ID 완전일치 필요,
              email: "${email}"
              docId: "${adminDocRef.id}"
              길이(이메일): ${email.length}, 길이(docId): ${adminDocRef.id.length}
              값이 완전히 같은지, 공백/오타 여부 반드시 재확인!`);
        }
    } catch (e) {
        console.error("[ADMIN CHECK] Firestore getDoc 에러:", e);
        return false;
    }

    return adminDocSnap.exists();
}

// (2) 관리자 관련 영역 UI 노출
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
    console.log(`[ADMIN CHECK] setAdminVisibility: isAdmin = ${isAdmin}`);
}

// (3) 인증 상태 변화시 관리자 체크 + 로그
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

// (4) 수동 초기화 외부에서 직접 해주기! (자동실행 없음)
window.adminUIAuthWatcher = adminUIAuthWatcher;
window.setAdminVisibility = setAdminVisibility;
