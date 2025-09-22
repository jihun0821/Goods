// matches.js - 오늘의 경기 관련 기능

// 전역 변수
let todayMatches = [];
let currentMatchIndex = 0;

// 오늘 날짜 포맷팅 함수 (YYYY-MM-DD 형태)
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 날짜 문자열을 비교용 포맷으로 변환
function normalizeDate(dateStr) {
    if (!dateStr) return '';
    
    // 다양한 날짜 형식 처리
    // "2024-09-22", "09/22", "9월 22일" 등
    const patterns = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/,  // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})/,         // MM/DD
        /(\d{1,2})월\s*(\d{1,2})일/     // MM월 DD일
    ];
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    for (let pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
            if (pattern.source.includes('\\d{4}')) {
                // YYYY-MM-DD 형식
                const [, year, month, day] = match;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (pattern.source.includes('\\/')) {
                // MM/DD 형식
                const [, month, day] = match;
                return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (pattern.source.includes('월')) {
                // MM월 DD일 형식
                const [, month, day] = match;
                return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    
    return dateStr; // 변환할 수 없으면 원본 반환
}

// Firebase에서 오늘의 경기 조회
async function getTodayMatches() {
    try {
        console.log("오늘의 경기 조회 시작...");
        
        if (!window.db || !window.auth) {
            console.error("Firebase가 초기화되지 않았습니다.");
            return [];
        }
        
        const todayStr = getTodayDateString();
        console.log("오늘 날짜:", todayStr);
        
        // Firestore에서 모든 경기 가져오기
        const querySnapshot = await window.firebase.getDocs(
            window.firebase.collection(window.db, "matches")
        );
        
        const matches = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const matchDate = normalizeDate(data.date);
            
            console.log(`경기 ID: ${doc.id}, 날짜: ${data.date} -> 정규화: ${matchDate}`);
            
            // 오늘 날짜와 일치하는 경기만 선택
            if (matchDate === todayStr) {
                matches.push({
                    id: doc.id,
                    ...data
                });
                console.log("오늘의 경기 발견:", data.homeTeam, "vs", data.awayTeam);
            }
        });
        
        console.log("총 오늘의 경기 개수:", matches.length);
        return matches;
        
    } catch (error) {
        console.error("오늘의 경기 조회 실패:", error);
        return [];
    }
}

// 경기 정보 표시 업데이트
function updateMatchDisplay() {
    const matchDateEl = document.getElementById('matchDate');
    const matchTeamsEl = document.getElementById('matchTeams');
    const matchScoreEl = document.getElementById('matchScore');
    const matchStatusEl = document.getElementById('matchStatus');
    const matchDisplayEl = document.getElementById('matchDisplay');
    const noMatchesEl = document.getElementById('noMatches');
    const prevBtn = document.getElementById('prevMatch');
    const nextBtn = document.getElementById('nextMatch');
    
    if (todayMatches.length === 0) {
        // 오늘 경기가 없는 경우
        if (matchDisplayEl) matchDisplayEl.style.display = 'none';
        if (noMatchesEl) noMatchesEl.style.display = 'block';
        return;
    }
    
    // 경기가 있는 경우
    if (matchDisplayEl) matchDisplayEl.style.display = 'block';
    if (noMatchesEl) noMatchesEl.style.display = 'none';
    
    const currentMatch = todayMatches[currentMatchIndex];
    
    if (matchDateEl) {
        matchDateEl.textContent = currentMatch.date || getTodayDateString();
    }
    
    if (matchTeamsEl) {
        matchTeamsEl.textContent = `${currentMatch.homeTeam} vs ${currentMatch.awayTeam}`;
    }
    
    if (matchScoreEl && matchStatusEl) {
        if (currentMatch.status === 'finished') {
            matchScoreEl.textContent = `${currentMatch.homeScore} - ${currentMatch.awayScore}`;
            matchScoreEl.style.display = 'block';
            matchStatusEl.textContent = '종료';
        } else if (currentMatch.status === 'live') {
            matchScoreEl.textContent = `${currentMatch.homeScore} - ${currentMatch.awayScore}`;
            matchScoreEl.style.display = 'block';
            matchStatusEl.textContent = '진행 중';
        } else if (currentMatch.status === 'cancelled') {
            matchScoreEl.style.display = 'none';
            matchStatusEl.textContent = '취소';
        } else {
            matchScoreEl.style.display = 'none';
            matchStatusEl.textContent = '예정';
        }
    }
    
    // 네비게이션 버튼 상태 업데이트
    if (prevBtn) {
        prevBtn.disabled = currentMatchIndex === 0;
        prevBtn.style.opacity = currentMatchIndex === 0 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentMatchIndex === todayMatches.length - 1;
        nextBtn.style.opacity = currentMatchIndex === todayMatches.length - 1 ? '0.5' : '1';
    }
    
    // 경기 클릭 이벤트 추가 (경기 상세 패널 열기)
    const matchInfoEl = document.getElementById('matchInfo');
    if (matchInfoEl) {
        matchInfoEl.style.cursor = 'pointer';
        matchInfoEl.onclick = () => {
            openPanel(currentMatch.id);
        };
    }
}

// 이전 경기로 이동
function showPrevMatch() {
    if (currentMatchIndex > 0) {
        currentMatchIndex--;
        updateMatchDisplay();
    }
}

// 다음 경기로 이동
function showNextMatch() {
    if (currentMatchIndex < todayMatches.length - 1) {
        currentMatchIndex++;
        updateMatchDisplay();
    }
}

// script.js의 패널 관련 함수들 복사
function openPanel(matchId) {
    const matchDetailsPanel = document.getElementById("matchDetailsPanel");
    const overlay = document.getElementById("overlay");
    
    if (matchDetailsPanel && overlay) {
        loadMatchDetails(matchId);
        matchDetailsPanel.classList.add("active");
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closePanel() {
    const matchDetailsPanel = document.getElementById("matchDetailsPanel");
    const overlay = document.getElementById("overlay");
    
    if (matchDetailsPanel && overlay) {
        matchDetailsPanel.classList.remove("active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// 경기 상세 정보 로딩 (script.js에서 복사)
async function loadMatchDetails(matchId) {
    const matchDetails = await getMatchDetailsById(matchId);
    if (!matchDetails) return;
    
    const panelTitle = document.getElementById("panelTitle");
    const panelContent = document.getElementById("panelContent");
    
    if (panelTitle) {
        panelTitle.textContent = `${matchDetails.homeTeam} vs ${matchDetails.awayTeam}`;
    }

    const isLoggedIn = !!window.auth.currentUser;
    const userVoted = isLoggedIn ? await hasUserVoted(matchId) : false;
    const stats = await getVotingStatsFromFirestore(matchId);

    let predictionHtml = "";
    
    // 관리자 권한 확인
    let isAdmin = false;
    if (window.auth.currentUser) {
        try {
            const adminDocRef = window.firebase.doc(window.db, "admins", window.auth.currentUser.email);
            const adminDoc = await window.firebase.getDoc(adminDocRef);
            isAdmin = adminDoc.exists();
        } catch (error) {
            console.error("관리자 권한 확인 실패:", error);
        }
    }
    
    // 경기가 finished 상태이고 관리자인 경우 결과 설정 버튼 표시
    if (matchDetails.status === "finished" && isAdmin && !matchDetails.adminResult) {
        predictionHtml = `
            <h3>경기 결과 설정 (관리자)</h3>
            <div class="admin-result-btns">
                <button class="admin-result-btn home-win" onclick="setMatchResult('${matchId}', 'homeWin')">홈팀 승</button>
                <button class="admin-result-btn draw" onclick="setMatchResult('${matchId}', 'draw')">무승부</button>
                <button class="admin-result-btn away-win" onclick="setMatchResult('${matchId}', 'awayWin')">원정팀 승</button>
            </div>
            <h3>승부예측 결과</h3><div id="votingStats"></div>
        `;
    }
    // 관리자가 결과를 이미 설정한 경우
    else if (matchDetails.status === "finished" && matchDetails.adminResult) {
        const resultText = {
            'homeWin': '홈팀 승',
            'draw': '무승부', 
            'awayWin': '원정팀 승'
        }[matchDetails.adminResult] || '결과 미정';
        
        predictionHtml = `
            <h3>경기 결과: ${resultText}</h3>
            <h3>승부예측 결과</h3><div id="votingStats"></div>
        `;
    }
    // 예정된 경기의 승부예측
    else if (matchDetails.status === "scheduled") {
        if (!isLoggedIn || userVoted) {
            predictionHtml = `<h3>승부예측 결과</h3><div id="votingStats"></div>`;
        } else {
            predictionHtml = `
                <h3>승부예측</h3>
                <div class="prediction-btns">
                    <button class="prediction-btn home-win" data-vote="homeWin">1</button>
                    <button class="prediction-btn draw" data-vote="draw">X</button>
                    <button class="prediction-btn away-win" data-vote="awayWin">2</button>
                </div>`;
        }
    }
    // 기타 경기 상태
    else {
        predictionHtml = `<h3>승부예측 결과</h3><div id="votingStats"></div>`;
    }

    if (panelContent) {
        panelContent.innerHTML = `
            <div class="match-date">${matchDetails.date}</div>
            <div class="match-league">${matchDetails.league}</div>
            <div class="match-score">
                <div class="team-name">${matchDetails.homeTeam}</div>
                <div class="score-display">${matchDetails.homeScore} - ${matchDetails.awayScore}</div>
                <div class="team-name">${matchDetails.awayTeam}</div>
            </div>
            <div class="prediction-container">${predictionHtml}</div>
            ${await renderPanelTabs(matchDetails, matchId)}
        `;
    }

    const statsContainer = document.querySelector('#votingStats');
    if (statsContainer) renderVotingGraph(statsContainer, stats);

    setupPanelTabs(matchId);

    // 일반 사용자 승부예측 버튼 이벤트
    const buttons = document.querySelectorAll('.prediction-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const voteType = btn.getAttribute("data-vote");
            const success = await saveVoteToFirestore(matchId, voteType);
            if (success) {
                const updatedStats = await getVotingStatsFromFirestore(matchId);
                const container = btn.closest('.prediction-container');
                container.innerHTML = `<h3>승부예측 결과</h3><div id="votingStats"></div>`;
                renderVotingGraph(container.querySelector('#votingStats'), updatedStats);
            }
        });
    });
}

// script.js의 필요한 함수들 복사
async function getMatchDetailsById(matchId) {
    try {
        const docRef = window.firebase.doc(window.db, "matches", matchId);
        const docSnap = await window.firebase.getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.warn(`경기 ID ${matchId}에 대한 데이터가 없습니다.`);
            return null;
        }
    } catch (error) {
        console.error("경기 정보 불러오기 실패:", error);
        return null;
    }
}

async function hasUserVoted(matchId) {
    const user = window.auth.currentUser;
    if (!user) return false;

    const voteRef = window.firebase.doc(window.db, 'votes', `${matchId}_${user.uid}`);
    const voteSnap = await window.firebase.getDoc(voteRef);
    return voteSnap.exists();
}

async function saveVoteToFirestore(matchId, voteType) {
    const user = window.auth.currentUser;
    if (!user) return;

    // votes 저장 (중복방지)
    const voteRef = window.firebase.doc(window.db, 'votes', `${matchId}_${user.uid}`);
    const voteSnap = await window.firebase.getDoc(voteRef);

    if (voteSnap.exists()) return null;

    await window.firebase.setDoc(voteRef, {
        matchId,
        uid: user.uid,
        voteType,
        votedAt: new Date()
    });

    // user_points 자동 생성 (없을 경우)
    const pointRef = window.firebase.doc(window.db, 'user_points', user.uid);
    const pointSnap = await window.firebase.getDoc(pointRef);
    if (!pointSnap.exists()) {
        await window.firebase.setDoc(pointRef, {
            points: 0,
            uid: user.uid
        });
    }

    return true;
}

async function getVotingStatsFromFirestore(matchId) {
    const stats = { homeWin: 0, draw: 0, awayWin: 0, total: 0 };
    const querySnapshot = await window.firebase.getDocs(
        window.firebase.query(
            window.firebase.collection(window.db, 'votes'),
            window.firebase.where('matchId', '==', matchId)
        )
    );

    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.voteType in stats) {
            stats[data.voteType]++;
            stats.total++;
        }
    });

    return stats;
}

