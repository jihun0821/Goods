// upcoming-matches.js - 예정된 경기 일정을 표시하는 스크립트

(function() {
  const { getFirestore, collection, query, where, getDocs, orderBy, limit } = window.firebase;

  // Firebase 초기화 대기
  function waitForFirebase() {
    return new Promise((resolve) => {
      if (window.firebaseApp && window.db) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (window.firebaseApp && window.db) {
            clearInterval(checkInterval);
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
      await waitForFirebase();
      
      const db = window.db;
      const matchesRef = collection(db, 'matches');
      
      // 오늘 날짜의 시작 시간
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
      
      displayUpcomingMatches(matches);
      
    } catch (error) {
      console.error('경기 일정 로딩 오류:', error);
      displayError();
    }
  }

  // 경기 일정 표시
  function displayUpcomingMatches(matches) {
    const container = document.querySelector('.list-card .list-items');
    
    if (!container) return;
    
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
  }

  // 오류 표시
  function displayError() {
    const container = document.querySelector('.list-card .list-items');
    
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