// stats-leaderboard.js - 득점/도움 순위 자동 전환 시스템

let statsLeaderboardData = {
    goals: [
        { rank: 1, name: "김한솔", value: 15, unit: "골" },
        { rank: 2, name: "문지훈", value: 13, unit: "골" },
        { rank: 3, name: "성준용", value: 10, unit: "골" },
        { rank: 4, name: "조성익", value: 8, unit: "골" },
        { rank: 5, name: "금담인", value: 7, unit: "골" }
    ],
    assists: [
        { rank: 1, name: "정성훈", value: 6, unit: "어시" },
        { rank: 2, name: "김한솔", value: 5, unit: "어시" },
        { rank: 3, name: "금담인", value: 4, unit: "어시" },
        { rank: 4, name: "정관호", value: 4, unit: "어시" },
        { rank: 5, name: "최동명", value: 4, unit: "어시" }
    ]
};

let currentStatsType = 'goals'; // 'goals' 또는 'assists'
let statsAutoSwitchInterval;

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    initializeStatsLeaderboard();
});

// 득점/도움 순위 시스템 초기화
function initializeStatsLeaderboard() {
    console.log("득점/도움 순위 자동 전환 시스템 초기화");
    
    // 초기 렌더링 (득점 순위부터 시작)
    renderStatsLeaderboard();
    
    // 자동 전환 시작 (5초마다)
    startStatsAutoSwitch();
}

// 득점/도움 순위 렌더링
function renderStatsLeaderboard() {
    const statsCard = document.querySelector('.side-lists .list-card:nth-child(2)'); // 두 번째 list-card (득점 순위)
    if (!statsCard) {
        console.error("득점 순위 카드를 찾을 수 없습니다.");
        return;
    }
    
    const titleElement = statsCard.querySelector('.list-title');
    const listItems = statsCard.querySelector('.list-items');
    
    if (!titleElement || !listItems) {
        console.error("제목 또는 리스트 요소를 찾을 수 없습니다.");
        return;
    }
    
    // 현재 표시할 데이터 선택
    const currentData = statsLeaderboardData[currentStatsType];
    const title = currentStatsType === 'goals' ? '득점 순위' : '도움 순위';
    
    // 페이드 아웃 애니메이션 적용
    listItems.classList.add('fade-out');
    
    setTimeout(() => {
        // 제목 업데이트
        titleElement.textContent = title;
        
        // 리스트 내용 업데이트
        listItems.innerHTML = '';
        
        currentData.forEach((player, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item';
            
            // 상위 3위에 특별 클래스 추가
            if (player.rank <= 3) {
                listItem.classList.add('top-rank');
            }
            
            // 왕관 이모지 추가 (1~3위)
            let icon = '';
            if (player.rank === 1) {
                icon = currentStatsType === 'goals' ? '⚽ ' : '🅰️ ';
            } else if (player.rank === 2) {
                icon = '🥈 ';
            } else if (player.rank === 3) {
                icon = '🥉 ';
            }
            
            listItem.innerHTML = `
                <span>${icon}${player.rank}. ${escapeHtml(player.name)}</span>
                <span class="stats-value">${player.value}${player.unit}</span>
            `;
            
            listItems.appendChild(listItem);
        });
        
        // 페이드 아웃 클래스 제거하고 페이드 인 효과 적용
        listItems.classList.remove('fade-out');
        listItems.classList.add('fade-in');
        
        setTimeout(() => {
            listItems.classList.remove('fade-in');
        }, 400);
        
    }, 200); // 페이드 아웃 시간과 동일
}

// 자동 전환 시작
function startStatsAutoSwitch() {
    // 기존 인터벌 정리
    if (statsAutoSwitchInterval) {
        clearInterval(statsAutoSwitchInterval);
    }
    
    // 5초마다 득점/도움 순위 전환
    statsAutoSwitchInterval = setInterval(() => {
        // 현재 타입을 반대로 전환
        currentStatsType = currentStatsType === 'goals' ? 'assists' : 'goals';
        
        console.log(`순위 전환: ${currentStatsType === 'goals' ? '득점' : '도움'} 순위로 변경`);
        
        // 순위 렌더링
        renderStatsLeaderboard();
    }, 5000); // 5초마다 전환
}

// 자동 전환 중지
function stopStatsAutoSwitch() {
    if (statsAutoSwitchInterval) {
        clearInterval(statsAutoSwitchInterval);
        statsAutoSwitchInterval = null;
        console.log("득점/도움 순위 자동 전환 중지");
    }
}

// 득점/도움 데이터 업데이트 함수 (필요시 외부에서 호출)
function updateStatsData(newGoalsData, newAssistsData) {
    if (newGoalsData && Array.isArray(newGoalsData)) {
        statsLeaderboardData.goals = newGoalsData;
    }
    
    if (newAssistsData && Array.isArray(newAssistsData)) {
        statsLeaderboardData.assists = newAssistsData;
    }
    
    // 현재 표시되는 순위 다시 렌더링
    renderStatsLeaderboard();
    
    console.log("득점/도움 데이터가 업데이트되었습니다.");
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 전역 함수로 노출 (필요한 경우)
window.updateStatsData = updateStatsData;
window.stopStatsAutoSwitch = stopStatsAutoSwitch;
window.startStatsAutoSwitch = startStatsAutoSwitch;

// 페이지 언로드 시 인터벌 정리
window.addEventListener('beforeunload', () => {
    stopStatsAutoSwitch();
});

// 특정 순위로 수동 전환하는 함수 (필요시 사용)
function switchToStatsType(type) {
    if (type === 'goals' || type === 'assists') {
        currentStatsType = type;
        renderStatsLeaderboard();
        
        // 자동 전환 재시작
        startStatsAutoSwitch();
    }
}

window.switchToStatsType = switchToStatsType;