function renderVotingGraph(container, stats) {
    const totalVotes = stats.total;
    
    if (totalVotes === 0) {
        container.innerHTML = `
            <div class="voting-stats">
                <div class="no-votes-message">
                    <p>아직 투표가 없습니다.</p>
                </div>
            </div>
        `;
        return;
    }
    
    const homePercent = Math.round((stats.homeWin / totalVotes) * 100);
    const drawPercent = Math.round((stats.draw / totalVotes) * 100);
    const awayPercent = Math.round((stats.awayWin / totalVotes) * 100);

    container.innerHTML = `
        <div class="voting-stats">
            <div class="stat-row">
                <div class="stat-value">${homePercent}%</div>
                <div class="stat-bar">
                    <div class="home-stat" style="width: ${homePercent}%"></div>
                    <div class="draw-stat" style="width: ${drawPercent}%"></div>
                    <div class="away-stat" style="width: ${awayPercent}%"></div>
                </div>
                <div class="stat-value">${awayPercent}%</div>
            </div>
            <div class="stat-labels">
                <span class="home-label">홈 승 (${stats.homeWin})</span>
                <span class="draw-label">무승부 (${stats.draw})</span>
                <span class="away-label">원정 승 (${stats.awayWin})</span>
            </div>
        </div>
    `;
}

