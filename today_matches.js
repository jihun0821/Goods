// 오늘의 경기 관리
class TodayMatchManager {
    constructor() {
        this.todayMatches = [];
        this.currentMatchIndex = 0;
        this.db = null;
        this.auth = null;
        this.initialized = false;
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

    // UI 업데이트
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
        
        if (matchDate) {
            matchDate.textContent = currentMatch.date + (currentMatch.time ? ` ${currentMatch.time}` : '');
        }
        
        if (matchTeams) {
            matchTeams.textContent = `${currentMatch.homeTeam} vs ${currentMatch.awayTeam}`;
        }

        if (matchScore) {
            if (currentMatch.status === 'finished') {
                matchScore.textContent = `${currentMatch.homeScore} - ${currentMatch.awayScore}`;
                matchScore.style.display = 'block';
            } else {
                matchScore.style.display = 'none';
            }
        }

        if (matchStatus) {
            const statusText = {
                'scheduled': '예정',
                'live': '진행중',
                'finished': '종료',
                'cancelled': '취소'
            }[currentMatch.status] || '예정';
            
            matchStatus.textContent = statusText;
            matchStatus.className = `match-status ${currentMatch.status || 'scheduled'}`;
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
            
            // script.js의 openPanel 함수 호출
            if (window.openPanel && typeof window.openPanel === 'function') {
                window.openPanel(currentMatch.id);
            } else if (window.loadMatchDetails && typeof window.loadMatchDetails === 'function') {
                // loadMatchDetails 함수가 있으면 직접 호출
                window.loadMatchDetails(currentMatch.id);
                
                // 패널 열기
                const matchDetailsPanel = document.getElementById("matchDetailsPanel");
                const overlay = document.getElementById("overlay");
                
                if (matchDetailsPanel) {
                    matchDetailsPanel.classList.add("active");
                }
                if (overlay) {
                    overlay.classList.add("active");
                }
                document.body.style.overflow = "hidden";
            }
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