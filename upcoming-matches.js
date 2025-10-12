// upcoming-matches.js - 예정된 경기 일정을 표시하는 스크립트

(function() {
  console.log('upcoming-matches.js 로드됨');
  
  // Firebase 초기화 대기
  function waitForFirebase() {
    return new Promise((resolve) => {
      if (window.firebase && window.firebaseApp && window.db) {
        console.log('Firebase 준비 완료');
        resolve();
      } else {
        console.log('Firebase 대기 중...');
        const checkInterval = setInterval(() => {
          if (window.firebase && window.firebaseApp && window.db) {
            clearInterval(checkInterval);
            console.log('Firebase 준비 완료');
            resolve();
          }
        }, 100);
      }
    });
  }

  // 날짜를 "M/D" 형식으로 포맷
  function formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }

  // 경기 일정 불러오기
  async function loadUpcomingMatches() {
    try {
      console.log('경기 일정 로딩 시작...');
      await waitForFirebase();
      
      const { collection, query, where, orderBy, limit, getDocs } = window.firebase;
      const db = window.db;
      const matchesRef = collection(db, 'matches');
      
      // 오늘 날짜의 시작 시간
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('오늘 날짜:', today);
      
      // scheduled 상태이고 오늘 이후의 경기를 날짜순으로 5개 가져오기
      const q = query(
        matchesRef,
        where('status', '==', 'scheduled'),
        where('date', '>=', today),
        orderBy('date', 'asc'),
        limit(5)
      );
      
      const querySnapshot = await getDocs(q);
      const matches = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        matches.push({
          id: doc.id,
          ...data,
          date: data.date.toDate() // Timestamp를 Date로 변환
        });
      });
      
      console.log('불러온 경기 수:', matches.length);
      console.log('경기 데이터:', matches);
      
      displayUpcomingMatches(matches);
      
    } catch (error) {
      console.error('경기 일정 로딩 오류:', error);
      displayError();
    }
  }

  // 경기 일정 표시
  function displayUpcomingMatches(matches) {
    // 경기일정 리스트를 찾기 (두 번째 list-card)
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;
    
    // "경기일정" 제목을 가진 카드 찾기
    listCards.forEach(card => {
      const title = card.querySelector('.list-title');
      if (title && title.textContent.trim() === '경기일정') {
        container = card.querySelector('.list-items');
      }
    });
    
    if (!container) {
      console.error('경기일정 컨테이너를 찾을 수 없습니다');
      return;
    }
    
    console.log('경기일정 표시 중...');
    
    if (matches.length === 0) {
      container.innerHTML = `
        <li class="list-item">
          <span style="color: #666;">예정된 경기가 없습니다</span>
        </li>
      `;
      return;
    }
    
    container.innerHTML = matches.map(match => {
      const dateStr = formatDate(match.date);
      const homeTeam = match.homeTeam || '미정';
      const awayTeam = match.awayTeam || '미정';
      
      return `
        <li class="list-item">
          <span>${dateStr}</span>
          <span>${homeTeam} vs ${awayTeam}</span>
        </li>
      `;
    }).join('');
    
    console.log('경기일정 표시 완료');
  }

  // 오류 표시
  function displayError() {
    const listCards = document.querySelectorAll('.side-lists .list-card');
    let container = null;
    
    listCards.forEach(card => {
      const title = card.querySelector('.list-title');
      if (title && title.textContent.trim() === '경기일정') {
        container = card.querySelector('.list-items');
      }
    });
    
    if (!container) return;
    
    container.innerHTML = `
      <li class="list-item">
        <span style="color: #e74c3c;">불러오기 실패</span>
      </li>
    `;
  }

  // 페이지 로드 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUpcomingMatches);
  } else {
    loadUpcomingMatches();
  }

})();