// 팀 라인업 가져오기
async function getTeamLineup(teamName) {
    try {
        const teamDocRef = window.firebase.doc(window.db, "teams", teamName);
        const teamDoc = await window.firebase.getDoc(teamDocRef);
        
        if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            return teamData.lineups || { first: [], second: [], third: [] };
        } else {
            return { first: [], second: [], third: [] };
        }
    } catch (error) {
        console.error(`${teamName} 팀 라인업 조회 실패:`, error);
        return { first: [], second: [], third: [] };
    }
}

// 경기 라인업 데이터 가져오기
async function getMatchLineups(matchDetails) {
    try {
        const homeTeamName = matchDetails.homeTeam;
        const awayTeamName = matchDetails.awayTeam;
        
        const homeLineup = await getTeamLineup(homeTeamName);
        const awayLineup = await getTeamLineup(awayTeamName);
        
        const finalLineups = {
            home: homeLineup,
            away: awayLineup
        };
        
        // teams 컬렉션에서 라인업을 찾지 못한 경우 matches 컬렉션에서 폴백
        if (!homeLineup.first.length && !homeLineup.second.length && !homeLineup.third.length) {
            if (matchDetails.lineups && matchDetails.lineups.home) {
                finalLineups.home = matchDetails.lineups.home;
            }
        }
        
        if (!awayLineup.first.length && !awayLineup.second.length && !awayLineup.third.length) {
            if (matchDetails.lineups && matchDetails.lineups.away) {
                finalLineups.away = matchDetails.lineups.away;
            }
        }
        
        return finalLineups;
        
    } catch (error) {
        console.error("라인업 조회 중 오류 발생:", error);
        return matchDetails.lineups || {
            home: { first: [], second: [], third: [] },
            away: { first: [], second: [], third: [] }
        };
    }
}

