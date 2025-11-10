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

let app, db, auth, storage;
let currentUser = null;
let selectedImage = null;
let currentProductDetail = null;

// Firebase 초기화 (goods 데이터베이스 사용)
function initializeFirebase() {
    if (window.firebase && window.firebase.initializeApp) {
        app = window.firebase.initializeApp(firebaseConfig);
        
        // goods 데이터베이스를 명시적으로 지정
        db = window.firebase.getFirestore(app, 'goods');
        
        auth = window.firebase.getAuth(app);
        storage = window.firebase.getStorage(app);
        console.log("Firebase 초기화 완료 (goods 데이터베이스)");
        setupAuthListener();
        return true;
    }
    return false;
}

// Firebase 초기화 대기
function waitForFirebaseInit() {
    const checkInit = () => {
        if (initializeFirebase()) {
            return;
        }
        setTimeout(checkInit, 100);
    };
    checkInit();
}

// 사이드바 토글
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// 모든 모달 닫기
function closeAllModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('signupModal').style.display = 'none';
    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('passwordResetModal').style.display = 'none';
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('detailModal').style.display = 'none';
    document.getElementById('privacyModal').style.display = 'none';
}

// 로그인 모달 열기
function openLoginModal() {
    closeAllModals();
    document.getElementById('loginModal').style.display = 'flex';
}

// 회원가입 모달 열기
function openSignupModal() {
    closeAllModals();
    document.getElementById('signupModal').style.display = 'flex';
}

// 프로필 설정 모달 열기
function openProfileModal() {
    closeAllModals();
    document.getElementById('profileModal').style.display = 'flex';
}

// 비밀번호 재설정 모달 열기
function openPasswordResetModal() {
    closeAllModals();
    document.getElementById('passwordResetModal').style.display = 'flex';
}

// 제품 등록 모달 열기
function openProductModal() {
    if (!currentUser) {
        alert('제품을 등록하려면 로그인이 필요합니다.');
        openLoginModal();
        return;
    }
    closeAllModals();
    document.getElementById('productModal').style.display = 'flex';
    selectedImage = null;
    document.getElementById('imagePreview').innerHTML = '';

    // 초기화: 사이즈 설정 UI 초기화
    const hasSize = document.getElementById('productHasSize');
    const sizesInput = document.getElementById('productSizes');
    if (hasSize) hasSize.checked = false;
    if (sizesInput) {
        sizesInput.value = '';
        sizesInput.style.display = 'none';
    }
}

// 개인정보 입력 모달 열기 및 기존 값 불러오기
async function openPrivacyModal() {
    if (!currentUser) {
        alert('개인정보를 입력하려면 로그인이 필요합니다.');
        openLoginModal();
        return;
    }

    closeAllModals();
    document.getElementById('privacyModal').style.display = 'flex';

    // 초기화
    document.getElementById('privacyGrade').value = '';
    document.getElementById('privacyClass').value = '';
    document.getElementById('privacyNumber').value = '';
    document.getElementById('privacyName').value = '';

    try {
        const docRef = window.firebase.doc(db, 'privacy', currentUser.uid);
        const docSnap = await window.firebase.getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.grade) document.getElementById('privacyGrade').value = data.grade;
            if (data.class) document.getElementById('privacyClass').value = data.class;
            if (data.number) document.getElementById('privacyNumber').value = data.number;
            if (data.name) document.getElementById('privacyName').value = data.name;
        } else {
            // no existing privacy doc
            console.log('No privacy data for user yet.');
        }
    } catch (error) {
        console.error('privacy 데이터 불러오기 실패:', error);
    }
}

// 제품 상세 모달 열기
function openDetailModal(product) {
    currentProductDetail = product;
    
    document.getElementById('detailProductName').textContent = product.name;
    document.getElementById('detailProductImage').src = product.imageUrl || 'https://via.placeholder.com/400?text=No+Image';
    document.getElementById('detailProductPrice').textContent = product.price.toLocaleString() + '원';
    document.getElementById('detailProductDescription').textContent = product.description;
    document.getElementById('detailSellerName').textContent = product.sellerName || '익명';
    document.getElementById('purchaseQuantity').value = '1';
    
    // 사이즈 선택 UI 처리: 기존에 생성한 wrapper가 있으면 제거하고, 사이즈가 있으면 새로 추가
    const purchaseSection = document.querySelector('#detailModal .purchase-section');
    const existingWrapper = document.getElementById('purchaseSizeWrapper');
    if (existingWrapper) existingWrapper.remove();

    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        const wrapper = document.createElement('div');
        wrapper.id = 'purchaseSizeWrapper';
        wrapper.className = 'select-group';
        const optionsHtml = product.sizes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        wrapper.innerHTML = `<label>사이즈</label><select id="purchaseSize" class="privacy-select">${optionsHtml}</select>`;
        // insert before quantity selector so size appears above quantity
        const qtySelector = purchaseSection.querySelector('.quantity-selector');
        purchaseSection.insertBefore(wrapper, qtySelector);
    }

    closeAllModals();
    document.getElementById('detailModal').style.display = 'flex';
}

