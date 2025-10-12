// upcoming-matches.js - 예정된 경기 일정을 표시하는 스크립트

(function() {
  console.log('upcoming-matches.js 로드됨');
  
  // Firebase 초기화 대기 (더 긴 타임아웃과 함께)
  function waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5초 대기
      
      const checkInterval = setInterval(() => {
        attempts++;
        console.log(`Firebase 확인 시도 ${attempts}/${maxAttempts}...`);
        console.log('window.firebase:', !!window.firebase);
        console.log('window.db:', !!window.db);
        
        // firebaseApp 체크 제거 - db만 있으면 충분
        if (window.firebase && window.db) {
          clearInterval(checkInterval);
          console.log('Firebase 준비 완료!');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('Firebase 초기화 타임아웃');
          reject(new Error('Firebase 초기화 실패'));
        }
      }, 100);
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
      
      const db = window.db;
      
      // scheduled 상태의 모든 경기 가져오기
      const querySnapshot = await window.firebase.getDocs(
        window.firebase.query(
          window.firebase.collection(db, 'matches'),
          window.firebase.where('status', '==', 'scheduled')
        )
      );
      
      console.log('scheduled 경기 수:', querySnapshot.size);
      
      // 오늘 날짜의 시작 시간
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('오늘 날짜:', today);
      
      const querySnapshot = await window.firebase.getDocs(
        window.firebase.query(
          window.firebase.collection(db, 'matches'),
          window.firebase.where('status', '==', 'scheduled')
        )
      );
      
      console.log('scheduled 경기 수:', querySnapshot.size);
      
      // 오늘 날짜의 시작 시간
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('오늘 날짜:', today);
      
      const matches = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let matchDate = null;
        
        // Firestore Timestamp를 Date로 변환
        if (data.date && data.date.toDate) {
          matchDate = data.date.toDate();
        } else if (data.date instanceof Date) {
          matchDate = data.date;
        } else if (typeof data.date === 'string') {
          matchDate = new Date(data.date);
        }
        
        // 오늘 이후의 경기만 추가
        if (matchDate && matchDate >= today) {
          matches.push({
            id: doc.id,
            ...data,
            date: matchDate
          });
        }
      });
      
      // 날짜순으로 정렬
      matches.sort((a, b) => a.date - b.date);
      
      // 최대 5개만 선택
      const upcomingMatches = matches.slice(0, 5);
      
      console.log('불러온 경기 수:', upcomingMatches.length);
      console.log('경기 데이터:', upcomingMatches);
      
      displayUpcomingMatches(upcomingMatches);
      
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

  // 페이지 로드 시 실행 (더 늦게 실행)
  window.addEventListener('load', () => {
    console.log('window.load 이벤트 발생');
    // 페이지 완전히 로드된 후 추가 지연
    setTimeout(() => {
      console.log('경기 일정 로딩 시도...');
      loadUpcomingMatches();
    }, 1000);
  });

})();