// HTML 이스케이프
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/[&<>"'`]/g, s => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;"
    }[s]));
}

// 패널 탭 렌더링
async function renderPanelTabs(matchDetails, matchId) {
    const lineups = await getMatchLineups(matchDetails);
    
    return `
        <div class="tab-container">
            <div class="tabs">
                <div class="tab active" data-tab="lineup">라인업</div>
                <div class="tab" data-tab="chat">채팅</div>
            </div>
            <div class="tab-contents">
                <div class="tab-content lineup-content active">
                    ${renderLineup(lineups)}
                </div>
                <div class="tab-content chat-content">
                    ${renderChatBox(matchId)}
                </div>
            </div>
        </div>
    `;
}

// 라인업 렌더링
function renderLineup(lineups) {
    function players(list) {
        return `<div class="players-container">${list.map((n) => `<div class="player">${escapeHtml(n)}</div>`).join("")}</div>`;
    }
    function sideBlock(side, data) {
        return `
            <div class="lineup-team lineup-${side}">
                <div class="lineup-group"><span class="position-label">3학년</span>${players(data.third || [])}</div>
                <div class="lineup-group"><span class="position-label">2학년</span>${players(data.second || [])}</div>
                <div class="lineup-group"><span class="position-label">1학년</span>${players(data.first || [])}</div>
            </div>
        `;
    }
    return `
        <div class="lineup-field">
            <div class="lineup-bg"></div>
            <div class="lineup-sides">
                ${sideBlock("home", lineups.home)}
                <div class="vs-label">VS</div>
                ${sideBlock("away", lineups.away)}
            </div>
        </div>
    `;
}