// 수량 증가
function increaseQuantity() {
    const input = document.getElementById('purchaseQuantity');
    const currentValue = parseInt(input.value);
    if (currentValue < 99) {
        input.value = currentValue + 1;
    }
}

// 수량 감소
function decreaseQuantity() {
    const input = document.getElementById('purchaseQuantity');
    const currentValue = parseInt(input.value);
    if (currentValue > 1) {
        input.value = currentValue - 1;
    }
}

// 구매 처리
async function handlePurchase() {
    if (!currentUser) {
        alert('구매하려면 로그인이 필요합니다.');
        closeAllModals();
        openLoginModal();
        return;
    }
    
    if (!currentProductDetail) {
        alert('제품 정보를 찾을 수 없습니다.');
        return;
    }
    
    const quantity = parseInt(document.getElementById('purchaseQuantity').value);
    
    if (quantity < 1) {
        alert('구매 수량을 확인해주세요.');
        return;
    }

    // 선택된 사이즈가 있으면 가져오기
    const sizeSelect = document.getElementById('purchaseSize');
    const selectedSize = sizeSelect ? sizeSelect.value : null;
    
    try {
        // purchases 컬렉션에 구매 정보 저장 (사이즈 포함)
        await window.firebase.addDoc(window.firebase.collection(db, 'purchases'), {
            productName: currentProductDetail.name,
            productPrice: currentProductDetail.price,
            quantity: quantity,
            totalPrice: currentProductDetail.price * quantity,
            buyerName: currentUser.displayName || currentUser.email,
            buyerId: currentUser.uid,
            sellerName: currentProductDetail.sellerName,
            sellerId: currentProductDetail.sellerId,
            productImageUrl: currentProductDetail.imageUrl,
            selectedSize: selectedSize || '',
            purchaseDate: new Date(),
            createdAt: new Date()
        });
        
        let msg = `구매가 완료되었습니다!\n제품: ${currentProductDetail.name}\n수량: ${quantity}개\n총 금액: ${(currentProductDetail.price * quantity).toLocaleString()}원`;
        if (selectedSize) msg += `\n선택 사이즈: ${selectedSize}`;
        alert(msg);
        closeAllModals();
        
    } catch (error) {
        console.error('구매 처리 실패:', error);
        alert('구매 처리에 실패했습니다: ' + error.message);
    }
}

// 로그인 처리
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
    }
    
    try {
        const userCredential = await window.firebase.signInWithEmailAndPassword(auth, email, password);
        console.log('로그인 성공:', userCredential.user.email);
        closeAllModals();
        alert('로그인 성공!');
    } catch (error) {
        console.error('로그인 실패:', error);
        alert('로그인에 실패했습니다: ' + error.message);
    }
}

// 회원가입 1단계 (이메일, 비밀번호 검증)
function handleSignupNext() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
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
    const nickname = document.getElementById('nickname').value.trim();
    
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
        
        console.log('회원가입 성공:', user.email);
        closeAllModals();
        
        // 임시 데이터 삭제
        delete window.tempSignupData;
        
        alert('회원가입이 완료되었습니다!');
        
    } catch (error) {
        console.error('회원가입 실패:', error);
        alert('회원가입에 실패했습니다: ' + error.message);
    }
}

// 비밀번호 재설정
async function handlePasswordReset() {
    const email = document.getElementById('resetEmail').value.trim();
    
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

// 로그아웃
async function logout() {
    try {
        await window.firebase.signOut(auth);
        console.log('로그아웃 성공');
        alert('로그아웃되었습니다.');
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

        // Make the user info clickable to open privacy modal
        // We show "- 닉네임" but make the nickname portion clickable
        const displayNameOrEmail = user.displayName || user.email;
        userInfo.innerHTML = `- <span id="userNickname" style="cursor:pointer;">${escapeHtml(displayNameOrEmail)}</span>`;
        const nicknameSpan = document.getElementById('userNickname');
        if (nicknameSpan) {
            nicknameSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                openPrivacyModal();
            });
        }
    } else {
        currentUser = null;
        loginButton.textContent = 'LOGIN';
        loginButton.onclick = openLoginModal;
        userInfo.textContent = '- 로그인이 필요합니다';
    }
}

