import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# 엑셀 파일 로드
df = pd.read_excel('backtest_results_validated.xlsx')

# 진입 및 청산 거래 분리
entry_trades = df[df['action'] == 'Entry long']
exit_trades = df[df['action'] == 'Exit long']

# RSI 값을 숫자로 변환
entry_trades['rsi'] = pd.to_numeric(entry_trades['rsi'], errors='coerce')

# RSI 범위 정의
rsi_ranges = [(0, 30), (30, 40), (40, 45), (45, 50), (50, 55)]

print('RSI 대역별 수익성 분석:')
print('=' * 50)

results = []

for start, end in rsi_ranges:
    # 해당 RSI 범위에 속하는 거래 추출
    range_entries = entry_trades[(entry_trades['rsi'] >= start) & (entry_trades['rsi'] < end)].copy()
    
    if len(range_entries) == 0:
        continue
        
    # 해당 거래의 ID 가져오기
    range_ids = range_entries['id'].values
    
    # 청산 거래 필터링
    range_exits = exit_trades[exit_trades['id'].isin(range_ids)]
    
    # 통계 계산
    avg_pnl_pct = range_exits['pnl_pct'].mean()
    win_rate = (range_exits['pnl'] > 0).mean() * 100
    total_pnl = range_exits['pnl'].sum()
    
    print(f'\nRSI {start}-{end} 범위: {len(range_entries)}건')
    print(f'평균 수익률: {avg_pnl_pct:.2f}%')
    print(f'수익 거래 비율: {win_rate:.2f}%')
    print(f'총 손익: {total_pnl:.2f} USD')
    
    # 결과 저장
    results.append({
        'rsi_range': f'{start}-{end}',
        'count': len(range_entries),
        'avg_pnl_pct': avg_pnl_pct,
        'win_rate': win_rate,
        'total_pnl': total_pnl
    })

# 결과를 데이터프레임으로 변환
results_df = pd.DataFrame(results)

# 요약 결과 출력
print('\n최종 요약:')
print('=' * 50)
print(results_df)

# RSI와 수익률 간의 상관관계 분석
correlation = np.corrcoef(entry_trades['rsi'].values, exit_trades['pnl_pct'].values)[0, 1]
print(f'\nRSI와 수익률 간의 상관계수: {correlation:.4f}')

# 차트 생성
plt.figure(figsize=(12, 6))

# 범위별 총 손익 차트
plt.subplot(1, 2, 1)
plt.bar(results_df['rsi_range'], results_df['total_pnl'])
plt.title('RSI 범위별 총 손익')
plt.xlabel('RSI 범위')
plt.ylabel('총 손익 (USD)')

# 범위별 승률 차트
plt.subplot(1, 2, 2)
plt.bar(results_df['rsi_range'], results_df['win_rate'])
plt.title('RSI 범위별 승률')
plt.xlabel('RSI 범위')
plt.ylabel('승률 (%)')
plt.axhline(y=50, color='r', linestyle='--')  # 50% 라인 추가

plt.tight_layout()
plt.savefig('rsi_analysis.png')
print('\n분석 차트가 rsi_analysis.png 파일로 저장되었습니다.')

# RSI 위반 거래 분석 요약 정보를 텍스트 파일로 저장
with open('rsi_range_analysis.txt', 'w') as f:
    f.write('RSI 대역별 수익성 분석:\n')
    f.write('=' * 50 + '\n')
    
    for result in results:
        f.write(f"\nRSI {result['rsi_range']} 범위: {result['count']}건\n")
        f.write(f"평균 수익률: {result['avg_pnl_pct']:.2f}%\n")
        f.write(f"수익 거래 비율: {result['win_rate']:.2f}%\n")
        f.write(f"총 손익: {result['total_pnl']:.2f} USD\n")
    
    f.write('\n최종 요약:\n')
    f.write('=' * 50 + '\n')
    f.write(results_df.to_string() + '\n')
    
    f.write(f'\nRSI와 수익률 간의 상관계수: {correlation:.4f}\n')

print('\n분석 결과가 rsi_range_analysis.txt 파일로 저장되었습니다.') 