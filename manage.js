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

let privacyMap = {}; // uid -> privacy object
let purchases = []; // merged purchase objects (원본 전체)
let filtered = [];  // 화면에 표시되는 결과 (검색 필터 적용)

function initializeFirebase() {
    if (window.firebase && window.firebase.initializeApp) {
        app = window.firebase.initializeApp(firebaseConfig);
        db = window.firebase.getFirestore(app, 'goods');
        auth = window.firebase.getAuth ? window.firebase.getAuth(app) : null;
        console.log('Firebase 초기화 완료 (manage purchases view)');
        setupAuthListener();
        return true;
    }
    return false;
}

function waitForFirebaseInit() {
    const check = () => {
        if (initializeFirebase()) return;
        setTimeout(check, 100);
    };
    check();
}

/* Sidebar toggle & logout */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

async function logout() {
    try {
        if (!auth) return;
        await window.firebase.signOut(auth);
        alert('로그아웃되었습니다.');
        location.href = 'index.html';
    } catch (err) {
        console.error('로그아웃 실패', err);
    }
}

/* Auth listener */
function setupAuthListener() {
    if (auth && window.firebase.onAuthStateChanged) {
        window.firebase.onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                const userInfo = document.getElementById('userInfo');
                if (userInfo) userInfo.innerText = `- ${user.displayName || user.email}`;
                loadAllData();
            } else {
                alert('관리 페이지는 로그인이 필요합니다.');
                location.href = 'index.html';
            }
        });
    } else {
        loadAllData();
    }
}

/* 데이터 로드: privacy -> purchases 순서로 로드하여 병합 */
async function loadAllData() {
    setTbodyLoading();

    try {
        await loadPrivacyMap();
        await loadPurchases();
        // 제품 드롭다운 채우기
        populateProductFilter();
        filtered = purchases.slice();
        applyFiltersAndRender();
    } catch (e) {
        console.error('데이터 로드 실패:', e);
        const tbody = document.getElementById('purchasesTbody');
        tbody.innerHTML = `<tr><td colspan="9" class="no-data" style="color:red">데이터를 불러오는데 실패했습니다: ${escapeHtml(e.message || e)}</td></tr>`;
    }
}

function setTbodyLoading() {
    const tbody = document.getElementById('purchasesTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="no-data">로딩 중...</td></tr>';
}

async function loadPrivacyMap() {
    privacyMap = {};
    try {
        const colRef = window.firebase.collection(db, 'privacy');
        const snap = await window.firebase.getDocs(colRef);
        snap.forEach(doc => {
            const d = doc.data() || {};
            privacyMap[doc.id] = {
                uid: d.uid || doc.id,
                nickname: d.nickname || '',
                email: d.email || '',
                grade: d.grade || '',
                class: d.class || '',
                number: d.number || '',
                name: d.name || '',
                createdAt: convertToDate(d.createdAt),
                updatedAt: convertToDate(d.updatedAt)
            };
        });
        console.log('privacyMap 크기:', Object.keys(privacyMap).length);
    } catch (e) {
        console.warn('privacy 로드 중 에러:', e);
    }
}

async function loadPurchases() {
    purchases = [];
    try {
        const colRef = window.firebase.collection(db, 'purchases');
        const snap = await window.firebase.getDocs(colRef);
        if (snap.empty) {
            purchases = [];
            console.log('purchases 컬렉션 비어있음');
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data() || {};
            const buyerId = d.buyerId || d.buyerUid || d.uid || '';
            const privacy = (buyerId && privacyMap[buyerId]) ? privacyMap[buyerId] : null;

            const purchaseDate = extractDate(d.purchaseDate || d.createdAt || d.timestamp);

            // 구매자 이름/닉네임은 privacy의 값을 우선 사용 (요청사항)
            const buyerRealName = privacy ? (privacy.name || '') : (d.buyerName || d.buyer || '');
            const buyerNick = privacy ? (privacy.nickname || '') : (d.buyerNickname || d.nickname || '');

            const gradeVal = privacy ? privacy.grade : (d.grade || '');
            const classVal = privacy ? privacy.class : (d.class || '');
            const numberVal = privacy ? privacy.number : (d.number || '');

            const merged = {
                id: docSnap.id,
                buyerId: buyerId,
                buyerName: buyerRealName,
                buyerNickname: buyerNick,
                buyerEmail: privacy ? privacy.email : (d.buyerEmail || ''),
                grade: gradeVal,
                class: classVal,
                number: numberVal,
                studentNumeric: computeStudentNumeric(gradeVal, classVal, numberVal),
                productName: d.productName || (d.product && (d.product.name || d.product.title)) || d.title || '제품명 없음',
                productPrice: Number(d.productPrice || d.price || 0),
                quantity: Number(d.quantity || 1),
                totalPrice: Number(d.totalPrice || (d.productPrice ? d.productPrice * (d.quantity || 1) : 0)),
                productImageUrl: d.productImageUrl || d.imageUrl || (d.product && d.product.imageUrl) || '',
                selectedSize: d.selectedSize || '',
                sellerName: d.sellerName || '',
                purchaseDate: purchaseDate || new Date(),
                raw: d
            };
            purchases.push(merged);
        });

        console.log('purchases 로드 완료, 개수:', purchases.length);
    } catch (e) {
        console.error('purchases 로드 실패:', e);
        throw e;
    }
}

