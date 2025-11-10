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
    const adminDocRef = window.firebase.doc(db, "admins", email);
    const adminDocSnap = await window.firebase.getDoc(adminDocRef);
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
}

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

document.addEventListener('DOMContentLoaded', () => {
    setAdminVisibility(false);
    adminUIAuthWatcher();
});
