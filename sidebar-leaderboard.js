// sidebar-leaderboard.js - 사이드바 포인트 순위 업데이트
let sidebarLeaderboardData = [];

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
        
        console.log("사이드바 리더보드 데이터 로드 완료:", sidebarLeaderboardData.length, "명");
        
        // 사이드바 리더보드 렌더링
        renderSidebarLeaderboard();
        
    } catch (error) {
        console.error("사이드바 리더보드 로드 실패:", error);
        // 에러 발생 시 기본 상태 유지
        renderEmptySidebarLeaderboard();
    }
}

// 사이드바 리더보드 렌더링 (상위 5명만)
function renderSidebarLeaderboard() {
    const listItems = document.querySelector('.list-card .list-items');
    if (!listItems) return;
    
    // 상위 5명만 선택
    const topUsers = sidebarLeaderboardData.slice(0, 5);
    
    if (topUsers.length === 0) {
        renderEmptySidebarLeaderboard();
        return;
    }
    
    // 기존 내용 제거
    listItems.innerHTML = '';
    
    topUsers.forEach((user, index) => {
        const rank = index + 1;
        const listItem = document.createElement('li');
        listItem.className = 'list-item';
        
        // 상위 3위에 특별 클래스 추가 (옵션)
        if (rank <= 3) {
            listItem.classList.add('top-rank');
        }
        
        listItem.innerHTML = `
            <span>${rank}. ${escapeHtml(user.nickname)}</span>
            <span>${user.points}P</span>
        `;
        
        listItems.appendChild(listItem);
    });
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
    loadSidebarLeaderboard();
}

// 전역 함수로 노출
window.refreshSidebarLeaderboard = refreshSidebarLeaderboard;

// 사이드바 리더보드 자동 새로고침 (5분마다)
setInterval(() => {
    console.log("자동 사이드바 리더보드 새로고침");
    loadSidebarLeaderboard();
}, 5 * 60 * 1000); // 5분