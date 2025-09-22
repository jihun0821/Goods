// matches.js - 오늘의 경기 자동 로딩 기능 (Firebase 구조에 맞춤)

// 전역 변수
let todayMatches = [];
let currentMatchIndex = 0;

// 날짜 형식 변환 함수 (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 시간 형식 변환 함수 (HH:MM)
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 오늘의 경기 데이터 로드
async function loadTodayMatches() {
    try {
        console.log('오늘의 경기 데이터를 로드합니다...');
        
        // 오늘 날짜 가져오기
        const today = new Date();
        const todayString = formatDate(today);
        
        console.log('오늘 날짜:', todayString);
        
        // Firebase에서 오늘 날짜의 경기 조회
        const matchesQuery = window.firebase.query(
            window.firebase.collection(db, 'matches'),
            window.firebase.where('date', '==', todayString)
        );
        
        const querySnapshot = await window.firebase.getDocs(matchesQuery);
        
        todayMatches = [];
        querySnapshot.forEach((doc) => {
            const matchData = doc.data();
            todayMatches.push({
                docId: doc.id,  // Firestore 문서 ID
                ...matchData
            });
        });
        
        // ID 순으로 정렬 (시간이 없으므로)
        todayMatches.sort((a, b) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idA - idB;
        });
        
        console.log(`오늘의 경기 ${todayMatches.length}개를 로드했습니다:`, todayMatches);
        
        // UI 업데이트
        updateMatchDisplay();
        
    } catch (error) {
        console.error('경기 데이터 로드 실패:', error);
        showNoMatches();
    }
}

// 경기 표시 업데이트
function updateMatchDisplay() {
    const matchDisplay = document.getElementById('matchDisplay');
    const noMatches = document.getElementById('noMatches');
    const matchInfo = document.getElementById('matchInfo');
    const matchDate = document.getElementById('matchDate');
    const matchTeams = document.getElementById('matchTeams');
    const matchScore = document.getElementById('matchScore');
    const matchStatus = document.getElementById('matchStatus');
    const prevBtn = document.getElementById('prevMatch');
    const nextBtn = document.getElementById('nextMatch');
    
    if (todayMatches.length === 0) {
        // 경기가 없을 때
        showNoMatches();
        return;
    }
    
    // 경기가 있을 때
    if (matchDisplay) matchDisplay.style.display = 'flex';
    if (noMatches) noMatches.style.display = 'none';
    
    // 현재 경기 정보 표시
    const currentMatch = todayMatches[currentMatchIndex];
    if (currentMatch && matchInfo) {
        // 날짜 표시
        if (matchDate) {
            const matchDateObj = new Date(currentMatch.date);
            const dateStr = `${matchDateObj.getMonth() + 1}월 ${matchDateObj.getDate()}일`;
            const leagueStr = currentMatch.league || '호실축구';
            matchDate.textContent = `${dateStr} ${leagueStr}`;
        }
        
        // 팀 이름 표시 (homeTeam vs awayTeam)
        if (matchTeams) {
            const homeTeam = currentMatch.homeTeam || '홈팀';
            const awayTeam = currentMatch.awayTeam || '원정팀';
            matchTeams.textContent = `${homeTeam} vs ${awayTeam}`;
        }
        
        // 점수 표시 (경기 완료된 경우)
        if (matchScore) {
            if (currentMatch.status === 'finished') {
                const homeScore = currentMatch.homeScore || 0;
                const awayScore = currentMatch.awayScore || 0;
                matchScore.textContent = `${homeScore} : ${awayScore}`;
                matchScore.style.display = 'block';
            } else {
                matchScore.style.display = 'none';
            }
        }
        
        // 경기 상태 표시
        if (matchStatus) {
            let statusText = '예정';
            let statusClass = 'match-status';
            
            switch (currentMatch.status) {
                case 'scheduled':
                    statusText = '예정';
                    break;
                case 'live':
                    statusText = '진행 중';
                    statusClass += ' live';
                    break;
                case 'finished':
                    statusText = '종료';
                    statusClass += ' finished';
                    break;
                case 'cancelled':
                    statusText = '취소';
                    statusClass += ' cancelled';
                    break;
                default:
                    statusText = '예정';
            }
            
            matchStatus.textContent = statusText;
            matchStatus.className = statusClass;
        }
    }
    
    // 네비게이션 버튼 상태 업데이트
    if (prevBtn && nextBtn) {
        if (todayMatches.length > 1) {
            prevBtn.style.visibility = 'visible';
            nextBtn.style.visibility = 'visible';
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        } else {
            prevBtn.style.visibility = 'hidden';
            nextBtn.style.visibility = 'hidden';
        }
    }
    
    console.log(`경기 표시 업데이트 완료: ${currentMatchIndex + 1}/${todayMatches.length}`);
}

