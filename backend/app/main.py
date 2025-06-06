from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
from app.routers import backtest, strategy
from app.services.data_service import fetch_btcusdt_ohlcv
import pandas as pd
import backtrader as bt
import re

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# CORS 설정 (프론트엔드와 연동을 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포시에는 도메인 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(backtest.router)
app.include_router(strategy.router)

class StrategyRequest(BaseModel):
    strategy: str
    capital: float
    capital_pct: float
    stopLoss: float
    takeProfit: float
    startDate: str
    endDate: str
    commission: float

class RunBacktestRequest(BaseModel):
    code: str
    capital: float
    capital_pct: float
    stop_loss: float
    take_profit: float
    start_date: str
    end_date: str
    commission: float

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/generate-code")
async def generate_code(req: StrategyRequest):
    prompt = f'''
아래의 트레이딩 전략을 backtrader의 Strategy 클래스로 변환해줘.

**아래 조건을 반드시 지켜야 한다:**
- 오직 Strategy 클래스 코드만 반환(코드 외 텍스트, 마크다운, 주석, 빈 줄 절대 금지)
- 반드시 파이썬 문법에 맞는 들여쓰기와 줄바꿈을 포함해서 반환할 것
- class 이름은 반드시 Strategy로 할 것
- __init__의 params에 capital_pct, stop_loss, take_profit, commission 등 필수 파라미터가 반드시 포함되어야 함(누락 시 에러)
- main block, if __name__ == ... 등 금지
- 코드 앞뒤에 불필요한 공백, 설명, 마크다운, 주석, 텍스트 절대 금지

아래는 예시 포맷이다(이 포맷을 반드시 따를 것):

class Strategy(bt.Strategy):
    params = (
        ('capital_pct', 0.3),
        ('stop_loss', 2.0),
        ('take_profit', 5.0),
        ('commission', 0.0004),
    )

    def __init__(self):
        self.rsi = bt.indicators.RSI(self.data.close)

    def next(self):
        if not self.position:
            if self.rsi[0] < 30:
                size = (self.broker.getvalue() * self.params.capital_pct) / self.data.close[0]
                self.buy(size=size)
        else:
            if self.data.close[0] >= self.position.price * (1 + self.params.take_profit / 100):
                self.sell()
            elif self.data.close[0] <= self.position.price * (1 - self.params.stop_loss / 100):
                self.sell()

전략 설명: {req.strategy}
자본금: {req.capital}
투입비율: {req.capital_pct}
Stop Loss: {req.stopLoss}
Take Profit: {req.takeProfit}
백테스트 기간: {req.startDate} ~ {req.endDate}
수수료율: {req.commission}
'''
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "당신은 트레이딩 전략을 backtrader 코드로 변환해주는 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1200,
            temperature=0.2,
        )
        code = response.choices[0].message.content
        # 코드 앞뒤 마크다운/빈줄/공백/텍스트 제거 (초보자도 디버깅 쉽게)
        code = re.sub(r"^```[a-zA-Z]*\s*|```$", "", code).strip()
        # 들여쓰기/줄바꿈 검증
        if code.count('\n') < 5 or '    ' not in code:
            raise HTTPException(status_code=400, detail="LLM이 반환한 코드에 들여쓰기/줄바꿈이 부족합니다.\n프롬프트를 더 강화하거나, 입력값을 다시 확인하세요.\n(코드 예시: class, def, if 등은 반드시 줄바꿈과 들여쓰기를 포함해야 함)")
        if not code.startswith("class"):
            raise HTTPException(status_code=400, detail="LLM이 반환한 코드가 Strategy 클래스로 시작하지 않습니다.\n코드 앞뒤에 텍스트/마크다운/빈줄이 남아있거나, 코드 생성이 잘못된 경우입니다. 프롬프트를 더 강화하거나, 입력값을 다시 확인하세요.")
        return {"code": code}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{tb}")

@app.post("/run-backtest")
async def run_backtest(req: RunBacktestRequest):
    # 1. OHLCV 데이터 로드
    df = fetch_btcusdt_ohlcv(req.start_date, req.end_date)
    if df.empty:
        raise HTTPException(status_code=404, detail="데이터 없음")
    df["datetime"] = pd.to_datetime(df["timestamp"])
    df.set_index("datetime", inplace=True)
    # 2. LLM이 반환한 Strategy 코드 등록
    local_vars = {}
    try:
        exec(req.code, globals(), local_vars)
        StrategyClass = None
        for v in local_vars.values():
            if isinstance(v, type) and issubclass(v, bt.Strategy):
                StrategyClass = v
                break
        if StrategyClass is None:
            raise Exception("Strategy 클래스가 올바르게 정의되지 않음")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"코드 실행 오류: {e}")
    # 3. 백테스트 실행
    cerebro = bt.Cerebro()
    data = bt.feeds.PandasData(dataname=df)
    cerebro.adddata(data)
    cerebro.addstrategy(
        StrategyClass,
        capital_pct=req.capital_pct,
        stop_loss=req.stop_loss,
        take_profit=req.take_profit,
        commission=req.commission
    )
    cerebro.broker.setcash(req.capital)
    cerebro.broker.setcommission(commission=req.commission)
    cerebro.addanalyzer(bt.analyzers.DrawDown, _name='drawdown')
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trades')
    cerebro.addanalyzer(bt.analyzers.TimeReturn, _name='timereturn')
    results = cerebro.run()
    strat = results[0]
    # 4. 결과 추출
    timereturn = strat.analyzers.timereturn.get_analysis()
    equity_curve = [req.capital]
    labels = []
    for i, (dt, ret) in enumerate(timereturn.items()):
        equity_curve.append(equity_curve[-1] * (1 + ret))
        labels.append(str(dt.date()))
    equity_curve = equity_curve[1:]
    drawdown = strat.analyzers.drawdown.get_analysis()
    trades = strat.analyzers.trades.get_analysis()
    # 항상 숫자만 반환 (dict일 경우 total, 아닐 경우 0)
    max_drawdown = 0.0
    if isinstance(drawdown, dict):
        max_drawdown = float(drawdown.get('max', {}).get('drawdown', 0))
    else:
        try:
            max_drawdown = float(drawdown)
        except Exception:
            max_drawdown = 0.0
    num_trades = 0
    if isinstance(trades, dict):
        total = trades.get('total', 0)
        if isinstance(total, (int, float)):
            num_trades = int(total)
        elif isinstance(total, dict):
            # backtrader 1.9+에서는 trades['total']['total'] 구조
            num_trades = int(total.get('total', 0))
        else:
            num_trades = 0
    else:
        try:
            num_trades = int(trades)
        except Exception:
            num_trades = 0
    total_return = round((equity_curve[-1] - req.capital) / req.capital * 100, 2)
    return {
        "equity_curve": {
            "labels": labels,
            "values": equity_curve
        },
        "total_return": total_return,
        "max_drawdown": max_drawdown,
        "num_trades": num_trades
    } 
    
    


