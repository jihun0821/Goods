// 오늘의 경기 관리
class TodayMatchManager {
    constructor() {
        this.todayMatches = [];
        this.currentMatchIndex = 0;
        this.db = null;
        this.auth = null;
        this.initialized = false;
        this.chatUnsubscribe = null;
    }

    // Firebase 초기화 대기
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebase && window.db && window.auth) {
                    this.db = window.db;
                    this.auth = window.auth;
                    this.initialized = true;
                    console.log("TodayMatchManager - Firebase 초기화 완료");
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // 오늘 날짜를 YYYY-MM-DD 형식으로 반환
    getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 날짜 문자열을 비교 가능한 형식으로 변환
    normalizeDate(dateStr) {
        if (!dateStr) return '';
        
        // 다양한 날짜 형식 처리
        // "2024.09.15" 형식
        if (dateStr.includes('.')) {
            return dateStr.replace(/\./g, '-');
        }
        // "2024/09/15" 형식
        if (dateStr.includes('/')) {
            return dateStr.replace(/\//g, '-');
        }
        // "09/15" 형식 (연도 없음)
        if (/^\d{2}\/\d{2}$/.test(dateStr)) {
            const currentYear = new Date().getFullYear();
            return `${currentYear}-${dateStr.replace('/', '-')}`;
        }
        // "9/15" 형식 (연도 없음, 0패딩 없음)
        if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
            const currentYear = new Date().getFullYear();
            const [month, day] = dateStr.split('/');
            return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return dateStr;
    }

    // Firestore에서 오늘의 경기 가져오기
    async loadTodayMatches() {
        if (!this.initialized) {
            await this.waitForFirebase();
        }

        try {
            const todayStr = this.getTodayDateString();
            console.log("오늘 날짜:", todayStr);

            // matches 컬렉션에서 모든 경기 가져오기
            const querySnapshot = await window.firebase.getDocs(
                window.firebase.collection(this.db, "matches")
            );

            const allMatches = [];
            querySnapshot.forEach((doc) => {
                const matchData = { id: doc.id, ...doc.data() };
                allMatches.push(matchData);
            });

            console.log("전체 경기 수:", allMatches.length);

            // 오늘 날짜와 일치하는 경기 필터링
            this.todayMatches = allMatches.filter(match => {
                const normalizedDate = this.normalizeDate(match.date);
                const isToday = normalizedDate === todayStr;
                
                if (isToday) {
                    console.log("오늘의 경기 발견:", match);
                }
                
                return isToday;
            });

            console.log("오늘의 경기 수:", this.todayMatches.length);

            // 시간순으로 정렬 (시간 정보가 있는 경우)
            this.todayMatches.sort((a, b) => {
                if (a.time && b.time) {
                    return a.time.localeCompare(b.time);
                }
                return 0;
            });

            return this.todayMatches.length > 0;
        } catch (error) {
            console.error("오늘의 경기 로드 실패:", error);
            return false;
        }
    }

    // UI 업데이트 메서드 (today_matches.js의 updateTodayMatchUI 메서드 교체용)
    updateTodayMatchUI() {
        const matchDate = document.getElementById('matchDate');
        const matchTeams = document.getElementById('matchTeams');
        const matchScore = document.getElementById('matchScore');
        const matchStatus = document.getElementById('matchStatus');
        const noMatches = document.getElementById('noMatches');
        const matchDisplay = document.getElementById('matchDisplay');

        if (this.todayMatches.length === 0) {
            // 경기가 없는 경우
            if (matchDisplay) matchDisplay.style.display = 'none';
            if (noMatches) noMatches.style.display = 'block';
            return;
        }

        // 경기가 있는 경우
        if (matchDisplay) matchDisplay.style.display = 'flex';
        if (noMatches) noMatches.style.display = 'none';

        const currentMatch = this.todayMatches[this.currentMatchIndex];
    
        // 날짜 표시 (시간 제외 - 공간 절약)
        if (matchDate) {
            matchDate.textContent = currentMatch.date;
        }
    
        // 팀명 표시
        if (matchTeams) {
            matchTeams.textContent = `${currentMatch.homeTeam} vs ${currentMatch.awayTeam}`;
        }

    // 내비게이션 버튼 상태 업데이트
    this.updateNavigationButtons();
}

    // 내비게이션 버튼 상태 업데이트
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevMatch');
        const nextBtn = document.getElementById('nextMatch');

        if (prevBtn) {
            prevBtn.disabled = this.currentMatchIndex === 0;
            prevBtn.style.opacity = this.currentMatchIndex === 0 ? '0.3' : '1';
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentMatchIndex >= this.todayMatches.length - 1;
            nextBtn.style.opacity = this.currentMatchIndex >= this.todayMatches.length - 1 ? '0.3' : '1';
        }
    }

    // 이전 경기로 이동
    showPreviousMatch() {
        if (this.currentMatchIndex > 0) {
            this.currentMatchIndex--;
            this.updateTodayMatchUI();
        }
    }

    // 다음 경기로 이동
    showNextMatch() {
        if (this.currentMatchIndex < this.todayMatches.length - 1) {
            this.currentMatchIndex++;
            this.updateTodayMatchUI();
        }
    }

    // 현재 경기 클릭 시 상세 모달 열기
    openCurrentMatchDetails() {
        if (this.todayMatches.length > 0) {
            const currentMatch = this.todayMatches[this.currentMatchIndex];
            console.log("경기 상세 모달 열기:", currentMatch.id);
            
            // 자체 모달 열기
            this.loadMatchDetails(currentMatch.id);
        }
    }

    // 경기 상세 정보 로딩
    async loadMatchDetails(matchId) {
        const matchDetailsPanel = document.getElementById("matchDetailsPanel");
        const overlay = document.getElementById("overlay");
        const panelTitle = document.getElementById("panelTitle");
        const panelContent = document.getElementById("panelContent");

        if (!matchDetailsPanel || !overlay || !panelTitle || !panelContent) {
            console.error("경기 상세 패널 요소를 찾을 수 없습니다.");
            return;
        }

        const matchDetails = await this.getMatchDetailsById(matchId);
        if (!matchDetails) return;
        
        panelTitle.textContent = `${matchDetails.homeTeam} vs ${matchDetails.awayTeam}`;

        const isLoggedIn = !!(this.auth.currentUser);
        const userVoted = isLoggedIn ? await this.hasUserVoted(matchId) : false;
        const stats = await this.getVotingStatsFromFirestore(matchId);

        let predictionHtml = "";
        
        // 관리자 권한 체크
        let isAdmin = false;
        if (isLoggedIn) {
            try {
                const adminDocRef = window.firebase.doc(this.db, "admins", this.auth.currentUser.email);
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
                    <button class="admin-result-btn home-win" onclick="todayMatchManager.setMatchResult('${matchId}', 'homeWin')">홈팀 승</button>
                    <button class="admin-result-btn draw" onclick="todayMatchManager.setMatchResult('${matchId}', 'draw')">무승부</button>
                    <button class="admin-result-btn away-win" onclick="todayMatchManager.setMatchResult('${matchId}', 'awayWin')">원정팀 승</button>
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

        panelContent.innerHTML = `
            <div class="match-date">${matchDetails.date}</div>
            <div class="match-league">${matchDetails.league}</div>
            <div class="match-score">
                <div class="team-name">${matchDetails.homeTeam}</div>
                <div class="score-display">${matchDetails.homeScore} - ${matchDetails.awayScore}</div>
                <div class="team-name">${matchDetails.awayTeam}</div>
            </div>
            <div class="prediction-container">${predictionHtml}</div>
            ${await this.renderPanelTabs(matchDetails, matchId)}
        `;

        const statsContainer = panelContent.querySelector('#votingStats');
        if (statsContainer) this.renderVotingGraph(statsContainer, stats);

        this.setupPanelTabs(matchId);

        // 일반 사용자 승부예측 버튼 이벤트
        const buttons = panelContent.querySelectorAll('.prediction-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const voteType = btn.getAttribute("data-vote");
                const success = await this.saveVoteToFirestore(matchId, voteType);
                if (success) {
                    const updatedStats = await this.getVotingStatsFromFirestore(matchId);
                    const container = btn.closest('.prediction-container');
                    container.innerHTML = `<h3>승부예측 결과</h3><div id="votingStats"></div>`;
                    this.renderVotingGraph(container.querySelector('#votingStats'), updatedStats);
                }
            });
        });

        // 패널 표시
        matchDetailsPanel.classList.add("active");
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    // Firestore에서 단일 경기 정보 가져오기
    async getMatchDetailsById(matchId) {
        try {
            const docRef = window.firebase.doc(this.db, "matches", matchId);
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

    // teams 컬렉션에서 팀 라인업 가져오기
    async getTeamLineup(teamName) {
        try {
            const teamDocRef = window.firebase.doc(this.db, "teams", teamName);
            const teamDoc = await window.firebase.getDoc(teamDocRef);
            
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                console.log(`${teamName} 팀 라인업 조회 성공:`, teamData.lineups);
                return teamData.lineups || { first: [], second: [], third: [] };
            } else {
                console.warn(`teams 컬렉션에서 ${teamName} 팀을 찾을 수 없습니다.`);
                return { first: [], second: [], third: [] };
            }
        } catch (error) {
            console.error(`${teamName} 팀 라인업 조회 실패:`, error);
            return { first: [], second: [], third: [] };
        }
    }

    // 경기 라인업 데이터 가져오기
    async getMatchLineups(matchDetails) {
        try {
            const homeTeamName = matchDetails.homeTeam;
            const awayTeamName = matchDetails.awayTeam;
            
            console.log(`라인업 조회 시작 - 홈팀: ${homeTeamName}, 원정팀: ${awayTeamName}`);
            
            // teams 컬렉션에서 각 팀의 라인업 조회
            const homeLineup = await this.getTeamLineup(homeTeamName);
            const awayLineup = await this.getTeamLineup(awayTeamName);
            
            const finalLineups = {
                home: homeLineup,
                away: awayLineup
            };
            
            // teams 컬렉션에서 라인업을 찾지 못한 경우 matches 컬렉션에서 폴백
            if (!homeLineup.first.length && !homeLineup.second.length && !homeLineup.third.length) {
                console.log(`${homeTeamName} 팀의 teams 컬렉션 라인업이 비어있음, matches 컬렉션에서 폴백`);
                if (matchDetails.lineups && matchDetails.lineups.home) {
                    finalLineups.home = matchDetails.lineups.home;
                }
            }
            
            if (!awayLineup.first.length && !awayLineup.second.length && !awayLineup.third.length) {
                console.log(`${awayTeamName} 팀의 teams 컬렉션 라인업이 비어있음, matches 컬렉션에서 폴백`);
                if (matchDetails.lineups && matchDetails.lineups.away) {
                    finalLineups.away = matchDetails.lineups.away;
                }
            }
            
            console.log("최종 라인업 데이터:", finalLineups);
            return finalLineups;
            
        } catch (error) {
            console.error("라인업 조회 중 오류 발생:", error);
            
            // 오류 발생 시 matches 컬렉션의 lineups 필드 사용 (폴백)
            return matchDetails.lineups || {
                home: { first: [], second: [], third: [] },
                away: { first: [], second: [], third: [] }
            };
        }
    }

    // 패널 탭 렌더링
    async renderPanelTabs(matchDetails, matchId) {
        const lineups = await this.getMatchLineups(matchDetails);
        
        return `
            <div class="tab-container">
                <div class="tabs">
                    <div class="tab active" data-tab="lineup">라인업</div>
                    <div class="tab" data-tab="chat">채팅</div>
                </div>
                <div class="tab-contents">
                    <div class="tab-content lineup-content active">
                        ${this.renderLineup(lineups)}
                    </div>
                    <div class="tab-content chat-content">
                        ${this.renderChatBox(matchId)}
                    </div>
                </div>
            </div>
        `;
    }

    // HTML 이스케이프
    escapeHtml(text) {
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

    // 라인업 렌더링
    renderLineup(lineups) {
        const players = (list) => {
            return `<div class="players-container">${list.map((n) => `<div class="player">${this.escapeHtml(n)}</div>`).join("")}</div>`;
        };
        
        const sideBlock = (side, data) => {
            return `
                <div class="lineup-team lineup-${side}">
                    <div class="lineup-group"><span class="position-label">3학년</span>${players(data.third || [])}</div>
                    <div class="lineup-group"><span class="position-label">2학년</span>${players(data.second || [])}</div>
                    <div class="lineup-group"><span class="position-label">1학년</span>${players(data.first || [])}</div>
                </div>
            `;
        };
        
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
    renderChatBox(matchId) {
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

    // 채팅 Firestore 경로
    chatCollection(matchId) {
        return window.firebase.collection(this.db, 'match_chats', matchId, 'messages');
    }

    // 패널 탭 설정
    setupPanelTabs(matchId) {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach((tab, index) => {
            tab.onclick = () => {
                // 모든 탭과 콘텐츠에서 active 클래스 제거
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // 클릭된 탭과 해당 콘텐츠에 active 클래스 추가
                tab.classList.add('active');
                contents[index].classList.add('active');
                
                // 채팅 탭이 활성화된 경우 채팅 기능 초기화
                if (tab.dataset.tab === "chat") {
                    this.setupChat(matchId);
                }
            };
        });
        
        // 기본적으로 첫 번째 탭(라인업)을 활성화
        if (tabs.length > 0 && contents.length > 0) {
            tabs[0].classList.add('active');
            contents[0].classList.add('active');
        }
    }

    // 채팅 기능
    setupChat(matchId) {
        const chatBox = document.getElementById('chatMessages');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const loginNotice = document.querySelector('.chat-login-notice');
        chatBox.innerHTML = "";

        if (!this.auth.currentUser) {
            loginNotice.style.display = "block";
            chatForm.style.display = "none";
            chatBox.innerHTML = "<p style='text-align:center;color:#aaa;'>로그인 후 채팅을 이용할 수 있습니다.</p>";
            return;
        } else {
            loginNotice.style.display = "none";
            chatForm.style.display = "flex";
        }

        // 기존 채팅 리스너 해제
        if (this.chatUnsubscribe) {
            this.chatUnsubscribe();
        }

        // Firestore의 onSnapshot 메서드로 실시간 수신
        this.chatUnsubscribe = window.firebase.onSnapshot(
            window.firebase.query(
                this.chatCollection(matchId),
                window.firebase.where('matchId', '==', matchId)
            ),
            (snapshot) => {
                let html = '';
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.uid === this.auth.currentUser.uid;
                    html += `
                        <div class="chat-msg${isMe ? " me" : ""}">
                            <span class="chat-nick">${this.escapeHtml(msg.nickname)}</span>
                            <span class="chat-text">${this.escapeHtml(msg.text)}</span>
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
            const user = this.auth.currentUser;
            if (!user) return;
            
            const profileSnap = await window.firebase.getDoc(window.firebase.doc(this.db, 'profiles', user.uid));
            const nickname = profileSnap.exists() ? profileSnap.data().nickname : user.email.split('@')[0];
            
            await window.firebase.setDoc(
                window.firebase.doc(this.chatCollection(matchId), Date.now().toString() + "_" + user.uid),
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

    // 투표 저장
    async saveVoteToFirestore(matchId, voteType) {
        const user = this.auth.currentUser;
        if (!user) return;

        // votes 저장 (중복방지)
        const voteRef = window.firebase.doc(this.db, 'votes', `${matchId}_${user.uid}`);
        const voteSnap = await window.firebase.getDoc(voteRef);

        if (voteSnap.exists()) return null;

        await window.firebase.setDoc(voteRef, {
            matchId,
            uid: user.uid,
            voteType,
            votedAt: new Date()
        });

        // user_points 자동 생성 (없을 경우)
        const pointRef = window.firebase.doc(this.db, 'user_points', user.uid);
        const pointSnap = await window.firebase.getDoc(pointRef);
        if (!pointSnap.exists()) {
            await window.firebase.setDoc(pointRef, {
                points: 0,
                uid: user.uid
            });
        }

        return true;
    }

    // 투표 통계 가져오기
    async getVotingStatsFromFirestore(matchId) {
        const stats = { homeWin: 0, draw: 0, awayWin: 0, total: 0 };
        const querySnapshot = await window.firebase.getDocs(
            window.firebase.query(
                window.firebase.collection(this.db, 'votes'),
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

    // 사용자 투표 여부 확인
    async hasUserVoted(matchId) {
        const user = this.auth.currentUser;
        if (!user) return false;

        const voteRef = window.firebase.doc(this.db, 'votes', `${matchId}_${user.uid}`);
        const voteSnap = await window.firebase.getDoc(voteRef);
        return voteSnap.exists();
    }

    // 투표 그래프 렌더링
    renderVotingGraph(container, stats) {
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

    // 경기 결과 설정 (관리자용)
    async setMatchResult(matchId, result) {
        const user = this.auth.currentUser;
        if (!user) {
            alert('로그인 필요');
            return;
        }
        
        // 관리자 권한 체크
        const adminDocRef = window.firebase.doc(this.db, "admins", user.email);
        const adminDoc = await window.firebase.getDoc(adminDocRef);
        if (!adminDoc.exists()) {
            alert("관리자만 결과 설정 가능");
            return;
        }

        try {
            // 경기 결과 저장
            const matchRef = window.firebase.doc(this.db, "matches", matchId);
            await window.firebase.setDoc(matchRef, {
                status: "finished",
                adminResult: result
            }, { merge: true });

            // votes 조회
            const votesQuery = window.firebase.query(
                window.firebase.collection(this.db, "votes"),
                window.firebase.where("matchId", "==", matchId)
            );
            const votesSnapshot = await window.firebase.getDocs(votesQuery);
            const winners = [];
            votesSnapshot.forEach(doc => {
                if (doc.data().voteType === result) {
                    winners.push(doc.data().uid);
                }
            });

            console.log("승자 목록:", winners);

            // 각 winner에게 100포인트씩 지급
            for (const uid of winners) {
                await this.updateUserPoints(uid, 100);
            }
            
            alert(`${winners.length}명에게 100포인트 지급 완료!`);
            
            // 패널 새로고침으로 결과 반영
            this.loadMatchDetails(matchId);
            
        } catch (error) {
            console.error("경기 결과 설정 중 오류:", error);
            alert("경기 결과 설정에 실패했습니다.");
        }
    }

    // 사용자 포인트 업데이트
    async updateUserPoints(uid, pointsToAdd) {
        try {
            console.log(`포인트 업데이트 시작 - UID: ${uid}, 추가 포인트: ${pointsToAdd}`);
            
            const pointRef = window.firebase.doc(this.db, "user_points", uid);
            
            // 트랜잭션을 사용해서 더 안정적으로 포인트 업데이트
            const updatedPoints = await window.firebase.runTransaction(async (transaction) => {
                const pointDoc = await transaction.get(pointRef);
                let currentPoints = 0;
                
                if (pointDoc.exists()) {
                    currentPoints = pointDoc.data().points || 0;
                }
                
                const newPoints = currentPoints + pointsToAdd;
                
                transaction.set(pointRef, {
                    points: newPoints,
                    uid: uid,
                    lastUpdated: new Date()
                }, { merge: true });
                
                return newPoints;
            });
            
            console.log(`포인트 업데이트 완료 - 새 포인트: ${updatedPoints}`);
            
            return updatedPoints;
        } catch (error) {
            console.error("포인트 업데이트 실패:", error);
            
            // 트랜잭션이 실패하면 일반적인 업데이트 방식으로 재시도
            try {
                console.log("트랜잭션 실패, 일반 업데이트로 재시도");
                const pointRef = window.firebase.doc(this.db, "user_points", uid);
                const pointDoc = await window.firebase.getDoc(pointRef);
                let currentPoints = 0;
                
                if (pointDoc.exists()) {
                    currentPoints = pointDoc.data().points || 0;
                }
                
                const newPoints = currentPoints + pointsToAdd;
                
                await window.firebase.setDoc(pointRef, {
                    points: newPoints,
                    uid: uid,
                    lastUpdated: new Date()
                }, { merge: true });
                
                console.log(`일반 업데이트 완료 - 새 포인트: ${newPoints}`);
                return newPoints;
            } catch (fallbackError) {
                console.error("일반 업데이트도 실패:", fallbackError);
                throw fallbackError;
            }
        }
    }

    // 패널 닫기
    closePanel() {
        const matchDetailsPanel = document.getElementById("matchDetailsPanel");
        const overlay = document.getElementById("overlay");
        
        if (matchDetailsPanel) matchDetailsPanel.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = "";
        
        // 채팅 리스너 해제
        if (this.chatUnsubscribe) {
            this.chatUnsubscribe();
            this.chatUnsubscribe = null;
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 이전/다음 버튼 이벤트
        const prevBtn = document.getElementById('prevMatch');
        const nextBtn = document.getElementById('nextMatch');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.showPreviousMatch());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.showNextMatch());
        }

        // 경기 정보 클릭 시 상세 모달 열기
        const matchInfo = document.getElementById('matchInfo');
        if (matchInfo) {
            matchInfo.style.cursor = 'pointer';
            matchInfo.addEventListener('click', () => this.openCurrentMatchDetails());
            
            // 호버 효과
            matchInfo.addEventListener('mouseenter', () => {
                matchInfo.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                matchInfo.style.borderRadius = '8px';
            });
            
            matchInfo.addEventListener('mouseleave', () => {
                matchInfo.style.backgroundColor = 'transparent';
            });
        }

        // 패널 닫기 버튼 및 오버레이 이벤트
        const closePanelBtn = document.getElementById("closePanelBtn");
        const overlay = document.getElementById("overlay");

        if (closePanelBtn) {
            closePanelBtn.addEventListener("click", () => this.closePanel());
        }
        
        if (overlay) {
            overlay.addEventListener("click", () => this.closePanel());
        }
    }

    // 초기화
    async initialize() {
        console.log("TodayMatchManager 초기화 시작");
        
        await this.waitForFirebase();
        
        const hasMatches = await this.loadTodayMatches();
        this.updateTodayMatchUI();
        this.setupEventListeners();

        console.log("TodayMatchManager 초기화 완료");
        return hasMatches;
    }

    // 실시간 업데이트를 위한 Firestore 리스너 설정
    setupRealtimeUpdates() {
        if (!this.initialized) return;

        console.log("실시간 업데이트 리스너 설정");

        // matches 컬렉션 변경 감지
        const unsubscribe = window.firebase.onSnapshot(
            window.firebase.collection(this.db, "matches"),
            (snapshot) => {
                console.log("경기 데이터 변경 감지");
                this.loadTodayMatches().then(() => {
                    this.updateTodayMatchUI();
                });
            },
            (error) => {
                console.error("실시간 업데이트 오류:", error);
            }
        );

        // 페이지 언로드 시 리스너 해제
        window.addEventListener('beforeunload', () => {
            if (unsubscribe) unsubscribe();
            if (this.chatUnsubscribe) this.chatUnsubscribe();
        });
    }
}

// 전역 인스턴스 생성
const todayMatchManager = new TodayMatchManager();

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM 로드 완료 - TodayMatchManager 초기화");
    
    // Firebase 초기화 대기 후 실행
    setTimeout(async () => {
        try {
            await todayMatchManager.initialize();
            todayMatchManager.setupRealtimeUpdates();
        } catch (error) {
            console.error("TodayMatchManager 초기화 실패:", error);
        }
    }, 1000);
});

// 전역 함수로 노출 (디버깅용)
window.todayMatchManager = todayMatchManager;
