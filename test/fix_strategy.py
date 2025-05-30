import backtrader as bt
import pandas as pd
import ccxt
import datetime
import time
import os
import sys

# 수정된 전략 클래스 - 더 작은 진입/청산 조건으로 많은 거래가 발생하도록 함
class FixedStrategy(bt.Strategy):
    params = (
        ('capital_pct', 0.3),
        ('stop_loss', 0.5),  # 0.5% - 스탑로스 더 작게 설정
        ('take_profit', 0.5),  # 0.5% - 익절 더 작게 설정
        ('commission', 0.0004),
        ('rsi_buy_threshold', 48),  # RSI 매수 기준 (45에서 48로 변경)
        ('rsi_sell_threshold', 52),  # RSI 매도 기준 (55에서 52로 변경)
    )
    
    def __init__(self):
        self.rsi = bt.indicators.RSI(self.data.close, period=14)
        self.order = None
        self.buy_price = None
        self.buy_time = None
        self.trades = []
        self.trade_count = 0
        self.current_trade = None
        
    def log(self, txt, dt=None):
        dt = dt or self.datas[0].datetime.datetime(0)
        print(f'{dt.isoformat()} {txt}')
    
    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return

        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(f'BUY EXECUTED - Price: {order.executed.price:.5f}, Cost: {order.executed.value:.2f}, Comm: {order.executed.comm:.2f}')
                self.buy_price = order.executed.price
                self.buy_time = self.datas[0].datetime.datetime(0)
                # 새 트레이드 정보 생성
                self.current_trade = {
                    'id': len(self.trades) + 1,
                    'type': 'Long',
                    'entry_time': self.datas[0].datetime.datetime(0),
                    'entry_price': order.executed.price,
                    'quantity': order.executed.size,
                }
                
            else:  # 매도 주문 체결
                self.log(f'SELL EXECUTED - Price: {order.executed.price:.5f}, Cost: {order.executed.value:.2f}, Comm: {order.executed.comm:.2f}')
                if self.current_trade is not None:
                    # 트레이드 정보 완성
                    self.current_trade['exit_time'] = self.datas[0].datetime.datetime(0)
                    self.current_trade['exit_price'] = order.executed.price
                    
                    # P&L 계산
                    entry_price = self.current_trade['entry_price']
                    exit_price = order.executed.price
                    quantity = self.current_trade['quantity']
                    
                    pnl = (exit_price - entry_price) * quantity
                    pnl_pct = ((exit_price / entry_price) - 1) * 100
                    
                    self.current_trade['pnl'] = pnl
                    self.current_trade['pnl_pct'] = pnl_pct
                    
                    # 완성된 트레이드 정보 저장
                    self.trades.append(self.current_trade)
                    self.current_trade = None
                
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log('Order Canceled/Margin/Rejected')
            
        self.order = None
        
    def notify_trade(self, trade):
        if trade.isclosed:
            self.log(f'TRADE CLOSED - P&L: {trade.pnl:.2f}, Comm: {trade.commission:.2f}')
            self.trade_count += 1
    
    def next(self):
        # 현재 상태 로깅
        if len(self) % 1000 == 0:
            self.log(f'Close: {self.data.close[0]:.5f}, RSI: {self.rsi[0]:.2f}')
        
        # 주문이 진행 중이면 다음으로 넘어감
        if self.order:
            return
            
        # 포지션이 없는 경우 - 매수 조건 확인
        if not self.position:
            # RSI가 매수 기준보다 낮으면 매수
            if self.rsi[0] <= self.params.rsi_buy_threshold:
                size = (self.broker.getvalue() * self.params.capital_pct) / self.data.close[0]
                self.log(f'RSI <= {self.params.rsi_buy_threshold} ({self.rsi[0]:.2f}) - BUY CREATE {size:.2f} shares')
                self.order = self.buy(size=size)
        
        # 포지션이 있는 경우 - 익절/손절 조건 확인
        else:
            current_price = self.data.close[0]
            
            # 손절 및 익절 계산
            take_profit_price = self.buy_price * (1 + self.params.take_profit / 100)
            stop_loss_price = self.buy_price * (1 - self.params.stop_loss / 100)
            
            self.log(f'Current: {current_price:.5f}, Entry: {self.buy_price:.5f}, TP: {take_profit_price:.5f}, SL: {stop_loss_price:.5f}')
            
            # 익절 조건
            if current_price >= take_profit_price:
                self.log(f'TAKE PROFIT HIT - SELL CREATE')
                self.order = self.sell(size=self.position.size)
            
            # 손절 조건
            elif current_price <= stop_loss_price:
                self.log(f'STOP LOSS HIT - SELL CREATE')
                self.order = self.sell(size=self.position.size)
    
    def stop(self):
        # 트레이드 리스트 출력
        print("\n===== TRADE LIST =====")
        print("Trade # | Type      | Signal  | Date/Time             | Price      | Quantity | P&L        | Run-up    | Drawdown  | Cumulative P&L")
        print("--------|-----------|---------|------------------------|------------|----------|------------|-----------|----------|---------------")
        
        cumulative_pnl = 0
        for t in self.trades:
            cumulative_pnl += t['pnl']
            entry_row = f"{t['id']:<8} | {'Entry long':<9} | {'Long':<7} | {t['entry_time'].strftime('%b %d, %Y, %H:%M'):<22} | {t['entry_price']:.5f} USD | {t['quantity']:.1f} | {'':14} | {'':9} | {'':9} | {cumulative_pnl - t['pnl']:.2f} USD"
            exit_row = f"{t['id']:<8} | {'Exit long':<9} | {'Exit':<7} | {t['exit_time'].strftime('%b %d, %Y, %H:%M'):<22} | {t['exit_price']:.5f} USD | {t['quantity']:.1f} | {t['pnl']:.2f} USD {t['pnl_pct']:.2f}% | {'n/a':9} | {'n/a':9} | {cumulative_pnl:.2f} USD"
            
            print(entry_row)
            print(exit_row)
            print("--------|-----------|---------|------------------------|------------|----------|------------|-----------|----------|---------------")
        
        print(f"\n총 거래 수: {len(self.trades)}")
        print(f"총 수익: {cumulative_pnl:.2f} USD")

