from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import openai
import os
import re
from dotenv import load_dotenv
from app.services.data_service import fetch_btcusdt_ohlcv
import pandas as pd
import backtrader as bt
import logging
import io
from contextlib import redirect_stdout

# 루트 디렉토리의 .env 파일 경로로 수정
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
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

# 모델 정의
class StrategyRequest(BaseModel):
    strategy: str = Field(..., description="트레이딩 전략 설명")
    capital: float = Field(..., gt=0, description="초기 자본금")
    capital_pct: float = Field(..., gt=0, le=1, description="투입 비율 (0~1)")
    stopLoss: float = Field(..., gt=0, description="손절 비율 (%)")
    takeProfit: float = Field(..., gt=0, description="익절 비율 (%)")
    startDate: str = Field(..., description="백테스트 시작일")
    endDate: str = Field(..., description="백테스트 종료일")
    commission: float = Field(..., ge=0, description="수수료율")
    timeframe: str = "15m"  # 기본값 15분

class RunBacktestRequest(BaseModel):
    code: str
    capital: float
    capital_pct: float
    stop_loss: float
    take_profit: float
    start_date: str
    end_date: str
    commission: float
    timeframe: str = "15m"  # 기본값 15분

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 백테스트 라우터 엔드포인트
@app.get("/backtest/ping", tags=["Backtest"])
def backtest_ping():
    return {"message": "backtest router OK"}

@app.get("/backtest/ohlcv", tags=["Backtest"])
def get_ohlcv(
    start_date: str = Query(..., description="조회 시작일 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="조회 종료일 (YYYY-MM-DD)")
):
    try:
        df = fetch_btcusdt_ohlcv(start_date, end_date)
        if df.empty:
            return {"message": "데이터 없음", "row_count": 0}
        return {
            "row_count": len(df),
            "columns": df.columns.tolist(),
            "sample": df.head(5).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 전략 라우터 엔드포인트
@app.get("/strategy/ping", tags=["Strategy"])
def strategy_ping():
    return {"message": "strategy router OK"}

# 디버그 라우터 클래스와 엔드포인트
class LogCapture(io.StringIO):
    def __init__(self):
        super().__init__()
        self.logs = []
    
    def write(self, text):
        if text.strip():  # 빈 줄은 무시
            self.logs.append(text.strip())
        return super().write(text)

@app.post("/debug/fetch-data", tags=["Debug"])
async def fetch_data(
    request: Dict[str, Any] = Body(...)
):
    start_date = request.get("start_date")
    end_date = request.get("end_date")
    max_data_points = request.get("max_data_points", 10000)
    timeframe = request.get("timeframe", "15m")  # 기본값은 15분
    
    # 디버깅용 로그 추가
    print(f"DEBUG: 요청 받은 파라미터 - start_date: {start_date}, end_date: {end_date}, max_data_points: {max_data_points}, timeframe: {timeframe}")
    
    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="시작일과 종료일이 필요합니다.")
    
    try:
        # 로그 캡처 시작
        log_capture = LogCapture()
        with redirect_stdout(log_capture):
            df = fetch_btcusdt_ohlcv(
                start_date=start_date, 
                end_date=end_date, 
                max_data_points=max_data_points,
                timeframe=timeframe  # 시간 간격 파라미터 추가
            )
        
        data = df.to_dict('records')
        print(f"가져온 데이터 포인트 수: {len(data)}")
        
        return {
            "data": data,
            "logs": log_capture.logs
        }
    except Exception as e:
        logging.exception("데이터 가져오기 오류")
        raise HTTPException(status_code=500, detail=f"데이터 가져오기 오류: {str(e)}")

# 메인 엔드포인트
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
시간 간격: {req.timeframe}
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
    print(f"백테스트 요청: {req.start_date} ~ {req.end_date}, 시간 간격: {req.timeframe}")
    df = fetch_btcusdt_ohlcv(req.start_date, req.end_date, timeframe=req.timeframe)
    if df.empty:
        raise HTTPException(status_code=404, detail="데이터 없음")
    
    print(f"데이터 로드 완료: {len(df)}개 레코드")
    print(f"데이터 범위: {df['timestamp'].min()} ~ {df['timestamp'].max()}")
    
    df["datetime"] = pd.to_datetime(df["timestamp"])
    df.set_index("datetime", inplace=True)
    
    # 2. LLM이 반환한 Strategy 코드 등록
    local_vars = {}
    try:
        print("Strategy 코드 실행 중...")
        exec(req.code, globals(), local_vars)
        StrategyClass = None
        for v in local_vars.values():
            if isinstance(v, type) and issubclass(v, bt.Strategy):
                StrategyClass = v
                break
        if StrategyClass is None:
            raise Exception("Strategy 클래스가 올바르게 정의되지 않음")
        print("Strategy 클래스 로드 성공")
    except Exception as e:
        print(f"코드 실행 오류: {e}")
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
    
    print("백테스트 실행 중...")
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
    
    # 디버깅을 위한 거래 분석 데이터 출력
    print(f"거래 분석 데이터: {trades}")
    
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
    win_rate = 0
    profit_loss_ratio = 0
    
    # 실제 거래 내역 추출
    trade_history = []
    
    if isinstance(trades, dict):
        # 거래 수 계산
        total = trades.get('total', 0)
        if isinstance(total, (int, float)):
            num_trades = int(total)
        elif isinstance(total, dict):
            # backtrader 1.9+에서는 trades['total']['total'] 구조
            num_trades = int(total.get('total', 0))
        else:
            num_trades = 0
        
        # 승률 계산
        if num_trades > 0 and 'won' in trades:
            won = trades.get('won', {})
            if isinstance(won, dict):
                won_count = won.get('total', 0)
            else:
                won_count = won
            
            win_rate = round((won_count / num_trades) * 100, 2)
        
        # 수익/손실 비율 계산
        if 'pnl' in trades:
            pnl = trades.get('pnl', {})
            gross_profit = pnl.get('gross', {}).get('won', 0)
            gross_loss = abs(pnl.get('gross', {}).get('lost', 0))
            
            if gross_loss > 0:
                profit_loss_ratio = round(gross_profit / gross_loss, 2)
        
        # 거래 내역 추출 시도
        closed_trades = trades.get('closed', [])
        if isinstance(closed_trades, list) and closed_trades:
            for trade in closed_trades:
                trade_history.append({
                    'entry_date': str(trade.get('entry_date', '')),
                    'exit_date': str(trade.get('exit_date', '')),
                    'entry_price': trade.get('price_in', 0),
                    'exit_price': trade.get('price_out', 0),
                    'pnl': trade.get('pnl', 0),
                    'pnl_pct': trade.get('pnl_pct', 0)
                })
    else:
        try:
            num_trades = int(trades)
        except Exception:
            num_trades = 0
    
    print(f"백테스트 완료: {num_trades}개 거래, 승률: {win_rate}%, 손익비: {profit_loss_ratio}")
    
    total_return = round((equity_curve[-1] - req.capital) / req.capital * 100, 2)
    
    return {
        "equity_curve": {
            "labels": labels,
            "values": equity_curve
        },
        "total_return": total_return,
        "max_drawdown": max_drawdown,
        "num_trades": num_trades,
        "win_rate": win_rate,
        "profit_loss_ratio": profit_loss_ratio,
        "trade_history": trade_history
    } 
    
    