// 채팅 박스 렌더링
function renderChatBox(matchId) {
    return `
        <div class="chat-messages" id="chatMessages"></div>
        <form class="chat-form" id="chatForm">
            <input type="text" id="chatInput" autocomplete="off" maxlength="120" placeholder="메시지를 입력하세요" />
            <button type="submit" id="sendChatBtn">전송</button>
        </form>
        <div class="chat-login-notice" style="display:none;">
            <button class="login-btn" onclick="document.getElementById('loginModal').style.display='flex'">로그인 후 채팅하기</button>
        </div>
    `;
}

// 패널 탭 설정
function setupPanelTabs(matchId) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach((tab, index) => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            contents[index].classList.add('active');
            
            if (tab.dataset.tab === "chat") {
                setupChat(matchId);
            }
        };
    });
}

// 채팅 기능
function setupChat(matchId) {
    const chatBox = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const loginNotice = document.querySelector('.chat-login-notice');
    
    if (!chatBox || !chatForm || !chatInput) return;
    
    chatBox.innerHTML = "";

    if (!window.auth.currentUser) {
        if (loginNotice) loginNotice.style.display = "block";
        chatForm.style.display = "none";
        chatBox.innerHTML = "<p style='text-align:center;color:#aaa;'>로그인 후 채팅을 이용할 수 있습니다.</p>";
        return;
    } else {
        if (loginNotice) loginNotice.style.display = "none";
        chatForm.style.display = "flex";
    }

    // 실시간 채팅 수신
    if (window.chatUnsubscribe) window.chatUnsubscribe();

    window.chatUnsubscribe = window.firebase.onSnapshot(
        window.firebase.query(
            window.firebase.collection(window.db, 'match_chats', matchId, 'messages'),
            window.firebase.where('matchId', '==', matchId)
        ),
        (snapshot) => {
            let html = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.uid === window.auth.currentUser.uid;
                html += `
                    <div class="chat-msg${isMe ? " me" : ""}">
                        <span class="chat-nick">${escapeHtml(msg.nickname)}</span>
                        <span class="chat-text">${escapeHtml(msg.text)}</span>
                        <span class="chat-time">${msg.time ? new Date(msg.time.seconds * 1000).toLocaleTimeString() : ""}</span>
                    </div>
                `;
            });
            chatBox.innerHTML = html;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    );

    // 메시지 전송
    chatForm.onsubmit = async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        
        const user = window.auth.currentUser;
        if (!user) return;
        
        const profileSnap = await window.firebase.getDoc(window.firebase.doc(window.db, 'profiles', user.uid));
        const nickname = profileSnap.exists() ? profileSnap.data().nickname : user.email.split('@')[0];
        
        await window.firebase.setDoc(
            window.firebase.doc(window.firebase.collection(window.db, 'match_chats', matchId, 'messages'), Date.now().toString() + "_" + user.uid),
            {
                matchId,
                uid: user.uid,
                nickname,
                text,
                time: new Date()
            }
        );
        
        chatInput.value = "";
        setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 100);
    };
}

