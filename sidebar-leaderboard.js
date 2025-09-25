// sidebar-leaderboard.js - 사이드바 포인트 순위 업데이트 (페이지네이션 추가)
let sidebarLeaderboardData = [];
let currentPage = 0;
let totalPages = 1;
let autoSwitchInterval;

// Firebase 초기화 대기
window.addEventListener('DOMContentLoaded', () => {
    // Firebase 초기화 대기
    const waitForFirebase = () => {
        if (window.db && window.auth && window.firebase) {
            console.log("sidebar-leaderboard.js - Firebase 변수들이 준비됨");
            
            // 인증 상태와 관계없이 사이드바 리더보드 로드
            loadSidebarLeaderboard();
            
        } else {
            console.log("sidebar-leaderboard.js - Firebase 변수들 대기 중...");
            setTimeout(waitForFirebase, 100);
        }
    };
    
    waitForFirebase();
});

// 사이드바 리더보드 데이터 로드
async function loadSidebarLeaderboard() {
    console.log("사이드바 리더보드 로드 시작");
    
    try {
        // script.js에서 선언된 전역 변수 사용
        if (!window.db) {
            console.error("Firebase db가 초기화되지 않았습니다.");
            return;
        }
        
        // 1. 모든 사용자 프로필 가져오기
        const profilesSnapshot = await window.firebase.getDocs(window.firebase.collection(window.db, "profiles"));
        const userProfiles = {};
        
        profilesSnapshot.forEach(doc => {
            const data = doc.data();
            userProfiles[doc.id] = {
                uid: doc.id,
                nickname: data.nickname || doc.id
            };
        });
        
        // 2. 사용자별 포인트 가져오기
        const pointsSnapshot = await window.firebase.getDocs(window.firebase.collection(window.db, "user_points"));
        const userPoints = {};
        
        pointsSnapshot.forEach(doc => {
            userPoints[doc.id] = doc.data().points || 0;
        });
        
        // 3. 완료된 경기 목록 가져오기 (관리자가 결과를 설정한 경기만)
        const matchesSnapshot = await window.firebase.getDocs(window.firebase.collection(window.db, "matches"));
        const finishedMatches = {};
        
        matchesSnapshot.forEach(doc => {
            const matchData = doc.data();
            if (matchData.status === "finished" && matchData.adminResult) {
                finishedMatches[doc.id] = matchData.adminResult;
            }
        });
        
        // 4. 모든 투표 데이터 가져오기
        const votesSnapshot = await window.firebase.getDocs(window.firebase.collection(window.db, "votes"));
        const userStats = {};
        
        // 사용자별 통계 초기화
        Object.keys(userProfiles).forEach(uid => {
            userStats[uid] = {
                totalVotes: 0,
                correctVotes: 0,
                participatedMatches: new Set()
            };
        });
        
        // 투표 데이터 처리
        votesSnapshot.forEach(doc => {
            const voteData = doc.data();
            const { uid, matchId, voteType } = voteData;
            
            // 해당 경기가 완료되었고 관리자가 결과를 설정한 경우만 처리
            if (finishedMatches[matchId] && userStats[uid]) {
                userStats[uid].participatedMatches.add(matchId);
                
                // 정답 여부 확인
                if (finishedMatches[matchId] === voteType) {
                    userStats[uid].correctVotes++;
                }
            }
        });
        
        // 참여횟수 계산
        Object.keys(userStats).forEach(uid => {
            userStats[uid].totalVotes = userStats[uid].participatedMatches.size;
        });
        
        // 5. 사이드바 리더보드 데이터 생성
        sidebarLeaderboardData = Object.keys(userProfiles)
            .map(uid => {
                const profile = userProfiles[uid];
                const stats = userStats[uid];
                const points = userPoints[uid] || 0;
                const accuracy = stats.totalVotes > 0 ? 
                    Math.round((stats.correctVotes / stats.totalVotes) * 100) : 0;
                
                return {
                    uid,
                    nickname: profile.nickname,
                    points: points,
                    totalVotes: stats.totalVotes,
                    correctVotes: stats.correctVotes,
                    accuracy: accuracy
                };
            })
            .filter(user => user.totalVotes > 0) // 참여한 적이 있는 사용자만 포함
            .sort((a, b) => {
                // 1순위: 포인트 (내림차순)
                if (b.points !== a.points) {
                    return b.points - a.points;
                }
                // 2순위: 정확도 (내림차순)
                if (b.accuracy !== a.accuracy) {
                    return b.accuracy - a.accuracy;
                }
                // 3순위: 참여횟수 (내림차순)
                return b.totalVotes - a.totalVotes;
            });
        
        // 총 페이지 수 계산 (한 페이지당 5명)
        totalPages = Math.ceil(sidebarLeaderboardData.length / 5);
        currentPage = 0;
        
        console.log("사이드바 리더보드 데이터 로드 완료:", sidebarLeaderboardData.length, "명, 총", totalPages, "페이지");
        
        // 사이드바 리더보드 렌더링 시작
        renderSidebarLeaderboard();
        startAutoSwitch();
        
    } catch (error) {
        console.error("사이드바 리더보드 로드 실패:", error);
        // 에러 발생 시 기본 상태 유지
        renderEmptySidebarLeaderboard();
    }
}

