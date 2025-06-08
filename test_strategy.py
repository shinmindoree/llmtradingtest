import backtrader as bt

class Strategy(bt.Strategy):
    params = (
        ('capital_pct', 0.3),
        ('stop_loss', 2.0),
        ('take_profit', 5.0),
        ('commission', 0.0004),
    )

    def __init__(self):
        self.rsi = bt.indicators.RSI(self.data.close)
        self.order = None
        self.price_entry = None
        self.size_value = None
        self.rsi_values = []  # RSI 값 추적
        self.trades_log = []  # 거래 기록 로그

    def log(self, txt, dt=None):
        dt = dt or self.data.datetime.date(0)
        print(f'[{dt}] {txt}')

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return
        
        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(f'BUY 체결: 가격: {order.executed.price:.2f}, 수량: {order.executed.size:.6f}, 비용: {order.executed.value:.2f}, 수수료: {order.executed.comm:.2f}')
                self.price_entry = order.executed.price
                self.size_value = order.executed.size
            else:
                self.log(f'SELL 체결: 가격: {order.executed.price:.2f}, 수량: {order.executed.size:.6f}, 비용: {order.executed.value:.2f}, 수수료: {order.executed.comm:.2f}')
                
                # 매도 시 거래 결과 로깅
                if self.price_entry is not None:
                    pnl = (order.executed.price - self.price_entry) * order.executed.size
                    pnl_pct = (order.executed.price / self.price_entry - 1) * 100
                    self.log(f'거래 결과: PnL: {pnl:.2f}, PnL(%): {pnl_pct:.2f}%')
                
                self.price_entry = None
                self.size_value = None
        
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log(f'주문 취소/거부됨: {order.status}')
        
        self.order = None

    def notify_trade(self, trade):
        if trade.isclosed:
            # 거래 종료 시 로깅
            self.log(f'거래 종료: 진입가: {trade.price:.2f}, 종료가: {trade.pnl / trade.size + trade.price:.2f}, 수익: {trade.pnl:.2f}, 수익률: {100 * trade.pnl / (trade.price * trade.size):.2f}%')
            
            # 거래 기록에 추가
            trade_info = {
                'entry_date': self.data.datetime.datetime(0),
                'entry_price': trade.price,
                'exit_price': trade.pnl / trade.size + trade.price,
                'size': trade.size,
                'pnl': trade.pnl,
                'pnl_pct': 100 * trade.pnl / (trade.price * trade.size)
            }
            self.trades_log.append(trade_info)

    def next(self):
        # RSI 값 저장
        self.rsi_values.append(self.rsi[0])
        
        # 매 10번째 캔들마다 현재 상태 출력
        if len(self.rsi_values) % 10 == 0:
            self.log(f'현재 RSI: {self.rsi[0]:.2f}, 포지션: {"있음" if self.position else "없음"}, 주문: {"있음" if self.order else "없음"}')
            if self.position:
                self.log(f'현재 포지션 정보: 크기: {self.position.size:.6f}, 가격: {self.position.price:.2f}, 현재가: {self.data.close[0]:.2f}, 손익: {(self.data.close[0]/self.position.price-1)*100:.2f}%')
    
        # 현재 주문이 진행 중인 경우 새로운 거래 금지
        if self.order:
            return
            
        # 포지션이 없는 경우 - 매수 조건 테스트
        if not self.position:
            # RSI 30 이하 확인
            if self.rsi[0] <= 30:
                # 계산된 현금의 일부를 사용
                value = self.broker.getvalue() * self.params.capital_pct
                
                # 거래 크기(size) 계산 - 최소 0.001 이상
                size = value / self.data.close[0]
                size = max(0.001, size)  # 최소 0.001 이상 보장
                size = round(size, 6)  # 소수점 6자리로 반올림
                
                # 거래 크기 디버깅 출력
                self.log(f'매수 신호: RSI = {self.rsi[0]:.2f}, 가격 = {self.data.close[0]:.2f}, 크기 = {size:.6f}, 총가치 = {value:.2f}')
                
                # 매수 주문 실행
                self.order = self.buy(size=size)
                self.log(f'매수 주문 생성됨: {self.order}')
        
        # 포지션이 있는 경우 - 매도 조건 테스트
        else:
            # 매도 조건 1: RSI 70 이상
            if self.rsi[0] >= 70:
                self.log(f'매도 신호(RSI): RSI = {self.rsi[0]:.2f}, 가격 = {self.data.close[0]:.2f}, 진입가 = {self.price_entry:.2f if self.price_entry else 0:.2f}')
                self.order = self.sell()
                self.log(f'매도 주문 생성됨(RSI): {self.order}')
            
            # 매도 조건 2: 익절
            elif self.data.close[0] >= self.position.price * (1 + self.params.take_profit / 100):
                self.log(f'매도 신호(익절): 현재가 = {self.data.close[0]:.2f}, 진입가 = {self.position.price:.2f}, 익절 = {self.params.take_profit:.2f}%')
                self.order = self.sell()
                self.log(f'매도 주문 생성됨(익절): {self.order}')
            
            # 매도 조건 3: 손절
            elif self.data.close[0] <= self.position.price * (1 - self.params.stop_loss / 100):
                self.log(f'매도 신호(손절): 현재가 = {self.data.close[0]:.2f}, 진입가 = {self.position.price:.2f}, 손절 = {self.params.stop_loss:.2f}%')
                self.order = self.sell()
                self.log(f'매도 주문 생성됨(손절): {self.order}')
    
    def stop(self):
        # 백테스트 종료 시 RSI 통계 출력
        import numpy as np
        rsi_array = np.array(self.rsi_values)
        self.log(f'백테스트 종료: RSI 통계 - 평균: {np.mean(rsi_array):.2f}, 최소: {np.min(rsi_array):.2f}, 최대: {np.max(rsi_array):.2f}')
        self.log(f'RSI 30 이하 데이터 수: {np.sum(rsi_array <= 30)}')
        self.log(f'RSI 70 이상 데이터 수: {np.sum(rsi_array >= 70)}')
        
        # 거래 로그 요약 출력
        if self.trades_log:
            self.log(f'총 거래 수: {len(self.trades_log)}')
            
            total_pnl = sum(trade['pnl'] for trade in self.trades_log)
            win_count = sum(1 for trade in self.trades_log if trade['pnl'] > 0)
            
            self.log(f'승률: {win_count/len(self.trades_log)*100:.2f}%')
            self.log(f'총 수익: {total_pnl:.2f}')
            
            # 거래별 상세 내역
            for i, trade in enumerate(self.trades_log):
                self.log(f'거래 #{i+1}: 진입가: {trade["entry_price"]:.2f}, 종료가: {trade["exit_price"]:.2f}, PnL: {trade["pnl"]:.2f}, PnL(%): {trade["pnl_pct"]:.2f}%')
