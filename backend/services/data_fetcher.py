from dotenv import load_dotenv
import os
import ccxt
import pandas as pd
import time
from supabase import create_client, Client

# 환경변수 로드
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_binance_futures_ohlcv(symbol="BTC/USDT:USDT", timeframe="15m", limit=10000):
    exchange = ccxt.binance({'options': {'defaultType': 'future'}})
    all_ohlcv = []
    now = exchange.milliseconds()
    while len(all_ohlcv) < limit:
        fetch_limit = min(1500, limit - len(all_ohlcv))
        ohlcv = exchange.fetch_ohlcv(symbol, timeframe=timeframe, since=now - fetch_limit * 15 * 60 * 1000, limit=fetch_limit)
        if not ohlcv:
            break
        all_ohlcv = ohlcv + all_ohlcv  # 과거 데이터가 앞에 오도록
        now = ohlcv[0][0] - 1  # 가장 오래된 봉의 이전 시점으로 이동
        time.sleep(0.2)
        if len(ohlcv) < fetch_limit:
            break
    df = pd.DataFrame(all_ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = df[col].astype(float)
    return df.tail(limit).reset_index(drop=True)

def save_to_supabase(df, symbol="BTCUSDT", interval="15m", batch_size=1000):
    rows = []
    for _, row in df.iterrows():
        data = {
            "symbol": symbol,
            "interval": interval,
            "timestamp": row["timestamp"].isoformat(),
            "open": row["open"],
            "high": row["high"],
            "low": row["low"],
            "close": row["close"],
            "volume": row["volume"]
        }
        rows.append(data)
        if len(rows) >= batch_size:
            supabase.table("binance_ohlcv").insert(rows).execute()
            rows = []
    if rows:
        supabase.table("binance_ohlcv").insert(rows).execute()

def delete_all_from_supabase():
    supabase.table("binance_ohlcv").delete().neq("id", -1).execute()

if __name__ == "__main__":
    delete_all_from_supabase()
    df = fetch_binance_futures_ohlcv()
    print(df.head())
    save_to_supabase(df) 