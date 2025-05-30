import pandas as pd
import numpy as np
import datetime
import os

# 데이터 폴더 확인 및 생성
if not os.path.exists('data'):
    os.makedirs('data')

# 데이터 생성 시작일과 종료일
start_date = datetime.datetime(2023, 12, 1)
end_date = datetime.datetime(2024, 5, 30)

# 1시간 간격으로 날짜 생성
date_range = pd.date_range(start=start_date, end=end_date, freq='1H')

# 시작 가격
base_price = 40000

# 데이터 프레임 생성
df = pd.DataFrame(index=range(len(date_range)))
df['datetime'] = date_range.strftime('%Y-%m-%d %H:%M:%S')

# 랜덤한 가격 생성
np.random.seed(42)  # 재현성을 위한 시드 설정
random_walks = np.random.normal(0, 1, len(date_range))
cumulative_walks = np.cumsum(random_walks) * 500  # 변동성 스케일

# 가격 계산
prices = base_price + cumulative_walks
prices = np.maximum(prices, 20000)  # 최소 가격 20,000

# 가격 데이터 추가
df['open'] = prices
df['high'] = prices * (1 + np.random.uniform(0, 0.02, len(date_range)))
df['low'] = prices * (1 - np.random.uniform(0, 0.02, len(date_range)))
df['close'] = prices * (1 + np.random.normal(0, 0.005, len(date_range)))
df['volume'] = np.random.uniform(1000, 5000, len(date_range))

# 데이터 저장
output_file = 'data/BTC-USD_1h.csv'
df.to_csv(output_file, index=False)

print(f'데이터 생성 완료: {output_file}')
print(f'행 수: {len(df)}')
print(f'시작일: {df["datetime"].iloc[0]}')
print(f'종료일: {df["datetime"].iloc[-1]}')
print(f'시작 가격: {df["close"].iloc[0]:.2f}')
print(f'종료 가격: {df["close"].iloc[-1]:.2f}') 