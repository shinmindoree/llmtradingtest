from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class StrategyRequest(BaseModel):
    strategy: str = Field(..., description="트레이딩 전략 설명")
    capital: float = Field(..., gt=0, description="초기 자본금")
    capital_pct: float = Field(..., gt=0, le=1, description="투입 비율 (0~1)")
    stopLoss: float = Field(..., gt=0, description="손절 비율 (%)")
    takeProfit: float = Field(..., gt=0, description="익절 비율 (%)")
    startDate: datetime = Field(..., description="백테스트 시작일")
    endDate: datetime = Field(..., description="백테스트 종료일")
    commission: float = Field(..., ge=0, description="수수료율")

class BacktestResult(BaseModel):
    initial_capital: float
    final_capital: float
    returns: float
    total_trades: int
    won_trades: int
    lost_trades: int
    max_drawdown: float