// 경기가 없을 때 표시
function showNoMatches() {
    const matchDisplay = document.getElementById('matchDisplay');
    const noMatches = document.getElementById('noMatches');
    
    if (matchDisplay) matchDisplay.style.display = 'none';
    if (noMatches) noMatches.style.display = 'block';
    
    console.log('오늘 예정된 경기가 없습니다.');
}

// 이전 경기 보기
function showPreviousMatch() {
    if (todayMatches.length === 0) return;
    
    currentMatchIndex = (currentMatchIndex - 1 + todayMatches.length) % todayMatches.length;
    updateMatchDisplay();
}

// 다음 경기 보기
function showNextMatch() {
    if (todayMatches.length === 0) return;
    
    currentMatchIndex = (currentMatchIndex + 1) % todayMatches.length;
    updateMatchDisplay();
}

// 경기 클릭 시 상세 정보 표시
function handleMatchClick() {
    if (todayMatches.length === 0) return;
    
    const currentMatch = todayMatches[currentMatchIndex];
    if (currentMatch && window.openMatchPanel) {
        // Firestore 문서 ID 또는 경기 ID 사용
        const matchId = currentMatch.docId || currentMatch.id;
        window.openMatchPanel(matchId);
    }
}

// 실시간 경기 상태 업데이트 리스너 설정
function setupMatchListener() {
    if (todayMatches.length === 0) return;
    
    console.log('실시간 경기 상태 업데이트 리스너를 설정합니다...');
    
    // 오늘의 모든 경기에 대해 실시간 리스너 설정
    todayMatches.forEach((match) => {
        if (!match.docId) return;
        
        const matchDocRef = window.firebase.doc(db, 'matches', match.docId);
        
        window.firebase.onSnapshot(matchDocRef, (doc) => {
            if (doc.exists()) {
                const updatedData = doc.data();
                
                // 로컬 데이터 업데이트
                const matchIndex = todayMatches.findIndex(m => m.docId === match.docId);
                if (matchIndex !== -1) {
                    todayMatches[matchIndex] = {
                        docId: doc.id,
                        ...updatedData
                    };
                    
                    // 현재 표시 중인 경기라면 UI 업데이트
                    if (matchIndex === currentMatchIndex) {
                        updateMatchDisplay();
                    }
                }
                
                console.log(`경기 ${match.id} 상태가 업데이트되었습니다:`, updatedData);
            }
        });
    });
}

