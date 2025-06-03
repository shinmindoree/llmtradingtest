import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# 엑셀 파일 로드
df = pd.read_excel('backtest_results.xlsx')

# 진입 거래만 필터링
entry_trades = df[df['action'] == 'Entry long']

# RSI 45 이상인 거래들(매수 조건 위반)
rsi_threshold = 45
violation_trades = entry_trades[entry_trades['rsi'] >= rsi_threshold].copy()

# 날짜 파싱
violation_trades['datetime'] = pd.to_datetime(violation_trades['datetime'], format='%b %d, %Y, %H:%M')
violation_trades['date'] = violation_trades['datetime'].dt.date
violation_trades['time'] = violation_trades['datetime'].dt.time

print(f"===== RSI >= {rsi_threshold} 조건 위반 거래 분석 =====")
print(f"총 위반 거래 수: {len(violation_trades)}개 (전체 {len(entry_trades)}개 중 {len(violation_trades)/len(entry_trades)*100:.2f}%)")
print(f"\n위반 거래의 RSI 통계:")
print(f"평균 RSI: {violation_trades['rsi'].mean():.2f}")
print(f"최소 RSI: {violation_trades['rsi'].min():.2f}")
print(f"최대 RSI: {violation_trades['rsi'].max():.2f}")

# 시간대별 위반 빈도
violation_trades['hour'] = violation_trades['datetime'].dt.hour
print(f"\n시간대별 위반 빈도:")
hour_violations = violation_trades.groupby('hour').size()
print(hour_violations)

# 월별 위반 빈도
violation_trades['month'] = violation_trades['datetime'].dt.month
violation_trades['month_name'] = violation_trades['datetime'].dt.strftime('%Y-%m')
print(f"\n월별 위반 빈도:")
month_violations = violation_trades.groupby('month_name').size()
print(month_violations)

# 이 위반 거래들의 수익성 분석
# exit_trades에서 violation_trades와 같은 id를 가진 거래 찾기
exit_trades = df[df['action'] == 'Exit long']
exit_trades['id'] = exit_trades['id'].astype(int)
violation_ids = violation_trades['id'].unique()

# 위반 거래들의 청산 정보
violation_exits = exit_trades[exit_trades['id'].isin(violation_ids)].copy()
violation_exits['datetime'] = pd.to_datetime(violation_exits['datetime'], format='%b %d, %Y, %H:%M')

print(f"\n위반 거래의 수익성:")
print(f"평균 수익률: {violation_exits['pnl_pct'].mean():.2f}%")
print(f"수익 거래 비율: {(violation_exits['pnl'] > 0).mean() * 100:.2f}%")
print(f"총 손익: {violation_exits['pnl'].sum():.2f} USD")

# 정상 거래(RSI < 45)와 비교
valid_trades = entry_trades[entry_trades['rsi'] < rsi_threshold]
valid_ids = valid_trades['id'].unique()
valid_exits = exit_trades[exit_trades['id'].isin(valid_ids)].copy()

print(f"\n정상 거래(RSI < {rsi_threshold})의 수익성:")
print(f"평균 수익률: {valid_exits['pnl_pct'].mean():.2f}%")
print(f"수익 거래 비율: {(valid_exits['pnl'] > 0).mean() * 100:.2f}%")
print(f"총 손익: {valid_exits['pnl'].sum():.2f} USD")

# 위반 거래 목록 상세 출력
print(f"\n===== RSI 위반 거래 상세 목록 =====")
print("Trade ID | 날짜           | 시간  | RSI     | 진입 가격     | 수익률")
print("---------+----------------+-------+---------+--------------+--------")
for _, row in violation_trades.iterrows():
    exit_row = violation_exits[violation_exits['id'] == row['id']].iloc[0]
    print(f"{int(row['id']):8} | {row['date']} | {row['time']} | {row['rsi']:.2f} | {row['price']:.2f} USD | {exit_row['pnl_pct']:.2f}%")

# 위반 거래 및 정상 거래의 성과 비교 결과를 파일로 저장
with open('rsi_violation_analysis.txt', 'w') as f:
    f.write(f"===== RSI >= {rsi_threshold} 조건 위반 거래 분석 =====\n")
    f.write(f"총 위반 거래 수: {len(violation_trades)}개 (전체 {len(entry_trades)}개 중 {len(violation_trades)/len(entry_trades)*100:.2f}%)\n")
    f.write(f"\n위반 거래의 RSI 통계:\n")
    f.write(f"평균 RSI: {violation_trades['rsi'].mean():.2f}\n")
    f.write(f"최소 RSI: {violation_trades['rsi'].min():.2f}\n")
    f.write(f"최대 RSI: {violation_trades['rsi'].max():.2f}\n")
    
    f.write(f"\n시간대별 위반 빈도:\n")
    f.write(hour_violations.to_string() + "\n")
    
    f.write(f"\n월별 위반 빈도:\n")
    f.write(month_violations.to_string() + "\n")
    
    f.write(f"\n위반 거래의 수익성:\n")
    f.write(f"평균 수익률: {violation_exits['pnl_pct'].mean():.2f}%\n")
    f.write(f"수익 거래 비율: {(violation_exits['pnl'] > 0).mean() * 100:.2f}%\n")
    f.write(f"총 손익: {violation_exits['pnl'].sum():.2f} USD\n")
    
    f.write(f"\n정상 거래(RSI < {rsi_threshold})의 수익성:\n")
    f.write(f"평균 수익률: {valid_exits['pnl_pct'].mean():.2f}%\n")
    f.write(f"수익 거래 비율: {(valid_exits['pnl'] > 0).mean() * 100:.2f}%\n")
    f.write(f"총 손익: {valid_exits['pnl'].sum():.2f} USD\n")
    
    f.write(f"\n===== RSI 위반 거래 상세 목록 =====\n")
    f.write("Trade ID | 날짜           | 시간  | RSI     | 진입 가격     | 수익률\n")
    f.write("---------+----------------+-------+---------+--------------+--------\n")
    for _, row in violation_trades.iterrows():
        exit_row = violation_exits[violation_exits['id'] == row['id']].iloc[0]
        f.write(f"{int(row['id']):8} | {row['date']} | {row['time']} | {row['rsi']:.2f} | {row['price']:.2f} USD | {exit_row['pnl_pct']:.2f}%\n")

print("\nRSI 위반 거래 분석 보고서가 'rsi_violation_analysis.txt' 파일로 저장되었습니다.") 