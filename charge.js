// 충전 시스템
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 충전 시스템 클래스
class ChargeSystem {
  constructor() {
    this.pendingCharge = null;
    this.selectedAmount = 0;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.chargeTransferBtn = document.getElementById('charge-transfer-btn');
    this.chargeModal = document.getElementById('chargeModal');
    this.closeChargeModal = document.getElementById('closeChargeModal');
    this.paymentConfirmModal = document.getElementById('paymentConfirmModal');
    
    this.amountButtons = document.querySelectorAll('.amount-button');
    this.customAmountInput = document.getElementById('customAmount');
    this.selectedAmountDisplay = document.getElementById('selectedAmountDisplay');
    this.selectedAmountElement = document.getElementById('selectedAmount');
    this.proceedPaymentBtn = document.getElementById('proceedPayment');
    
    this.paymentSuccessBtn = document.getElementById('paymentSuccess');
    this.paymentFailedBtn = document.getElementById('paymentFailed');
  }

  setupEventListeners() {
    // 충전(이체) 버튼 클릭
    this.chargeTransferBtn?.addEventListener('click', () => this.openChargeModal());
    
    // 모달 닫기
    this.closeChargeModal?.addEventListener('click', () => this.hideModal(this.chargeModal));
    
    // 금액 선택 버튼들
    this.amountButtons?.forEach(button => {
      button.addEventListener('click', () => {
        const amount = parseInt(button.dataset.amount);
        this.selectAmount(amount);
      });
    });
    
    // 직접 입력
    this.customAmountInput?.addEventListener('input', (e) => {
      const amount = parseInt(e.target.value) || 0;
      if (amount >= 1000 && amount <= 50000) {
        this.selectAmount(amount);
        this.amountButtons.forEach(btn => btn.classList.remove('selected'));
      } else if (amount > 0) {
        this.selectedAmountDisplay?.classList.add('hidden');
        this.proceedPaymentBtn?.classList.add('hidden');
      }
    });
    
    // 결제 진행
    this.proceedPaymentBtn?.addEventListener('click', () => this.proceedPayment());
    
    // 결제 완료 확인
    this.paymentSuccessBtn?.addEventListener('click', () => this.handlePaymentSuccess());
    this.paymentFailedBtn?.addEventListener('click', () => this.handlePaymentFailed());
    
    // 모달 외부 클릭
    window.addEventListener('click', (e) => {
      if (e.target === this.chargeModal) {
        this.hideModal(this.chargeModal);
      }
    });
  }

  // 현재 사용자 확인
  getCurrentUser() {
    return window.authFunctions?.getCurrentUser() || null;
  }

  // 알림 표시
  showNotification(message, type = 'info') {
    if (window.authFunctions?.showNotification) {
      window.authFunctions.showNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  // 모달 표시/숨김
  showModal(modal) {
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('block');
      document.body.style.overflow = 'hidden';
    }
  }

  hideModal(modal) {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('block');
      document.body.style.overflow = 'auto';
    }
  }