// 경기 상세 정보 로드 (패널용)
function loadMatchDetails(matchId) {
    const panelContent = document.getElementById('panelContent');
    const panelTitle = document.getElementById('panelTitle');
    
    // 해당 경기 찾기
    const match = todayMatches.find(m => m.docId === matchId || m.id === matchId);
    
    if (!match) {
        if (panelContent) {
            panelContent.innerHTML = `
                <div class="error-message">
                    <p>경기 정보를 찾을 수 없습니다.</p>
                </div>
            `;
        }
        return;
    }
    
    if (panelTitle) {
        panelTitle.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
    }
    
    if (panelContent) {
        // 기본 경기 정보
        let contentHTML = `
            <div class="match-details">
                <div class="match-header">
                    <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
                    <div class="match-meta">
                        <span class="league">${match.league || '호실축구'}</span>
                        <span class="date">${match.date}</span>
                        <span class="match-id">경기 #${match.id}</span>
                    </div>
                </div>
                
                <div class="match-status-section">
                    <div class="status-badge ${match.status}">
                        ${getStatusText(match.status)}
                    </div>
                </div>
        `;
        
        // 점수 표시 (경기 완료시)
        if (match.status === 'finished') {
            contentHTML += `
                <div class="score-section">
                    <div class="final-score">
                        <div class="team-score">
                            <span class="team-name">${match.homeTeam}</span>
                            <span class="score">${match.homeScore || 0}</span>
                        </div>
                        <div class="vs">:</div>
                        <div class="team-score">
                            <span class="score">${match.awayScore || 0}</span>
                            <span class="team-name">${match.awayTeam}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 라인업 정보 (있는 경우)
        if (match.lineups && (match.lineups.home || match.lineups.away)) {
            contentHTML += `
                <div class="lineups-section">
                    <h4>라인업</h4>
                    <div class="lineups-container">
            `;
            
            // 홈팀 라인업
            if (match.lineups.home) {
                contentHTML += `
                    <div class="team-lineup">
                        <h5>${match.homeTeam}</h5>
                        ${formatLineup(match.lineups.home)}
                    </div>
                `;
            }
            
            // 원정팀 라인업
            if (match.lineups.away) {
                contentHTML += `
                    <div class="team-lineup">
                        <h5>${match.awayTeam}</h5>
                        ${formatLineup(match.lineups.away)}
                    </div>
                `;
            }
            
            contentHTML += `
                    </div>
                </div>
            `;
        }
        
        contentHTML += '</div>';
        panelContent.innerHTML = contentHTML;
    }
}

// 상태 텍스트 변환
function getStatusText(status) {
    switch (status) {
        case 'scheduled': return '예정';
        case 'live': return '진행 중';
        case 'finished': return '종료';
        case 'cancelled': return '취소';
        default: return '예정';
    }
}

// 라인업 포맷팅
function formatLineup(lineup) {
    let html = '';
    
    if (lineup.first && lineup.first.length > 0) {
        html += `
            <div class="lineup-period">
                <h6>1부</h6>
                <ul>${lineup.first.map(player => `<li>${player}</li>`).join('')}</ul>
            </div>
        `;
    }
    
    if (lineup.second && lineup.second.length > 0) {
        html += `
            <div class="lineup-period">
                <h6>2부</h6>
                <ul>${lineup.second.map(player => `<li>${player}</li>`).join('')}</ul>
            </div>
        `;
    }
    
    if (lineup.third && lineup.third.length > 0) {
        html += `
            <div class="lineup-period">
                <h6>3부</h6>
                <ul>${lineup.third.map(player => `<li>${player}</li>`).join('')}</ul>
            </div>
        `;
    }
    
    return html || '<p>라인업 정보가 없습니다.</p>';
}

// 이벤트 리스너 설정
function setupMatchEventListeners() {
    const prevBtn = document.getElementById('prevMatch');
    const nextBtn = document.getElementById('nextMatch');
    const matchInfo = document.getElementById('matchInfo');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', showPreviousMatch);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', showNextMatch);
    }
    
    if (matchInfo) {
        matchInfo.addEventListener('click', handleMatchClick);
        matchInfo.style.cursor = 'pointer';
    }
    
    console.log('경기 관련 이벤트 리스너 설정 완료');
}

// 정기적 업데이트 (5분마다)
function startPeriodicUpdate() {
    // 5분마다 경기 데이터 새로고침
    setInterval(async () => {
        console.log('정기적 경기 데이터 업데이트 시작...');
        await loadTodayMatches();
    }, 5 * 60 * 1000); // 5분
}

// 초기화 함수
async function initializeMatches() {
    try {
        console.log('경기 시스템 초기화 시작...');
        
        // Firebase 초기화 대기
        await window.waitForFirebaseInit();
        
        // 이벤트 리스너 설정
        setupMatchEventListeners();
        
        // 오늘의 경기 로드
        await loadTodayMatches();
        
        // 실시간 리스너 설정
        setupMatchListener();
        
        // 정기적 업데이트 시작
        startPeriodicUpdate();
        
        console.log('경기 시스템 초기화 완료');
        
    } catch (error) {
        console.error('경기 시스템 초기화 실패:', error);
        showNoMatches();
    }
}

// 전역 함수 노출
window.loadTodayMatches = loadTodayMatches;
window.showPreviousMatch = showPreviousMatch;
window.showNextMatch = showNextMatch;
window.initializeMatches = initializeMatches;
window.loadMatchDetails = loadMatchDetails;

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMatches);
} else {
    initializeMatches();
}