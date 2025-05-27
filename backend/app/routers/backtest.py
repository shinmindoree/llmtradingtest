from fastapi import APIRouter, HTTPException, Query
from app.services.data_service import fetch_btcusdt_ohlcv

router = APIRouter(prefix="/backtest", tags=["Backtest"])

@router.get("/ping")
def ping():
    return {"message": "backtest router OK"}

@router.get("/ohlcv")
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
