import backtrader as bt
import pandas as pd
import ccxt
import datetime
import time
import os
import sys

# 수정된 RSI 기반 전략 클래스
class FixedStrategy(bt.Strategy):
    params = (
        ('capital_pct', 0.3),
        ('stop_loss', 1.0),
        ('take_profit', 1.0),
        ('commission', 0.0004),
        ('rsi_buy_threshold', 45),  # RSI 매수 임계값
    )
    
    def __init__(self):
        self.rsi = bt.indicators.RSI(self.data.close)
        self.order = None
        self.buy_price = None
        self.buy_time = None
        self.trades = []
        self.trade_count = 0
        self.current_trade = None
        self.trade_list = []  # 트레이딩뷰 스타일 거래 목록
        self.rsi_values = {}  # 날짜별 RSI 값을 저장하는 딕셔너리
        self.debug_log = []  # 디버깅용 로그
        
    def log(self, txt, dt=None):
        dt = dt or self.datas[0].datetime.datetime(0)
        log_entry = f'{dt.isoformat()} {txt}'
        print(log_entry)
        self.debug_log.append(log_entry)
    
    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return

        if order.status in [order.Completed]:
            if order.isbuy():
                # 매수 주문 체결 시 RSI 값 재확인
                current_rsi = self.rsi[0]
                self.log(f'BUY EXECUTED - Price: {order.executed.price:.5f}, RSI: {current_rsi:.2f}, Cost: {order.executed.value:.2f}, Comm: {order.executed.comm:.2f}')
                
                self.buy_price = order.executed.price
                self.buy_time = self.datas[0].datetime.datetime(0)
                
                # 새 트레이드 정보 생성
                self.current_trade = {
                    'id': len(self.trades) + 1,
                    'type': 'Long',
                    'entry_time': self.buy_time,
                    'entry_price': order.executed.price,
                    'quantity': order.executed.size,
                    'entry_rsi': current_rsi  # 진입 시점의 RSI 값 저장
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
            self.log(f'Order Canceled/Margin/Rejected: {order.status}')
            
        self.order = None
        
    def notify_trade(self, trade):
        if trade.isclosed:
            self.log(f'TRADE CLOSED - P&L: {trade.pnl:.2f}, Comm: {trade.commission:.2f}')
            self.trade_count += 1
    
    def next(self):
        # 현재 날짜와 RSI 값 저장
        current_dt = self.datas[0].datetime.datetime(0)
        current_rsi = self.rsi[0]
        self.rsi_values[current_dt] = current_rsi
        
        # 디버깅 로그 (매 캔들마다 RSI 값 로깅)
        if len(self.debug_log) < 1000:  # 로그 크기 제한
            self.debug_log.append(f"{current_dt.isoformat()} - RSI: {current_rsi:.2f}")
        
        # 주문이 진행 중이면 다음으로 넘어감
        if self.order:
            return
            
        # 포지션이 없는 경우 - 매수 조건 확인
        if not self.position:
            # RSI가 매수 임계값 미만인지 확인
            if current_rsi < self.params.rsi_buy_threshold:
                size = (self.broker.getvalue() * self.params.capital_pct) / self.data.close[0]
                self.log(f'RSI < {self.params.rsi_buy_threshold} ({current_rsi:.2f}) - BUY CREATE {size:.2f} shares')
                self.order = self.buy(size=size)
            else:
                # RSI가 임계값 이상이면 매수하지 않음
                self.log(f'RSI >= {self.params.rsi_buy_threshold} ({current_rsi:.2f}) - NO SIGNAL')
        
        # 포지션이 있는 경우 - 익절/손절 조건 확인
        else:
            # 익절 조건
            if self.data.close[0] >= self.position.price * (1 + self.params.take_profit / 100):
                self.log(f'TAKE PROFIT HIT - SELL CREATE')
                self.order = self.sell(size=self.position.size)
            
            # 손절 조건
            elif self.data.close[0] <= self.position.price * (1 - self.params.stop_loss / 100):
                self.log(f'STOP LOSS HIT - SELL CREATE')
                self.order = self.sell(size=self.position.size)
    
    def stop(self):
        # 트레이딩뷰 스타일 거래 목록 생성
        self.trade_list = []
        cumulative_pnl = 0
        
        for t in self.trades:
            cumulative_pnl += t['pnl']
            
            # 진입 정보
            entry_info = {
                'id': t['id'],
                'action': 'Entry long',
                'signal': 'Long',
                'datetime': t['entry_time'].strftime('%b %d, %Y, %H:%M'),
                'price': t['entry_price'],
                'quantity': t['quantity'],
                'pnl': None,
                'pnl_pct': None,
                'runup': None,
                'drawdown': None,
                'cumulative_pnl': cumulative_pnl - t['pnl'],
                'rsi': t.get('entry_rsi', 'N/A')  # 저장된 RSI 값 사용
            }
            
            # 청산 정보
            exit_info = {
                'id': t['id'],
                'action': 'Exit long',
                'signal': 'Exit',
                'datetime': t['exit_time'].strftime('%b %d, %Y, %H:%M'),
                'price': t['exit_price'],
                'quantity': t['quantity'],
                'pnl': t['pnl'],
                'pnl_pct': t['pnl_pct'],
                'runup': 'n/a',  # 현재 버전에서는 계산되지 않음
                'drawdown': 'n/a',  # 현재 버전에서는 계산되지 않음
                'cumulative_pnl': cumulative_pnl,
                'rsi': None  # 청산 시점에는 RSI 값 불필요
            }
            
            # 거래 목록에 추가
            self.trade_list.append(entry_info)
            self.trade_list.append(exit_info)
        
        # 콘솔에 거래 목록 출력
        print("\n===== TRADE LIST =====")
        print("Trade # | Type      | Signal  | Date/Time             | Price      | Quantity | P&L        | Run-up    | Drawdown  | Cumulative P&L | RSI")
        print("--------|-----------|---------|------------------------|------------|----------|------------|-----------|----------|---------------|-------")
        
        for t in self.trade_list:
            if t['action'] == 'Entry long':
                print(f"{t['id']:<8} | {t['action']:<9} | {t['signal']:<7} | {t['datetime']:<22} | {t['price']:.5f} USD | {t['quantity']:.1f} | {'':14} | {'':9} | {'':9} | {t['cumulative_pnl']:.2f} USD | {t['rsi']}")
            else:  # Exit long
                print(f"{t['id']:<8} | {t['action']:<9} | {t['signal']:<7} | {t['datetime']:<22} | {t['price']:.5f} USD | {t['quantity']:.1f} | {t['pnl']:.2f} USD {t['pnl_pct']:.2f}% | {t['runup']:9} | {t['drawdown']:9} | {t['cumulative_pnl']:.2f} USD | -")
            if t['action'] == 'Exit long':
                print("--------|-----------|---------|------------------------|------------|----------|------------|-----------|----------|---------------|-------")
        
        print(f"\n총 거래 수: {len(self.trades)}")
        print(f"총 수익: {cumulative_pnl:.2f} USD")
        
        # 엑셀 파일로 저장
        try:
            # 데이터프레임 생성
            df = pd.DataFrame(self.trade_list)
            
            # 엑셀 파일로 저장
            excel_path = 'backtest_results_validated.xlsx'
            df.to_excel(excel_path, index=False)
            print(f"\n트레이드 리스트가 엑셀 파일로 저장되었습니다: {excel_path}")
            
            # RSI 값 검증 로그 저장
            with open('rsi_debug_log.txt', 'w') as f:
                for log_entry in self.debug_log:
                    f.write(log_entry + '\n')
            print(f"RSI 디버그 로그가 'rsi_debug_log.txt' 파일로 저장되었습니다.")
            
            # RSI 값이 45 이상인 진입 거래 검증
            rsi_violations = [(t['id'], t['rsi']) for t in df[df['action'] == 'Entry long'].to_dict('records') if t['rsi'] != 'N/A' and float(t['rsi']) >= self.params.rsi_buy_threshold]
            
            if rsi_violations:
                print(f"\n경고: {len(rsi_violations)}개의 거래가 RSI >= {self.params.rsi_buy_threshold} 조건에서 진입했습니다:")
                for trade_id, rsi in rsi_violations:
                    print(f"Trade #{trade_id}: RSI = {rsi}")
            else:
                print(f"\n모든 거래는 RSI < {self.params.rsi_buy_threshold} 조건을 만족합니다.")
            
        except Exception as e:
            print(f"파일 저장 오류: {e}")

# 백테스트 실행을 위한 파라미터 클래스
class RunArgs:
    def __init__(self):
        self.data_path = '../data/BTC-USD_1h.csv'  # 상대 경로 수정
        self.start_date = '2023-12-01'  # 시작 날짜 변경
        self.end_date = '2024-05-30'
        self.amount = 100000.0  # 초기 자본금 
        self.commission = 0.0004  # 0.04% 수수료

# 데이터 가져오기 함수
def fetch_binance_data(start_date, end_date, timeframe='1h', symbol='BTC/USDT'):
    try:
        # Binance API 초기화
        binance = ccxt.binance({
            'enableRateLimit': True,
        })
        
        # 시작 및 종료 날짜를 타임스탬프로 변환
        start_timestamp = int(datetime.datetime.strptime(start_date, '%Y-%m-%d').timestamp() * 1000)
        end_timestamp = int(datetime.datetime.strptime(end_date, '%Y-%m-%d').timestamp() * 1000)
        
        print(f"데이터 불러오기: {symbol}, {timeframe}, {start_date} ~ {end_date}")
        
        # 데이터 저장을 위한 리스트
        all_candles = []
        
        # 최대 1000개의 캔들을 한 번에 가져올 수 있으므로 루프를 통해 가져옴
        current_timestamp = start_timestamp
        while current_timestamp < end_timestamp:
            # OHLCV 데이터 가져오기
            candles = binance.fetch_ohlcv(symbol, timeframe, since=current_timestamp, limit=1000)
            
            if not candles:
                break
                
            all_candles.extend(candles)
            print(f"가져온 캔들 수: {len(candles)}, 시간: {datetime.datetime.fromtimestamp(candles[-1][0]/1000)}")
            
            # 마지막 캔들의 타임스탬프 + 1ms를 다음 시작점으로 설정
            current_timestamp = candles[-1][0] + 1
            
            # API 속도 제한 준수
            time.sleep(binance.rateLimit / 1000)
        
        # 데이터프레임으로 변환
        df = pd.DataFrame(all_candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        
        # 타임스탬프를 datetime으로 변환
        df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        # 필요 없는 타임스탬프 열 제거
        df = df.drop('timestamp', axis=1)
        
        print(f"불러온 총 데이터 수: {len(df)}")
        print(f"시작일: {df['datetime'].iloc[0]}")
        print(f"종료일: {df['datetime'].iloc[-1]}")
        
        return df
    
    except Exception as e:
        print(f"데이터 가져오기 오류: {e}")
        # 오류 발생 시 기존 CSV 파일 사용 시도
        try:
            file_path = '../data/BTC-USD_1h.csv'
            if os.path.exists(file_path):
                print(f"CSV 파일에서 데이터 로드: {file_path}")
                data = pd.read_csv(file_path, parse_dates=['datetime'])
                return data
            else:
                print("데이터를 가져올 수 없습니다.")
                return pd.DataFrame()
        except Exception as backup_error:
            print(f"백업 데이터 로드 오류: {backup_error}")
            return pd.DataFrame()

# 메인 코드
if __name__ == '__main__':
    args = RunArgs()
    
    # 백테스팅 엔진 생성
    cerebro = bt.Cerebro()
    
    # 데이터 로드 - Binance에서 직접 가져오기 또는 CSV 파일에서 로드
    print(f'데이터 기간: {args.start_date} ~ {args.end_date}')
    
    try:
        # Binance API에서 데이터 가져오기
        df = fetch_binance_data(args.start_date, args.end_date, timeframe='1h', symbol='BTC/USDT')
        
        if df.empty:
            print("Binance에서 데이터를 가져오지 못했습니다. CSV 파일을 확인합니다.")
            if not os.path.exists(args.data_path):
                print(f'데이터 파일을 찾을 수 없습니다: {args.data_path}')
                sys.exit(1)
            
            # CSV 파일에서 데이터 로드
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
        else:
            # Binance에서 가져온 데이터 사용
            print("Binance에서 가져온 데이터로 백테스트 실행")
            data = bt.feeds.PandasData(
                dataname=df,
                datetime='datetime',
                open='open',
                high='high',
                low='low',
                close='close',
                volume='volume',
                openinterest=None,
                fromdate=datetime.datetime.strptime(args.start_date, '%Y-%m-%d'),
                todate=datetime.datetime.strptime(args.end_date, '%Y-%m-%d')
            )
    
    except Exception as e:
        print(f"데이터 로드 오류: {e}")
        sys.exit(1)
    
    # 데이터 추가
    cerebro.adddata(data)
    
    # 전략 추가
    cerebro.addstrategy(FixedStrategy)
    
    # 자본금 설정
    cerebro.broker.setcash(args.amount)
    
    # 수수료 설정
    cerebro.broker.setcommission(commission=args.commission)
    
    # 백테스트 실행 전 자본금 출력
    print(f'시작 자본금: {cerebro.broker.getvalue():.2f}')
    
    # 백테스트 실행
    cerebro.run()
    
    # 백테스트 실행 후 자본금 출력
    print(f'최종 자본금: {cerebro.broker.getvalue():.2f}') 