// 인증 상태 감지(수정) 
function setupAuthListener() {
    window.firebase.onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('사용자 로그인됨:', user.email);
            updateUI(user);
            // 최초 로그인 또는 새로고침 시 privacy 체크
            showPrivacyModalIfNeeded(user);
        } else {
            console.log('사용자 로그아웃됨');
            updateUI(null);
        }
        // 로그인 여부와 관계없이 제품 목록 로드
        loadProducts();
    });
}

// 이미지 선택 처리
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 선택할 수 있습니다.');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB 이하여야 합니다.');
            return;
        }
        
        selectedImage = file;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${event.target.result}" alt="미리보기">`;
        };
        reader.readAsDataURL(file);
    }
}

// 제품 등록 처리
async function handleProductSubmit() {
    const name = document.getElementById('productName').value.trim();
    const price = document.getElementById('productPrice').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    
    if (!selectedImage) {
        alert('제품 이미지를 선택해주세요.');
        return;
    }
    
    if (!name) {
        alert('제품 이름을 입력해주세요.');
        return;
    }
    
    if (!price || price <= 0) {
        alert('올바른 가격을 입력해주세요.');
        return;
    }
    
    if (!description) {
        alert('제품 설명을 입력해주세요.');
        return;
    }
    
    try {
        // 이미지 업로드
        const imageFileName = `${Date.now()}_${selectedImage.name}`;
        const storageRef = window.firebase.ref(storage, `goods_image/${imageFileName}`);
        await window.firebase.uploadBytes(storageRef, selectedImage);
        const imageUrl = await window.firebase.getDownloadURL(storageRef);
        
        // 사이즈 옵션 처리 (콤마로 구분)
        const hasSize = document.getElementById('productHasSize')?.checked;
        const sizesRaw = document.getElementById('productSizes')?.value || '';
        let sizesArray = [];
        if (hasSize && sizesRaw.trim()) {
            sizesArray = sizesRaw.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Firestore에 제품 정보 저장 (sizes 필드 추가)
        await window.firebase.addDoc(window.firebase.collection(db, 'products'), {
            name: name,
            price: parseInt(price),
            description: description,
            imageUrl: imageUrl,
            sellerName: currentUser.displayName || currentUser.email,
            sellerId: currentUser.uid,
            sizes: sizesArray,
            createdAt: new Date()
        });
        
        alert('제품이 등록되었습니다!');
        closeAllModals();
        
        // 폼 초기화
        document.getElementById('productImage').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productDescription').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productHasSize').checked = false;
        document.getElementById('productSizes').value = '';
        document.getElementById('productSizes').style.display = 'none';
        selectedImage = null;
        
        // 제품 목록 새로고침
        loadProducts();
        
    } catch (error) {
        console.error('제품 등록 실패:', error);
        alert('제품 등록에 실패했습니다: ' + error.message);
    }
}

// 개인정보 저장 처리 (privacy 컬렉션에 uid로 문서 저장)
async function handlePrivacySave() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        openLoginModal();
        return;
    }

    const grade = document.getElementById('privacyGrade').value;
    const classVal = document.getElementById('privacyClass').value;
    const numberVal = document.getElementById('privacyNumber').value;
    const nameVal = document.getElementById('privacyName').value.trim();

    if (!grade) {
        alert('학년을 선택해주세요.');
        return;
    }
    if (!classVal) {
        alert('반을 선택해주세요.');
        return;
    }
    if (!numberVal) {
        alert('번호를 선택해주세요.');
        return;
    }
    if (!nameVal) {
        alert('이름을 입력해주세요.');
        return;
    }

    try {
        const privacyDocRef = window.firebase.doc(db, 'privacy', currentUser.uid);
        const now = new Date();

        // 저장할 필드: uid, nickname, grade, class, number, name
        await window.firebase.setDoc(privacyDocRef, {
            uid: currentUser.uid,
            nickname: currentUser.displayName || currentUser.email,
            grade: grade,
            class: classVal,
            number: numberVal,
            name: nameVal,
            updatedAt: now,
            createdAt: now // if overwriting, createdAt will be updated too; could be adjusted to check existence first
        });

        alert('개인정보가 저장되었습니다.');
        closeAllModals();
    } catch (error) {
        console.error('privacy 저장 실패:', error);
        alert('개인정보 저장에 실패했습니다: ' + error.message);
    }
}