  // 충전 모달 열기
  async openChargeModal() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      this.showNotification('로그인이 필요합니다.', 'error');
      return;
    }

    // 현재 포인트 확인
    try {
      const currentPoints = await window.authFunctions.getUserPoints(currentUser.uid);
      if (currentPoints >= 50000) {
        this.showNotification('이미 최대 포인트(50,000원)에 도달했습니다.', 'error');
        return;
      }
    } catch (error) {
      console.error('포인트 확인 실패:', error);
    }

    this.showModal(this.chargeModal);
  }

  // 금액 선택
  selectAmount(amount) {
    this.selectedAmount = amount;
    
    // 모든 버튼 선택 해제
    this.amountButtons?.forEach(btn => btn.classList.remove('selected'));
    
    // 해당하는 버튼이 있으면 선택 표시
    const matchingBtn = document.querySelector(`[data-amount="${amount}"]`);
    if (matchingBtn) {
      matchingBtn.classList.add('selected');
      if (this.customAmountInput) {
        this.customAmountInput.value = '';
      }
    }
    
    // 선택된 금액 표시
    if (this.selectedAmountElement) {
      this.selectedAmountElement.textContent = amount.toLocaleString() + '원';
    }
    this.selectedAmountDisplay?.classList.remove('hidden');
    this.proceedPaymentBtn?.classList.remove('hidden');
  }

  // 카카오페이 결제 URL 생성
  generateKakaoPayUrl(amount) {
    // 실제 환경에서는 서버 API를 통해 동적 URL 생성
    // 현재는 기존 URL 사용
    return 'https://qr.kakaopay.com/FKEMLD76B';
  }

  // 결제 진행
  async proceedPayment() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      this.showNotification('로그인이 필요합니다.', 'error');
      return;
    }

    if (this.selectedAmount === 0) {
      this.showNotification('충전할 금액을 선택해주세요.', 'error');
      return;
    }

    if (this.selectedAmount < 1000 || this.selectedAmount > 50000) {
      this.showNotification('충전 금액은 1,000원 이상 50,000원 이하여야 합니다.', 'error');
      return;
    }

    try {
      // 현재 포인트 확인
      const currentPoints = await window.authFunctions.getUserPoints(currentUser.uid);
      
      if (currentPoints + this.selectedAmount > 50000) {
        this.showNotification('포인트 한도 50,000원을 초과할 수 없습니다.', 'error');
        return;
      }

      // 결제 정보 임시 저장
      this.pendingCharge = {
        userId: currentUser.uid,
        amount: this.selectedAmount,
        originalPoints: currentPoints,
        timestamp: Date.now(),
        paymentId: 'charge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      };

      console.log('결제 대기 정보 저장:', this.pendingCharge);

      // 결제 URL로 이동
      const paymentUrl = this.generateKakaoPayUrl(this.selectedAmount);
      
      this.hideModal(this.chargeModal);
      this.showNotification('결제 페이지로 이동합니다...', 'info');
      
      // 새 창에서 결제 페이지 열기
      const paymentWindow = window.open(paymentUrl, '_blank', 'width=500,height=600,scrollbars=yes,resizable=yes');
      
      // 결제 창 모니터링
      this.monitorPaymentWindow(paymentWindow);

    } catch (error) {
      console.error('결제 진행 중 오류:', error);
      this.showNotification('결제 진행 중 오류가 발생했습니다.', 'error');
    }
  }

  // 결제 창 모니터링
  monitorPaymentWindow(paymentWindow) {
    const checkPaymentWindow = setInterval(() => {
      if (paymentWindow.closed) {
        clearInterval(checkPaymentWindow);
        setTimeout(() => {
          this.showModal(this.paymentConfirmModal);
        }, 1000);
      }
    }, 1000);
    
    // 5초 후에도 창이 열려있으면 확인 모달 표시
    setTimeout(() => {
      clearInterval(checkPaymentWindow);
      if (!paymentWindow.closed) {
        paymentWindow.focus();
      }
      this.showModal(this.paymentConfirmModal);
    }, 5000);
  }

  // 결제 성공 처리
  async handlePaymentSuccess() {
    if (!this.pendingCharge) {
      this.showNotification('결제 정보를 찾을 수 없습니다.', 'error');
      this.hideModal(this.paymentConfirmModal);
      return;
    }

    try {
      console.log('결제 성공 처리 시작:', this.pendingCharge);
      
      if (window.authFunctions?.showLoading) {
        window.authFunctions.showLoading(true);
      }

      const { userId, amount, paymentId } = this.pendingCharge;
      
      // hanilpoint 데이터베이스에 포인트 업데이트
      if (!window.firebaseDb) {
        throw new Error('Firebase DB not initialized');
      }

      const userRef = doc(window.firebaseDb, 'hanilpoint', userId);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const currentData = userSnapshot.data();
        const newPoints = (currentData.points || 0) + amount;
        
        // 포인트 업데이트
        await updateDoc(userRef, {
          points: newPoints,
          updatedAt: serverTimestamp(),
          lastChargeId: paymentId,
          lastChargeAmount: amount,
          lastChargeDate: serverTimestamp()
        });
        
        console.log('✅ hanilpoint 포인트 업데이트 완료:', newPoints);
        
        // 충전 내역 로그 저장 (선택사항)
        try {
          const chargeLogRef = doc(window.firebaseDb, 'charge_logs', paymentId);
          await setDoc(chargeLogRef, {
            userId: userId,
            amount: amount,
            previousPoints: currentData.points || 0,
            newPoints: newPoints,
            paymentMethod: 'kakaopay',
            status: 'completed',
            createdAt: serverTimestamp()
          });
          console.log('✅ 충전 내역 로그 저장 완료');
        } catch (logError) {
          console.warn('충전 내역 로그 저장 실패 (포인트 충전은 성공):', logError);
        }
        
        // UI 업데이트
        if (window.authFunctions?.updateUserUI && window.firebaseAuth?.currentUser) {
          await window.authFunctions.updateUserUI(window.firebaseAuth.currentUser);
        }
        
        this.showNotification(`${amount.toLocaleString()}원이 성공적으로 충전되었습니다!`, 'success');
        
      } else {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }
      
    } catch (error) {
      console.error('포인트 충전 실패:', error);
      this.showNotification('포인트 충전 중 오류가 발생했습니다. 고객센터에 문의해주세요.', 'error');
    } finally {
      // 결제 정보 초기화
      this.pendingCharge = null;
      this.hideModal(this.paymentConfirmModal);
      
      if (window.authFunctions?.showLoading) {
        window.authFunctions.showLoading(false);
      }
    }
  }

  // 결제 실패 처리
  handlePaymentFailed() {
    if (this.pendingCharge) {
      console.log('결제 취소, 임시 데이터 삭제:', this.pendingCharge);
      this.pendingCharge = null;
    }
    
    this.hideModal(this.paymentConfirmModal);
    this.showNotification('결제가 취소되었습니다.', 'info');
  }

  // 충전 내역 조회 (관리자용)
  async getChargeHistory(userId, limit = 10) {
    try {
      if (!window.firebaseDb) {
        throw new Error('Firebase DB not initialized');
      }

      const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = 
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      const chargeLogsRef = collection(window.firebaseDb, 'charge_logs');
      const q = query(
        chargeLogsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);
      const chargeHistory = [];

      querySnapshot.forEach((doc) => {
        chargeHistory.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return chargeHistory;
    } catch (error) {
      console.error('충전 내역 조회 실패:', error);
      return [];
    }
  }
}

// DOM이 로드된 후 충전 시스템 초기화
function initializeChargeSystem() {
  // Firebase와 auth.js가 로드될 때까지 대기
  const checkDependencies = () => {
    if (window.firebaseAuth && window.firebaseDb && window.authFunctions) {
      console.log('✅ 충전 시스템 초기화 - Firebase 연동 완료');
      const chargeSystem = new ChargeSystem();
      
      // 전역 접근을 위해 window에 등록
      window.chargeSystem = chargeSystem;
      
      // 디버깅 함수 추가
      window.debugCharge = {
        getPendingCharge: () => chargeSystem.pendingCharge,
        getCurrentPoints: async () => {
          const user = chargeSystem.getCurrentUser();
          if (user) {
            return await window.authFunctions.getUserPoints(user.uid);
          }
          return 0;
        },
        getChargeHistory: async (limit = 5) => {
          const user = chargeSystem.getCurrentUser();
          if (user) {
            return await chargeSystem.getChargeHistory(user.uid, limit);
          }
          return [];
        }
      };
      
      console.log('🔧 디버깅 도구:');
      console.log('- window.debugCharge.getPendingCharge() : 대기 중인 결제 정보');
      console.log('- window.debugCharge.getCurrentPoints() : 현재 포인트 조회');
      console.log('- window.debugCharge.getChargeHistory() : 충전 내역 조회');
      
    } else {
      console.log('⏳ 충전 시스템 초기화 대기 중... (Firebase/auth.js 로딩 중)');
      setTimeout(checkDependencies, 100);
    }
  };
  
  checkDependencies();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChargeSystem);
} else {
  initializeChargeSystem();
}

export { ChargeSystem };