// 관리자용 경기 결과 설정 함수
async function setMatchResult(matchId, result) {
    const user = window.auth.currentUser;
    if (!user) {
        alert('로그인 필요');
        return;
    }
    
    // 관리자 권한 체크
    const adminDocRef = window.firebase.doc(window.db, "admins", user.email);
    const adminDoc = await window.firebase.getDoc(adminDocRef);
    if (!adminDoc.exists()) {
        alert("관리자만 결과 설정 가능");
        return;
    }

    try {
        // 경기 결과 저장
        const matchRef = window.firebase.doc(window.db, "matches", matchId);
        await window.firebase.setDoc(matchRef, {
            status: "finished",
            adminResult: result
        }, { merge: true });

        // votes 조회
        const votesQuery = window.firebase.query(
          window.firebase.collection(window.db, "votes"),
          window.firebase.where("matchId", "==", matchId)
        );
        const votesSnapshot = await window.firebase.getDocs(votesQuery);
        const winners = [];
        votesSnapshot.forEach(doc => {
            if (doc.data().voteType === result) {
                winners.push(doc.data().uid);
            }
        });

        // 각 winner에게 100포인트씩 지급 (script.js의 updateUserPoints 함수가 있다고 가정)
        if (window.updateUserPoints) {
            for (const uid of winners) {
                await window.updateUserPoints(uid, 100);
            }
        }
        
        alert(`${winners.length}명에게 100포인트 지급 완료!`);
        
        // 패널 새로고침으로 결과 반영
        loadMatchDetails(matchId);
        
    } catch (error) {
        console.error("경기 결과 설정 중 오류:", error);
        alert("경기 결과 설정에 실패했습니다.");
    }
}

// 초기화 함수
async function initializeTodayMatches() {
    console.log("오늘의 경기 초기화 시작...");
    
    // Firebase 초기화 대기
    const waitForFirebase = () => {
        if (window.db && window.auth) {
            return true;
        }
        return false;
    };
    
    const wait = () => new Promise(resolve => {
        const check = () => {
            if (waitForFirebase()) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
    
    try {
        // Firebase 초기화 대기
        await wait();
        console.log("Firebase 초기화 완료, 오늘의 경기 로딩 시작");
        
        // 오늘의 경기 가져오기
        todayMatches = await getTodayMatches();
        currentMatchIndex = 0;
        
        // UI 업데이트
        updateMatchDisplay();
        
        console.log("오늘의 경기 초기화 완료");
        
    } catch (error) {
        console.error("오늘의 경기 초기화 실패:", error);
        
        // 오류 발생 시 "경기 없음" 상태로 표시
        const matchDisplayEl = document.getElementById('matchDisplay');
        const noMatchesEl = document.getElementById('noMatches');
        
        if (matchDisplayEl) matchDisplayEl.style.display = 'none';
        if (noMatchesEl) noMatchesEl.style.display = 'block';
    }
}

// 이벤트 리스너 설정
function setupTodayMatchEvents() {
    const prevBtn = document.getElementById('prevMatch');
    const nextBtn = document.getElementById('nextMatch');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const overlay = document.getElementById('overlay');
    
    // 이전/다음 경기 버튼
    if (prevBtn) {
        prevBtn.addEventListener('click', showPrevMatch);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', showNextMatch);
    }
    
    // 패널 닫기 버튼
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', closePanel);
    }
    
    // 오버레이 클릭으로 패널 닫기
    if (overlay) {
        overlay.addEventListener('click', closePanel);
    }
    
    console.log("오늘의 경기 이벤트 리스너 설정 완료");
}

// 전역 함수로 노출
window.initializeTodayMatches = initializeTodayMatches;
window.setupTodayMatchEvents = setupTodayMatchEvents;
window.getTodayMatches = getTodayMatches;
window.updateMatchDisplay = updateMatchDisplay;
window.showPrevMatch = showPrevMatch;
window.showNextMatch = showNextMatch;
window.openPanel = openPanel;
window.closePanel = closePanel;
window.setMatchResult = setMatchResult;

// DOM 로드 완료 후 자동 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log("matches.js DOM 로드 완료");
    
    // 이벤트 리스너 먼저 설정
    setupTodayMatchEvents();
    
    // Firebase 초기화 후 경기 데이터 로드
    setTimeout(() => {
        initializeTodayMatches();
    }, 500); // Firebase 초기화를 위한 지연
});

// 페이지가 이미 로드된 경우를 위한 처리
if (document.readyState === 'loading') {
    // DOM이 아직 로딩 중
    document.addEventListener('DOMContentLoaded', function() {
        setupTodayMatchEvents();
        setTimeout(initializeTodayMatches, 500);
    });
} else {
    // DOM이 이미 로드됨
    setupTodayMatchEvents();
    setTimeout(initializeTodayMatches, 500);
}