// 사이드바 리더보드 렌더링 (현재 페이지)
function renderSidebarLeaderboard() {
    const listItems = document.querySelector('.list-card .list-items');
    if (!listItems || sidebarLeaderboardData.length === 0) {
        renderEmptySidebarLeaderboard();
        return;
    }
    
    // 현재 페이지에 해당하는 사용자들 선택 (5명씩)
    const startIndex = currentPage * 5;
    const endIndex = Math.min(startIndex + 5, sidebarLeaderboardData.length);
    const pageUsers = sidebarLeaderboardData.slice(startIndex, endIndex);
    
    // 애니메이션을 위해 기존 내용에 fade-out 클래스 추가
    listItems.classList.add('fade-out');
    
    setTimeout(() => {
        // 기존 내용 제거
        listItems.innerHTML = '';
        
        pageUsers.forEach((user, index) => {
            const rank = startIndex + index + 1;
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            
            // 상위 3위에 특별 클래스 추가
            if (rank <= 3) {
                listItem.classList.add('top-rank');
            }
            
            listItem.innerHTML = `
                <span>${rank}. ${escapeHtml(user.nickname)}</span>
                <span>${user.points}P</span>
            `;
            
            listItems.appendChild(listItem);
        });
        
        // 빈 슬롯 채우기 (항상 5개 항목 유지)
        for (let i = pageUsers.length; i < 5; i++) {
            const listItem = document.createElement('li');
            listItem.className = 'list-item empty-slot';
            listItem.innerHTML = `
                <span style="color: #ccc;">-</span>
                <span style="color: #ccc;">-</span>
            `;
            listItems.appendChild(listItem);
        }
        
        // 페이지 인디케이터 업데이트
        updatePageIndicator();
        
        // fade-out 클래스 제거하고 fade-in 효과 적용
        listItems.classList.remove('fade-out');
        listItems.classList.add('fade-in');
        
        setTimeout(() => {
            listItems.classList.remove('fade-in');
        }, 300);
    }, 150);
}

// 페이지 인디케이터 업데이트
function updatePageIndicator() {
    const listCard = document.querySelector('.list-card');
    let indicator = listCard.querySelector('.page-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'page-indicator';
        listCard.appendChild(indicator);
    }
    
    if (totalPages <= 1) {
        indicator.style.display = 'none';
        return;
    }
    
    indicator.style.display = 'flex';
    indicator.innerHTML = '';
    
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('span');
        dot.className = 'page-dot';
        if (i === currentPage) {
            dot.classList.add('active');
        }
        indicator.appendChild(dot);
    }
}

// 자동 페이지 전환 시작
function startAutoSwitch() {
    // 기존 인터벌 정리
    if (autoSwitchInterval) {
        clearInterval(autoSwitchInterval);
    }
    
    // 페이지가 2개 이상일 때만 자동 전환
    if (totalPages > 1) {
        autoSwitchInterval = setInterval(() => {
            currentPage = (currentPage + 1) % totalPages;
            renderSidebarLeaderboard();
        }, 5000); // 5초마다 전환
    }
}

// 자동 페이지 전환 중지
function stopAutoSwitch() {
    if (autoSwitchInterval) {
        clearInterval(autoSwitchInterval);
        autoSwitchInterval = null;
    }
}

// 데이터가 없거나 에러 시 빈 상태 렌더링
function renderEmptySidebarLeaderboard() {
    const listItems = document.querySelector('.list-card .list-items');
    if (!listItems) return;
    
    listItems.innerHTML = `
        <li class="list-item">
            <span style="color: #666; font-style: italic;">데이터를 불러오는 중...</span>
            <span>-</span>
        </li>
    `;
    
    // 페이지 인디케이터 숨기기
    const indicator = document.querySelector('.page-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 사이드바 리더보드 새로고침 함수
function refreshSidebarLeaderboard() {
    console.log("사이드바 리더보드 새로고침 요청");
    stopAutoSwitch();
    loadSidebarLeaderboard();
}

// 전역 함수로 노출
window.refreshSidebarLeaderboard = refreshSidebarLeaderboard;

// 사이드바 리더보드 자동 새로고침 (5분마다)
setInterval(() => {
    console.log("자동 사이드바 리더보드 새로고침");
    loadSidebarLeaderboard();
}, 5 * 60 * 1000); // 5분

// 페이지 언로드 시 인터벌 정리
window.addEventListener('beforeunload', () => {
    stopAutoSwitch();
});