# 백테스트 실행을 위한 파라미터 클래스
class RunArgs:
    def __init__(self):
        self.data_path = '../data/BTC-USD_1h.csv'  # 상대 경로 수정
        self.start_date = '2023-12-01'  # 시작 날짜 변경
        self.end_date = '2024-05-30'
        self.amount = 100000.0  # 초기 자본금 
        self.commission = 0.0004  # 0.04% 수수료

# 데이터 가져오기 함수
def fetch_binance_data(start_date, end_date, timeframe):
    try:
        # 파일 경로 설정
        file_path = 'data/BTC-USD_1h.csv'
        
        # 이미 파일이 있는지 확인
        if os.path.exists(file_path):
            # 데이터 로드
            data = pd.read_csv(file_path, parse_dates=['datetime'])
            return data
        else:
            print(f"Data file not found: {file_path}")
            return pd.DataFrame()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()

# 백테스팅 실행 함수
def run_backtest(params, data):
    cerebro = bt.Cerebro()
    
    # 데이터피드 추가
    data_feed = bt.feeds.PandasData(
        dataname=data,
        datetime='datetime',
        open='open',
        high='high',
        low='low',
        close='close',
        volume='volume',
        openinterest=None
    )
    cerebro.adddata(data_feed)
    
    # 전략 추가 (파라미터 지정)
    cerebro.addstrategy(params.strategy_class, **params.params)
    
    # 자본금 및 수수료 설정
    cerebro.broker.setcash(100000.0)
    cerebro.broker.setcommission(commission=0.0004)  # 0.04% 수수료
    
    # 백테스트 실행
    print(f"===== 전략: {params.name} =====")
    print(f"파라미터: {params.params}")
    print(f"시작 자본금: {cerebro.broker.getvalue():.2f}")
    cerebro.run()
    print(f"최종 자본금: {cerebro.broker.getvalue():.2f}")

# 메인 코드
if __name__ == '__main__':
    args = RunArgs()
    
    # 백테스팅 엔진 생성
    cerebro = bt.Cerebro()
    
    # 데이터 로드
    print(f'Data path: {args.data_path}')
    if not os.path.exists(args.data_path):
        print(f'데이터 파일을 찾을 수 없습니다: {args.data_path}')
        sys.exit(1)
        
    # 데이터 로드
    data = bt.feeds.GenericCSVData(
        dataname=args.data_path,
        dtformat='%Y-%m-%d %H:%M:%S',
        datetime=0,
        open=1,
        high=2,
        low=3,
        close=4,
        volume=5,
        openinterest=-1,
        fromdate=datetime.datetime.strptime(args.start_date, '%Y-%m-%d'),
        todate=datetime.datetime.strptime(args.end_date, '%Y-%m-%d')
    )
    
    # 데이터 추가
    cerebro.adddata(data)
    
    # 전략 추가
    cerebro.addstrategy(FixedStrategy)
    
    # 자본금 설정
    cerebro.broker.setcash(args.amount)
    
    # 수수료 설정
    cerebro.broker.setcommission(commission=args.commission)
    
    # 백테스트 실행 전 자본금 출력
    print(f'Starting Portfolio Value: {cerebro.broker.getvalue():.2f}')
    
    # 백테스트 실행
    cerebro.run()
    
    # 백테스트 실행 후 자본금 출력
    print(f'Final Portfolio Value: {cerebro.broker.getvalue():.2f}') 