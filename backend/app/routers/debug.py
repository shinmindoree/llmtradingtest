from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.data_service import fetch_btcusdt_ohlcv
import pandas as pd
import io
import sys

router = APIRouter(
    prefix="/debug",
    tags=["debug"],
    responses={404: {"description": "Not found"}},
)

class FetchDataRequest(BaseModel):
    start_date: str
    end_date: str
    max_data_points: int = 5000

@router.post("/fetch-data")
async def fetch_data(req: FetchDataRequest):
    """날짜 범위로 BTCUSDT 데이터를 가져옵니다."""
    try:
        # 로그 캡처를 위한 설정
        logs = []
        log_capture = io.StringIO()
        original_stdout = sys.stdout
        sys.stdout = log_capture
        
        # 데이터 가져오기
        df = fetch_btcusdt_ohlcv(req.start_date, req.end_date, req.max_data_points)
        
        # 로그 캡처 종료
        sys.stdout = original_stdout
        logs = log_capture.getvalue().strip().split('\n')
        logs = [log for log in logs if log]  # 빈 줄 제거
        
        if df.empty:
            raise HTTPException(status_code=404, detail="지정된 기간에 데이터가 없습니다.")
        
        # 응답 데이터 생성
        data = []
        for _, row in df.iterrows():
            data.append({
                "timestamp": row["timestamp"].isoformat() if isinstance(row["timestamp"], pd.Timestamp) else row["timestamp"],
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row["volume"])
            })
        
        # 데이터 포인트 수 확인
        print(f"가져온 데이터 포인트 수: {len(data)}")
        
        # 통계 계산
        summary = {
            "start_date": data[0]["timestamp"] if data else None,
            "end_date": data[-1]["timestamp"] if data else None,
            "num_points": len(data),
            "start_price": data[0]["open"] if data else None,
            "end_price": data[-1]["close"] if data else None
        }
        
        return {
            "success": True,
            "summary": summary,
            "data": data,
            "logs": logs
        }
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"데이터 가져오기 오류: {str(e)}\n{tb}") 