/* 유틸리티 */
function extractDate(val) {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const parsed = new Date(val);
    if (!isNaN(parsed)) return parsed;
    return null;
}

function convertToDate(val) {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const p = new Date(val);
    if (!isNaN(p)) return p;
    return null;
}

function computeStudentNumeric(grade, klass, number) {
    const g = Number(grade) || 0;
    const c = Number(klass) || 0;
    const n = Number(number) || 0;
    return g * 10000 + c * 100 + n;
}

function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* 검색/정렬 로직 */
let searchTimeout = null;

function applyFiltersAndRender() {
    const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    const field = document.getElementById('searchField').value;
    const sortVal = document.getElementById('sortSelect').value;
    const productFilter = document.getElementById('productFilter') ? document.getElementById('productFilter').value : '__all';

    // 먼저 전체 purchases 기준으로 필터링 (검색 + 제품 필터)
    filtered = purchases.filter(item => {
        // 제품 필터 적용 (전체 제외)
        if (productFilter && productFilter !== '__all') {
            if ((item.productName || '') !== productFilter) return false;
        }

        if (!q) return true;
        if (field === 'all') {
            return (
                (item.productName && item.productName.toLowerCase().includes(q)) ||
                (item.buyerName && item.buyerName.toLowerCase().includes(q)) ||
                (item.buyerNickname && item.buyerNickname.toLowerCase().includes(q)) ||
                (String(item.studentNumeric).includes(q)) ||
                (item.buyerEmail && item.buyerEmail.toLowerCase().includes(q))
            );
        } else if (field === 'productName') {
            return item.productName && item.productName.toLowerCase().includes(q);
        } else if (field === 'buyerName') {
            return item.buyerName && item.buyerName.toLowerCase().includes(q);
        } else if (field === 'nickname') {
            return item.buyerNickname && item.buyerNickname.toLowerCase().includes(q);
        } else if (field === 'studentNumber') {
            return String(item.studentNumeric).includes(q) || (`${item.grade || ''}${item.class || ''}${item.number || ''}`).includes(q);
        }
        return true;
    });

    // 정렬
    const [fieldSort, dir] = sortVal.split('_');
    const asc = dir === 'asc';
    filtered.sort((a, b) => {
        if (fieldSort === 'purchaseDate') {
            return asc ? a.purchaseDate - b.purchaseDate : b.purchaseDate - a.purchaseDate;
        } else if (fieldSort === 'studentNumber') {
            return asc ? a.studentNumeric - b.studentNumeric : b.studentNumeric - a.studentNumeric;
        } else if (fieldSort === 'buyerName') {
            const A = (a.buyerName || '').toLowerCase();
            const B = (b.buyerName || '').toLowerCase();
            if (A < B) return asc ? -1 : 1;
            if (A > B) return asc ? 1 : -1;
            return 0;
        } else if (fieldSort === 'productName') {
            const A = (a.productName || '').toLowerCase();
            const B = (b.productName || '').toLowerCase();
            if (A < B) return asc ? -1 : 1;
            if (A > B) return asc ? 1 : -1;
            return 0;
        }
        return 0;
    });

    renderTable();
    computeAggregatesAndRender(); // 화면에 표시되는 filtered 결과 기준으로 집계
}

