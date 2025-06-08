import backtrader as bt
import pandas as pd
import datetime
import os

# 데이터 파일 경로
data_dir = 'data'
data_files = [f for f in os.listdir(data_dir) if f.startswith('btcusdt_1h_') and f.endswith('.csv')]
csv_path = os.path.join(data_dir, sorted(data_files)[-1]) if data_files else None

if not csv_path:
    print("데이터 파일을 찾을 수 없습니다.")
    exit(1)

class SimpleStrategy(bt.Strategy):
    params = (
        ('rsi_period', 14),
        ('rsi_lower', 30),
        ('rsi_upper', 70),
    )
    
    def __init__(self):
        self.rsi = bt.indicators.RSI(self.data.close, period=self.params.rsi_period)
        self.trade_count = 0
        self.order = None  # 주문 상태 추적
    
    def notify_order(self, order):
        # 주문 상태 업데이트
        if order.status in [order.Submitted, order.Accepted]:
            return
            
        if order.status in [order.Completed]:
            if order.isbuy():
                print(f"매수 완료: 날짜={self.data.datetime.date(0)}, 가격={order.executed.price:.2f}, 수량={order.executed.size:.6f}")
            else:
                print(f"매도 완료: 날짜={self.data.datetime.date(0)}, 가격={order.executed.price:.2f}, 수량={order.executed.size:.6f}")
        
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            print(f"주문 취소됨: {order.status}")
            
        self.order = None  # 주문 처리 완료
    
    def next(self):
        # 주문 처리 중인 경우 새 주문 방지
        if self.order:
            return
            
        # 매수 조건
        if not self.position and self.rsi < self.params.rsi_lower:
            print(f"매수 신호: 날짜={self.data.datetime.date(0)}, 가격={self.data.close[0]:.2f}, RSI={self.rsi[0]:.2f}")
            self.order = self.buy(size=0.001)
            self.trade_count += 1
        
        # 매도 조건 - 포지션이 있고 주문이 없을 때만 실행
        elif self.position and self.rsi > self.params.rsi_upper:
            print(f"매도 신호: 날짜={self.data.datetime.date(0)}, 가격={self.data.close[0]:.2f}, RSI={self.rsi[0]:.2f}")
            self.order = self.sell()
    
    def stop(self):
        print(f"총 거래 횟수: {self.trade_count}")

# CSV 데이터 로드
print(f"데이터 파일: {csv_path}")
df = pd.read_csv(csv_path)
df["datetime"] = pd.to_datetime(df["timestamp"])
df.set_index("datetime", inplace=True)

# Backtrader용 데이터피드 생성
data = bt.feeds.PandasData(
    dataname=df,
    datetime=None,  # 이미 인덱스로 설정됨
    open=1,        # df의 'open' 컬럼 인덱스
    high=2,        # df의 'high' 컬럼 인덱스
    low=3,         # df의 'low' 컬럼 인덱스
    close=4,       # df의 'close' 컬럼 인덱스
    volume=5,      # df의 'volume' 컬럼 인덱스
    openinterest=-1  # 사용 안함
)

# Cerebro 엔진 설정
cerebro = bt.Cerebro()
cerebro.adddata(data)
cerebro.addstrategy(SimpleStrategy)
cerebro.broker.setcash(10000.0)
cerebro.broker.setcommission(commission=0.0004)

# 백테스트 결과 분석기 추가
cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trades')
cerebro.addanalyzer(bt.analyzers.Returns, _name='returns')

# 시작 자본 출력
print(f"시작 자본금: {cerebro.broker.getvalue():.2f}")

# 백테스트 실행
results = cerebro.run()
strat = results[0]

# 결과 분석
trades = strat.analyzers.trades.get_analysis()
returns = strat.analyzers.returns.get_analysis()

# 거래 결과 출력
print(f"최종 자본금: {cerebro.broker.getvalue():.2f}")
print(f"총 수익률: {(cerebro.broker.getvalue() / 10000.0 - 1) * 100:.2f}%")

if hasattr(trades, 'total') and hasattr(trades.total, 'closed'):
    print(f"총 거래 수: {trades.total.closed}")
    if hasattr(trades, 'won') and hasattr(trades.won, 'total'):
        print(f"승리 거래: {trades.won.total}")
        print(f"승률: {trades.won.total / trades.total.closed * 100:.2f}%")
    
    if hasattr(trades, 'pnl') and hasattr(trades.pnl, 'net'):
        print(f"총 PnL: {trades.pnl.net.total:.2f}")
else:
    print("거래가 없습니다.")

# 그래프 생성 (선택 사항)
# cerebro.plot(style='candle') 