// 제품 목록 로드
async function loadProducts() {
    console.log('loadProducts 시작');
    console.log('db 객체:', db);
    console.log('currentUser:', currentUser);
    
    if (!db) {
        console.error('db가 초기화되지 않음');
        return;
    }
    
    try {
        console.log('Firestore에서 데이터 가져오기 시도...');
        
        const querySnapshot = await window.firebase.getDocs(
            window.firebase.collection(db, 'products')
        );
        
        console.log('데이터 가져오기 성공! 문서 수:', querySnapshot.size);
        
        const container = document.getElementById('cardsContainer');
        container.innerHTML = '';
        
        const products = [];
        querySnapshot.forEach((doc) => {
            console.log('문서 ID:', doc.id, '데이터:', doc.data());
            products.push(doc.data());
        });
        
        // JavaScript에서 정렬 (최신순)
        products.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || new Date(0);
            const timeB = b.createdAt?.toDate?.() || new Date(0);
            return timeB - timeA;
        });
        
        // 카드 생성
        products.forEach((product) => {
            const card = createProductCard(product);
            container.appendChild(card);
        });
        
        if (products.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 20px; padding: 40px;">등록된 제품이 없습니다.</p>';
        }
        
    } catch (error) {
        console.error('제품 목록 로드 실패:', error);
        console.error('에러 코드:', error.code);
        console.error('에러 메시지:', error.message);
        console.error('전체 에러 객체:', error);
        
        const container = document.getElementById('cardsContainer');
        container.innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; font-size: 20px; padding: 40px; color: red;">
                제품 목록을 불러오는데 실패했습니다.<br>
                에러: ${error.message}<br>
                코드: ${error.code}
            </p>
        `;
    }
}

// 제품 카드 생성
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const imageUrl = product.imageUrl || 'https://via.placeholder.com/300?text=No+Image';
    
    // 사이즈 정보 간단히 표시 (있을 경우)
    const sizesInfo = (product.sizes && product.sizes.length) ? ` / 사이즈: ${product.sizes.join(',')}` : '';
    
    card.innerHTML = `
        <div class="title-box">
            <img src="${imageUrl}" alt="${escapeHtml(product.name)}" onerror="this.src='https://via.placeholder.com/300?text=Image+Error'">
        </div>
        <div class="info-box">${escapeHtml(product.name)} / ${product.price.toLocaleString()}원${sizesInfo}</div>
        <div class="description-box">${escapeHtml(product.description)}</div>
    `;
    
    // 카드 클릭 이벤트 추가
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        openDetailModal(product);
    });
    
    return card;
}

// Enter 키 이벤트
document.addEventListener('DOMContentLoaded', () => {
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

    const nickname = document.getElementById('nickname');
    if (nickname) {
        nickname.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignupComplete();
        });
    }

    const productImage = document.getElementById('productImage');
    if (productImage) {
        productImage.addEventListener('change', handleImageSelect);
    }

    // 제품 등록 사이즈 체크박스 토글
    const productHasSize = document.getElementById('productHasSize');
    const productSizes = document.getElementById('productSizes');
    if (productHasSize && productSizes) {
        productHasSize.addEventListener('change', () => {
            if (productHasSize.checked) {
                productSizes.style.display = 'block';
            } else {
                productSizes.value = '';
                productSizes.style.display = 'none';
            }
        });
    }
});

// 로그인될 때 privacy 모달 자동 오픈
function showPrivacyModalIfNeeded(user) {
    if (!user) return;
    // 로그인된 경우 privacy 컬렉션에서 개인정보 존재 여부 확인
    const privacyDocRef = window.firebase.doc(db, 'privacy', user.uid);
    window.firebase.getDoc(privacyDocRef)
        .then((docSnap) => {
            if (!docSnap.exists()) {
                // 개인정보 문서가 없으면 모달 자동 오픈
                openPrivacyModal();
            }
        })
        .catch((err) => {
            console.error('privacy 데이터 확인 에러', err);
        });
}

// Firebase 초기화 시작
waitForFirebaseInit();


function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