/* 렌더링 */
function renderTable() {
    const tbody = document.getElementById('purchasesTbody');
    if (!filtered || filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">조건에 맞는 구매내역이 없습니다.</td></tr>';
        renderProductSummary([]); // 빈으로 갱신
        renderGroupSummary([]); // 빈으로 갱신
        return;
    }

    const rows = filtered.map(item => {
        const dateStr = item.purchaseDate ? item.purchaseDate.toLocaleString('ko-KR') : '-';
        const studentNumStr = item.studentNumeric ? escapeHtml(String(item.studentNumeric)) : '-';
        const buyerLine = `${escapeHtml(item.buyerName || '-')}${item.buyerNickname ? ` / ${escapeHtml(item.buyerNickname)}` : ''}`;
        const thumb = item.productImageUrl ? `<img class="prod-thumb" src="${escapeHtml(item.productImageUrl)}" onerror="this.src='https://via.placeholder.com/120x80?text=No+Image'">` : `<img class="prod-thumb" src="https://via.placeholder.com/120x80?text=No+Image">`;
        const size = item.selectedSize ? escapeHtml(item.selectedSize) : '-';

        return `
          <tr data-id="${escapeHtml(item.id)}">
            <td class="small">${escapeHtml(dateStr)}</td>
            <td>${studentNumStr}</td>
            <td>${buyerLine}<div class="small">${escapeHtml(item.buyerEmail || '')}</div></td>
            <td>${thumb}<div class="small" style="margin-top:6px;">${escapeHtml(item.productName)}</div></td>
            <td style="text-align:center;">${escapeHtml(String(item.quantity))}</td>
            <td style="text-align:right;">${escapeHtml(String(item.totalPrice.toLocaleString()))}원</td>
            <td style="text-align:center;">${size}</td>
            <td>${escapeHtml(item.sellerName || '-')}</td>
            <td>
              <button class="action-btn" data-action="view" data-id="${escapeHtml(item.id)}">보기</button>
              <button class="action-btn danger" data-action="delete" data-id="${escapeHtml(item.id)}">삭제</button>
            </td>
          </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;

    // 바인딩
    tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (action === 'view') {
                const it = purchases.find(x => x.id === id);
                if (!it) return alert('데이터를 찾을 수 없습니다.');
                const details = [
                    `구매 아이디: ${it.id}`,
                    `구매일시: ${it.purchaseDate ? it.purchaseDate.toLocaleString() : '-'}`,
                    `구매자(privacy 기준): ${it.buyerName} (${it.buyerNickname || '-'})`,
                    `이메일: ${it.buyerEmail || '-'}`,
                    `학번: ${it.grade || '-'}학년 ${it.class || '-'}반 ${it.number || '-'}`,
                    `제품: ${it.productName}`,
                    `수량: ${it.quantity}`,
                    `총액: ${it.totalPrice.toLocaleString()}원`,
                    `사이즈: ${it.selectedSize || '-'}`,
                    `판매자: ${it.sellerName || '-'}`
                ].join('\n');
                alert(details);
            } else if (action === 'delete') {
                handleDeletePurchase(id);
            }
        });
    });
}

/* 집계 기능 */
// filtered 데이터를 기준으로 제품별 합계 및 그룹별 합계 계산/렌더링
function computeAggregatesAndRender() {
    // product aggregates: { productKey: { productName, size, qty, total } }
    const prodAgg = {};
    filtered.forEach(p => {
        // 사이즈 키는 값이 있을 때만 붙임
        const sizeLabel = p.selectedSize ? ` (${p.selectedSize})` : '';
        const nameKey = `${p.productName || '__unknown'}${sizeLabel}`;
        if (!prodAgg[nameKey]) prodAgg[nameKey] = { productName: p.productName || '__unknown', size: p.selectedSize || '', qty: 0, total: 0 };
        prodAgg[nameKey].qty += (Number(p.quantity) || 0);
        prodAgg[nameKey].total += (Number(p.totalPrice) || 0);
    });
    // 사이즈별 정렬: 수량 내림차순, 제품명 오름차순, 사이즈 오름차순
    const prodList = Object.values(prodAgg).sort((a, b) => {
        if (b.qty !== a.qty) return b.qty - a.qty;
        if ((a.productName || '') !== (b.productName || '')) return (a.productName || '').localeCompare(b.productName || '');
        return (a.size || '').localeCompare(b.size || '');
    });
    renderProductSummary(prodList);

    // group aggregates: groupBy + (제품명, 사이즈)별로 집계
    const groupBy = document.getElementById('groupBy') ? document.getElementById('groupBy').value : 'none';
    const groupAgg = {}; // key -> { label, qty, total }

    filtered.forEach(p => {
        let groupKey, groupLabel;
        if (groupBy === 'grade') {
            groupKey = p.grade ? `grade_${p.grade}` : 'grade_unknown';
            groupLabel = p.grade ? `${p.grade}학년` : '알수없음';
        } else if (groupBy === 'class') {
            const gr = p.grade || '?';
            const cl = p.class || '?';
            groupKey = `class_${gr}_${cl}`;
            groupLabel = `${gr}학년 ${cl}반`;
        } else {
            groupKey = 'all';
            groupLabel = '전체';
        }
        // 제품명+사이즈별로 그룹 키 확장
        const sizeLabel = p.selectedSize ? ` (${p.selectedSize})` : '';
        const productKey = `${p.productName || '__unknown'}${sizeLabel}`;
        const key = `${groupKey}|${productKey}`;
        const label = `${groupLabel} - ${p.productName || '__unknown'}${sizeLabel}`;
        if (!groupAgg[key]) groupAgg[key] = { label, qty: 0, total: 0 };
        groupAgg[key].qty += (Number(p.quantity) || 0);
        groupAgg[key].total += (Number(p.totalPrice) || 0);
    });

    // convert to list and sort by 그룹명(오름차) → 제품명(오름차) → 사이즈(오름차)
    const groupList = Object.values(groupAgg).sort((a, b) => {
        if (a.label < b.label) return -1;
        if (a.label > b.label) return 1;
        return 0;
    });
    renderGroupSummary(groupList);
}

function renderProductSummary(list) {
    const el = document.getElementById('productSummaryList');
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = '<div class="small">집계할 데이터가 없습니다.</div>';
        return;
    }
    el.innerHTML = list.map(item => {
        // 사이즈가 있으면 함께 표시
        const sizeStr = item.size ? ` (${escapeHtml(item.size)})` : '';
        return `<div class="summary-item"><div>${escapeHtml(item.productName)}${sizeStr}</div><div>${escapeHtml(String(item.qty))}개 / ${escapeHtml(String(item.total.toLocaleString()))}원</div></div>`;
    }).join('');
}

function renderGroupSummary(list) {
    const el = document.getElementById('groupSummaryList');
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = '<div class="small">집계할 데이터가 없습니다.</div>';
        return;
    }
    el.innerHTML = list.map(item => {
        return `<div class="summary-item"><div>${escapeHtml(item.label)}</div><div>${escapeHtml(String(item.qty))}개 / ${escapeHtml(String(item.total.toLocaleString()))}원</div></div>`;
    }).join('');
}

function populateProductFilter() {
    const sel = document.getElementById('productFilter');
    if (!sel) return;
    // collect unique product names from purchases
    const names = Array.from(new Set(purchases.map(p => p.productName || '__unknown')));
    // sort alphabetically
    names.sort((a,b) => (a||'').localeCompare(b||''));
    // clear and re-add
    sel.innerHTML = '<option value="__all">전체 제품</option>';
    names.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        sel.appendChild(opt);
    });
}

/* 삭제 기능 */
async function handleDeletePurchase(docId) {
    if (!confirm('이 구매 내역을 삭제하시겠습니까? (복구 불가)')) return;
    try {
        const docRef = window.firebase.doc(db, 'purchases', docId);
        if (!window.firebase.deleteDoc) throw new Error('deleteDoc 함수 없음');
        await window.firebase.deleteDoc(docRef);

        // 로컬에서 제거 후 재로드
        purchases = purchases.filter(p => p.id !== docId);
        applyFiltersAndRender();
        alert('구매 내역이 삭제되었습니다.');
    } catch (e) {
        console.error('구매 삭제 실패:', e);
        alert('삭제에 실패했습니다: ' + (e.message || e));
    }
}

/* 이벤트 바인딩 */
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFiltersAndRender, 180);
        });
    }

    const searchField = document.getElementById('searchField');
    if (searchField) searchField.addEventListener('change', applyFiltersAndRender);

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);

    const productFilter = document.getElementById('productFilter');
    if (productFilter) productFilter.addEventListener('change', applyFiltersAndRender);

    const groupBy = document.getElementById('groupBy');
    if (groupBy) groupBy.addEventListener('change', () => {
        applyFiltersAndRender(); // recompute aggregates
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchField').value = 'all';
        document.getElementById('sortSelect').value = 'purchaseDate_desc';
        document.getElementById('productFilter').value = '__all';
        document.getElementById('groupBy').value = 'none';
        applyFiltersAndRender();
    });
});

/* 시작 */
waitForFirebaseInit();
