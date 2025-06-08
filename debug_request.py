import requests
import json
import os

# 테스트 전략 코드를 파일에서 로드
with open("test_strategy.py", "r") as f:
    strategy_code = f.read()

# 디버그 모드 활성화
debug_response = requests.post(
    "http://127.0.0.1:8000/backtest/set-debug",
    json={"debug": True}
)
print("Debug Mode Response:", debug_response.status_code, debug_response.text)

# 백테스트 요청
backtest_data = {
    "code": strategy_code,
    "capital": 10000.0,
    "capital_pct": 0.3,
    "stop_loss": 2.0,
    "take_profit": 5.0,
    "start_date": "2024-05-01",
    "end_date": "2024-05-31",
    "commission": 0.0004,
    "timeframe": "1h"
}

try:
    backtest_response = requests.post(
        "http://127.0.0.1:8000/run-backtest",
        json=backtest_data
    )
    
    print("Backtest Response Status:", backtest_response.status_code)
    print("Backtest Response Headers:", backtest_response.headers)
    
    if backtest_response.status_code == 422:
        print("Validation Error:", backtest_response.text)
    else:
        result = backtest_response.json()
        print("Backtest Result:")
        print(f"- Trades: {result.get('num_trades', 'N/A')}")
        print(f"- Win Rate: {result.get('win_rate', 'N/A')}%")
        print(f"- Trade History Length: {len(result.get('trade_history', []))}")
        print(f"- Total Return: {result.get('total_return', 'N/A')}%")
        
        # 거래 기록 확인
        for i, trade in enumerate(result.get('trade_history', [])):
            print(f"Trade #{i+1}:")
            print(f"  Entry: {trade.get('entry_date')} @ {trade.get('entry_price')}")
            print(f"  Exit: {trade.get('exit_date')} @ {trade.get('exit_price')}")
            print(f"  PnL: {trade.get('pnl')} ({trade.get('pnl_pct')}%)")
            print(f"  Size: {trade.get('size')}")
        
        # 결과를 파일에 저장
        with open("detailed_backtest_result.json", "w") as f:
            json.dump(result, f, indent=2)
        
        # 결과 요약을 별도 파일에 저장
        with open("test_backtest_result.json", "w") as f:
            json.dump({
                "num_trades": result.get('num_trades', 0),
                "win_rate": result.get('win_rate', 0),
                "total_return": result.get('total_return', 0)
            }, f, indent=2)
        
except Exception as e:
    print("Error:", e) 