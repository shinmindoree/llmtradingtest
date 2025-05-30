from fastapi import APIRouter, HTTPException, Body
from app.services.data_service import fetch_btcusdt_ohlcv
from typing import List, Dict, Any, Optional
import logging
import io
from contextlib import redirect_stdout

router = APIRouter()

class LogCapture(io.StringIO):
    def __init__(self):
        super().__init__()
        self.logs = []
    
    def write(self, text):
        if text.strip():  # 빈 줄은 무시
            self.logs.append(text.strip())
        return super().write(text)

@router.post("/fetch-data")
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