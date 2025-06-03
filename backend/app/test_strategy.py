import backtrader as bt
import pandas as pd
import datetime

class RSIStrategy(bt.Strategy):
    params = (
        ('capital_pct', 0.3),
        ('stop_loss', 1.0),
        ('take_profit', 1.0),
        ('commission', 0.0004),
        ('rsi_buy_threshold', 30),
        ('rsi_sell_threshold', 70),
    )

    def __init__(self):
        self.dataclose = self.datas[0].close
        self.rsi = bt.indicators.RSI(self.dataclose, period=14)
        self.order = None
        self.trades = []
        self.trade_list = []
        self.entry_conditions = []
        self.order_price = None
        self.order_size = None
        self.order_time = None
        self.entry_rsi = None
        self.trade_id = 0

    def log(self, txt, dt=None):
        dt = dt or self.datas[0].datetime.datetime(0)
        print(f'{dt.isoformat()} {txt}')

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return

        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(f'BUY 체결: 가격 {order.executed.price:.2f}, 비용 {order.executed.value:.2f}, 수수료 {order.executed.comm:.2f}')
                # RSI 값 저장
                self.entry_rsi = self.rsi[0]
            else:
                self.log(f'SELL 체결: 가격 {order.executed.price:.2f}, 비용 {order.executed.value:.2f}, 수수료 {order.executed.comm:.2f}')
                
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log('주문 취소/거부됨')

        self.order = None

    def notify_trade(self, trade):
        if not trade.isclosed:
            return

        self.trade_id += 1
        trade_info = {
            'id': self.trade_id,
            'type': 'long',
            'entry_time': self.order_time,
            'exit_time': self.datas[0].datetime.datetime(0),
            'entry_price': trade.price,
            'exit_price': trade.pnl / trade.size + trade.price if trade.size != 0 else 0,
            'quantity': trade.size,
            'pnl': trade.pnl,
            'pnl_pct': 100 * trade.pnl / trade.price / trade.size if trade.size != 0 and trade.price != 0 else 0,
            'entry_rsi': self.entry_rsi
        }
        
        self.trades.append(trade_info)
        self.log(f'TRADE CLOSED - P&L: {trade.pnl:.2f}')

    def next(self):
        # 현재 상태 로깅
        self.log(f'Close: {self.dataclose[0]:.2f}, RSI: {self.rsi[0]:.2f}')
        
        # 현재 RSI 값
        current_rsi = self.rsi[0]
        current_dt = self.datas[0].datetime.datetime(0)
        
        # 포지션이 없을 때 매수 조건: RSI가 지정된 임계값 이하
        if not self.position:
            if current_rsi < self.params.rsi_buy_threshold:
                # 자본금의 일정 비율만 사용
                cash = self.broker.getcash() * self.params.capital_pct
                # 가격을 고려하여 수량 계산
                size = cash / self.dataclose[0]
                
                # 진입 조건 저장
                entry_condition = {
                    'datetime': current_dt,
                    'price': self.dataclose[0],
                    'indicator': 'RSI',
                    'value': current_rsi,
                    'threshold': self.params.rsi_buy_threshold,
                    'condition': f'RSI({current_rsi:.2f}) < {self.params.rsi_buy_threshold}'
                }
                self.entry_conditions.append(entry_condition)
                
                self.log(f'RSI: {current_rsi:.2f} - 매수 신호 - BUY CREATE {size} @ {self.dataclose[0]}')
                self.order = self.buy(size=size)
                
                # 현재 주문 정보 저장
                self.order_price = self.dataclose[0]
                self.order_size = size
                self.order_time = current_dt
        
        # 포지션이 있을 때 매도 조건
        elif self.position:
            current_price = self.dataclose[0]
            entry_price = self.position.price
            
            # 이익 실현 가격 및 손절가 계산
            take_profit_price = entry_price * (1 + self.params.take_profit / 100)
            stop_loss_price = entry_price * (1 - self.params.stop_loss / 100)
            
            # RSI가 지정된 매도 임계값 이상이면 매도
            if current_rsi > self.params.rsi_sell_threshold:
                self.log(f'RSI: {current_rsi:.2f} - 매도 신호 - SELL CREATE')
                self.order = self.sell(size=self.position.size)
            # 이익 실현 수준에 도달
            elif current_price >= take_profit_price:
                self.log(f'TAKE PROFIT HIT - SELL CREATE')
                self.order = self.sell(size=self.position.size)
            # 손절 수준에 도달
            elif current_price <= stop_loss_price:
                self.log(f'STOP LOSS HIT - SELL CREATE')
                self.order = self.sell(size=self.position.size)

    def stop(self):
        # 트레이딩뷰 스타일 거래 목록 생성
        self.trade_list = []
        cumulative_pnl = 0
        
        print(f"거래 목록 생성 시작 - 거래 수: {len(self.trades)}")
        
        for t in self.trades:
            cumulative_pnl += t['pnl']
            
            # 진입 정보
            entry_info = {
                'id': t['id'],
                'action': 'Entry long',
                'signal': 'Long',
                'datetime': t['entry_time'].strftime('%b %d, %Y, %H:%M'),
                'price': float(t['entry_price']),
                'quantity': float(t['quantity']),
                'pnl': None,
                'pnl_pct': None,
                'runup': None,
                'drawdown': None,
                'cumulative_pnl': float(cumulative_pnl - t['pnl']),
                'rsi': t.get('entry_rsi', 'N/A')  # RSI 값 추가
            }
            
            # 청산 정보
            exit_info = {
                'id': t['id'],
                'action': 'Exit long',
                'signal': 'Exit',
                'datetime': t['exit_time'].strftime('%b %d, %Y, %H:%M'),
                'price': float(t['exit_price']),
                'quantity': float(t['quantity']),
                'pnl': float(t['pnl']),
                'pnl_pct': float(t['pnl_pct']),
                'runup': 'n/a',  # 현재 버전에서는 계산되지 않음
                'drawdown': 'n/a',  # 현재 버전에서는 계산되지 않음
                'cumulative_pnl': float(cumulative_pnl),
                'rsi': None  # 청산 시점에는 RSI 값 불필요
            }
            
            # 거래 목록에 추가
            self.trade_list.append(entry_info)
            self.trade_list.append(exit_info)
        
        print(f"거래 목록 생성 완료 - 항목 수: {len(self.trade_list)}")
        
        # 거래 목록과 트레이드 객체 모두 반환
        return {
            'trades': self.trades,
            'trade_list': self.trade_list,
            'trade_count': len(self.trades),
            'total_pnl': cumulative_pnl
        } 