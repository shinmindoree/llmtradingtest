from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
from app.routers import backtest, strategy

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
- 진입 시 size는 (self.broker.getvalue() * {req.capital_pct}) / self.data.close[0]로 계산
- Stop Loss, Take Profit, 수수료율, 자본금 등은 파라미터로 전달
- 불필요한 설명 없이 코드만 반환해줘.

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
        return {"code": code}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{tb}")

@app.post("/run-backtest")
async def run_backtest(req: RunBacktestRequest):
    # TODO: 실제 백테스트 실행 로직 구현
    # 현재는 더미 결과 반환
    return {
        "equity_curve": {
            "labels": [req.start_date, req.end_date],
            "values": [req.capital, req.capital * 1.05]
        },
        "total_return": 5.0,
        "max_drawdown": -2.0,
        "num_trades": 3
    } 