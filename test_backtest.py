import requests
import json

# 테스트용 더 간단한 전략 (가장 기본적인 이동평균선 전략)
test_strategy_code = """
class Strategy(bt.Strategy):
    params = (
        ('capital_pct', 0.3),
        ('stop_loss', 2.0),
        ('take_profit', 5.0),
        ('commission', 0.0004),
    )

    def __init__(self):
        self.sma = bt.indicators.SimpleMovingAverage(self.data.close, period=10)

    def next(self):
        # 매우 단순한 전략: 현재 가격이 이동평균보다 높으면 매수, 낮으면 매도
        if not self.position:
            if self.data.close[0] > self.sma[0]:
                size = (self.broker.getvalue() * self.params.capital_pct) / self.data.close[0]
                self.buy(size=size)
        elif self.data.close[0] < self.sma[0]:
            self.sell()
"""

# 백테스트 요청 데이터 (더 짧은 기간으로 테스트)
backtest_data = {
    "code": test_strategy_code,
    "capital": 10000,
    "capital_pct": 0.3,
    "stop_loss": 2.0,
    "take_profit": 5.0,
    "start_date": "2023-04-01",  # 더 최근 날짜
    "end_date": "2023-04-15",    # 2주 정도의 짧은 기간
    "commission": 0.0004,
    "timeframe": "1h"            # 더 짧은 타임프레임
}

# API 호출
try:
    print("백테스트 요청 전송 중...")
    response = requests.post(
        "http://localhost:8000/run-backtest", 
        json=backtest_data,
        headers={"Content-Type": "application/json"}
    )
    
    # 응답 확인
    print(f"응답 상태 코드: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("백테스트 성공!")
        print(f"총 거래 횟수: {result.get('num_trades', 0)}")
        print(f"수익률: {result.get('return_pct', 0):.2f}%")
        print(f"승률: {result.get('win_rate', 0):.2f}%")
        print(f"거래 내역 수: {len(result.get('trade_history', []))}")
    else:
        print(f"백테스트 실패: {response.status_code}")
        try:
            error_data = response.json()
            print(f"오류 상세 정보: {json.dumps(error_data, indent=2)}")
        except:
            print(f"응답 텍스트: {response.text}")
except Exception as e:
    print(f"오류 발생: {e}")
    import traceback
    traceback.print_exc() 