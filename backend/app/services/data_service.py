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

def fetch_btcusdt_ohlcv(start_date: str, end_date: str, max_data_points=10000, timeframe="15m"):
    print(f"Binance API에서 {start_date}~{end_date} 데이터 가져오기 시작 (최대 {max_data_points}개, 시간 간격: {timeframe})")
    
    # 날짜를 밀리초 타임스탬프로 변환
    start_ts = pd.to_datetime(start_date).timestamp() * 1000
    end_ts = pd.to_datetime(end_date).timestamp() * 1000
    
    # Binance에서 데이터 직접 가져오기
    exchange = ccxt.binance({'options': {'defaultType': 'future'}})
    
    # 데이터 저장 리스트
    all_ohlcv = []
    current_ts = start_ts
    api_calls = 0
    
    # 시간 간격 값을 밀리초로 변환하는 함수
    def get_timeframe_ms(tf):
        unit = tf[-1]
        value = int(tf[:-1]) if tf[:-1].isdigit() else 1
        
        if unit == 'm':
            return value * 60 * 1000
        elif unit == 'h':
            return value * 60 * 60 * 1000
        elif unit == 'd':
            return value * 24 * 60 * 60 * 1000
        elif unit == 'w':
            return value * 7 * 24 * 60 * 60 * 1000
        return 15 * 60 * 1000  # 기본값: 15분
    
    # 시간 간격(밀리초)
    timeframe_ms = get_timeframe_ms(timeframe)
    
    # API 호출 횟수와 데이터 포인트 수를 모두 제한
    while current_ts < end_ts and len(all_ohlcv) < max_data_points and api_calls < 20:
        try:
            # 호출 횟수 증가
            api_calls += 1
            
            # API 호출
            ohlcv = exchange.fetch_ohlcv(
                symbol="BTC/USDT:USDT", 
                timeframe=timeframe, 
                since=int(current_ts), 
                limit=1000
            )
            
            if not ohlcv:
                print(f"더 이상 데이터가 없습니다. (API 호출 횟수: {api_calls})")
                break
            
            # 진행 상황 로그
            print(f"API 호출 {api_calls}: {len(ohlcv)}개 데이터 가져옴 (시작: {pd.to_datetime(ohlcv[0][0], unit='ms')}, 종료: {pd.to_datetime(ohlcv[-1][0], unit='ms')})")
            
            # 중복 데이터 방지
            if all_ohlcv and ohlcv[0][0] == all_ohlcv[-1][0]:
                all_ohlcv.extend(ohlcv[1:])
            else:
                all_ohlcv.extend(ohlcv)
            
            # 마지막 데이터 시간 + 1ms를 다음 시작점으로
            current_ts = ohlcv[-1][0] + 1
            
            # 가져온 마지막 데이터가 종료 시간을 넘었으면 중단
            if current_ts > end_ts:
                print(f"종료 시간에 도달했습니다: {pd.to_datetime(current_ts, unit='ms')} > {pd.to_datetime(end_ts, unit='ms')}")
                break
            
            # 최대 데이터 포인트에 도달하면 중단
            if len(all_ohlcv) >= max_data_points:
                print(f"최대 데이터 포인트 수({max_data_points})에 도달했습니다.")
                break
            
            # API 속도 제한 방지
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Binance API 오류: {e}")
            break
    
    # 데이터프레임으로 변환
    if all_ohlcv:
        df = pd.DataFrame(all_ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        
        # end_date보다 큰 데이터는 제외
        df = df[df["timestamp"] <= pd.to_datetime(end_date)]
        
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)
        
        print(f"Binance API에서 총 {len(df)}개 데이터를 가져왔습니다 (API 호출 횟수: {api_calls}, 시간 간격: {timeframe}).")
    else:
        print("Binance API에서 데이터를 가져올 수 없습니다.")
        df = pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])
    
    # 데이터가 너무 많으면 최대 데이터 포인트로 제한
    if len(df) > max_data_points:
        print(f"데이터가 너무 많아 {max_data_points}개로 제한합니다. (원래: {len(df)}개)")
        df = df.head(max_data_points)
    
    return df

if __name__ == "__main__":
    delete_all_from_supabase()
    df = fetch_binance_futures_ohlcv()
    print(df.head())
    save_to_supabase(df) 