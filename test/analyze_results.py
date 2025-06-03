import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# 엑셀 파일 로드
df = pd.read_excel('backtest_results.xlsx')

# 진입 및 청산 거래 분리
entry_trades = df[df['action'] == 'Entry long']
exit_trades = df[df['action'] == 'Exit long']

# 1. 기본 통계 분석
print('===== 백테스트 결과 분석 =====')
print(f'총 거래 수: {len(entry_trades)}개')
print(f'평균 RSI: {entry_trades["rsi"].mean():.2f}')
print(f'최소 RSI: {entry_trades["rsi"].min():.2f}')
print(f'최대 RSI: {entry_trades["rsi"].max():.2f}')
print(f'RSI < 45인 진입 비율: {(entry_trades["rsi"] < 45).mean() * 100:.2f}%')

# 2. RSI 구간별 분석
print('\n===== RSI 구간별 거래 분석 =====')
rsi_ranges = [(0, 25), (25, 35), (35, 45), (45, 55)]
for start, end in rsi_ranges:
    count = ((entry_trades['rsi'] >= start) & (entry_trades['rsi'] < end)).sum()
    pct = count/len(entry_trades)*100
    print(f'RSI {start}-{end}: {count}개 ({pct:.2f}%)')

# 3. 월별 거래 분석
print('\n===== 월별 거래 분석 =====')
entry_trades['datetime'] = pd.to_datetime(entry_trades['datetime'], format='%b %d, %Y, %H:%M')
entry_trades['month'] = entry_trades['datetime'].dt.month
entry_trades['month_name'] = entry_trades['datetime'].dt.strftime('%Y-%m')
monthly_trades = entry_trades.groupby('month_name').size()
print(monthly_trades)

# 4. 월별 수익 분석
print('\n===== 월별 수익 분석 =====')
exit_trades['datetime'] = pd.to_datetime(exit_trades['datetime'], format='%b %d, %Y, %H:%M')
exit_trades['month'] = exit_trades['datetime'].dt.month
exit_trades['month_name'] = exit_trades['datetime'].dt.strftime('%Y-%m')
monthly_pnl = exit_trades.groupby('month_name')['pnl'].sum()
print(monthly_pnl)

# 5. 수익률 분석
print('\n===== 수익률 분석 =====')
print(f'평균 수익률: {exit_trades["pnl_pct"].mean():.2f}%')
print(f'최소 수익률: {exit_trades["pnl_pct"].min():.2f}%')
print(f'최대 수익률: {exit_trades["pnl_pct"].max():.2f}%')
print(f'수익 거래 비율: {(exit_trades["pnl_pct"] > 0).mean() * 100:.2f}%')

# 6. RSI 조건 검증
print('\n===== RSI 조건 검증 =====')
rsi_threshold = 45
valid_entries = (entry_trades['rsi'] < rsi_threshold).sum()
invalid_entries = len(entry_trades) - valid_entries
print(f'RSI < {rsi_threshold} 조건에 맞는 진입: {valid_entries}개 ({valid_entries/len(entry_trades)*100:.2f}%)')
print(f'RSI >= {rsi_threshold} 조건에 맞지 않는 진입: {invalid_entries}개 ({invalid_entries/len(entry_trades)*100:.2f}%)')

# 7. 승패 분석
print('\n===== 승패 분석 =====')
wins = (exit_trades['pnl'] > 0).sum()
losses = (exit_trades['pnl'] < 0).sum()
win_rate = wins / len(exit_trades) * 100
print(f'승리 거래: {wins}개 ({win_rate:.2f}%)')
print(f'손실 거래: {losses}개 ({100-win_rate:.2f}%)')
print(f'총 손익: {exit_trades["pnl"].sum():.2f} USD')

# 8. 누적 수익 시각화를 위한 데이터 추출
cumulative_pnl = []
for pnl in exit_trades['pnl']:
    if not cumulative_pnl:
        cumulative_pnl.append(pnl)
    else:
        cumulative_pnl.append(cumulative_pnl[-1] + pnl)

# 분석 결과 저장
with open('backtest_analysis_report.txt', 'w') as f:
    f.write('===== 백테스트 결과 분석 =====\n')
    f.write(f'총 거래 수: {len(entry_trades)}개\n')
    f.write(f'평균 RSI: {entry_trades["rsi"].mean():.2f}\n')
    f.write(f'최소 RSI: {entry_trades["rsi"].min():.2f}\n')
    f.write(f'최대 RSI: {entry_trades["rsi"].max():.2f}\n')
    f.write(f'RSI < 45인 진입 비율: {(entry_trades["rsi"] < 45).mean() * 100:.2f}%\n\n')
    
    f.write('===== RSI 구간별 거래 분석 =====\n')
    for start, end in rsi_ranges:
        count = ((entry_trades['rsi'] >= start) & (entry_trades['rsi'] < end)).sum()
        pct = count/len(entry_trades)*100
        f.write(f'RSI {start}-{end}: {count}개 ({pct:.2f}%)\n')
    
    f.write('\n===== 월별 거래 분석 =====\n')
    f.write(monthly_trades.to_string() + '\n')
    
    f.write('\n===== 월별 수익 분석 =====\n')
    f.write(monthly_pnl.to_string() + '\n')
    
    f.write('\n===== 수익률 분석 =====\n')
    f.write(f'평균 수익률: {exit_trades["pnl_pct"].mean():.2f}%\n')
    f.write(f'최소 수익률: {exit_trades["pnl_pct"].min():.2f}%\n')
    f.write(f'최대 수익률: {exit_trades["pnl_pct"].max():.2f}%\n')
    f.write(f'수익 거래 비율: {(exit_trades["pnl_pct"] > 0).mean() * 100:.2f}%\n')
    
    f.write('\n===== RSI 조건 검증 =====\n')
    f.write(f'RSI < {rsi_threshold} 조건에 맞는 진입: {valid_entries}개 ({valid_entries/len(entry_trades)*100:.2f}%)\n')
    f.write(f'RSI >= {rsi_threshold} 조건에 맞지 않는 진입: {invalid_entries}개 ({invalid_entries/len(entry_trades)*100:.2f}%)\n')
    
    f.write('\n===== 승패 분석 =====\n')
    f.write(f'승리 거래: {wins}개 ({win_rate:.2f}%)\n')
    f.write(f'손실 거래: {losses}개 ({100-win_rate:.2f}%)\n')
    f.write(f'총 손익: {exit_trades["pnl"].sum():.2f} USD\n')

print("\n분석 보고서가 'backtest_analysis_report.txt' 파일로 저장되었습니다.") 