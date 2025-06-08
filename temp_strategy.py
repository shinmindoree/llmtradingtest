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

    def log(self, txt, dt=None):
        dt = dt or self.data.datetime.date(0)
        print(f'{dt} {txt}')

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return
        
        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(f'BUY 체결: 가격: {order.executed.price:.2f}, 수량: {order.executed.size:.6f}, 비용: {order.executed.value:.2f}, 수수료: {order.executed.comm:.2f}')
                self.price_entry = order.executed.price
            else:
                self.log(f'SELL 체결: 가격: {order.executed.price:.2f}, 수량: {order.executed.size:.6f}, 비용: {order.executed.value:.2f}, 수수료: {order.executed.comm:.2f}')
                self.price_entry = None
        
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log(f'주문 취소/거부됨: {order.status}')
        
        self.order = None

    def next(self):
        if self.order:
            return
            
        if not self.position:
            if self.rsi[0] < 30:
                value = self.broker.getvalue() * self.params.capital_pct
                size = value / self.data.close[0]
                size = max(0.001, size)
                size = round(size, 6)
                self.log(f'매수 신호: RSI = {self.rsi[0]:.2f}, 가격 = {self.data.close[0]:.2f}, 크기 = {size:.6f}, 총가치 = {value:.2f}')
                self.size_value = size
                self.order = self.buy(size=size)
        else:
            if self.rsi[0] >= 70:
                self.log(f'매도 신호(RSI): RSI = {self.rsi[0]:.2f}, 가격 = {self.data.close[0]:.2f}, 진입가 = {self.price_entry:.2f if self.price_entry else 0:.2f}')
                self.order = self.sell()
            elif self.data.close[0] >= self.position.price * (1 + self.params.take_profit / 100):
                self.log(f'매도 신호(익절): 현재가 = {self.data.close[0]:.2f}, 진입가 = {self.position.price:.2f}, 익절 = {self.params.take_profit:.2f}%')
                self.order = self.sell()
            elif self.data.close[0] <= self.position.price * (1 - self.params.stop_loss / 100):
                self.log(f'매도 신호(손절): 현재가 = {self.data.close[0]:.2f}, 진입가 = {self.position.price:.2f}, 손절 = {self.params.stop_loss:.2f}%')
                self.order = self.sell()
