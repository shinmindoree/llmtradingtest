import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResultChart from '../components/ResultChart';

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  // 입력값이 없으면 홈으로 리다이렉트
  if (!data) {
    navigate('/');
    return null;
  }

  // 실제 백테스트 결과 데이터
  const backtest = data.backtestResult;
  const chartData = backtest && backtest.equity_curve
    ? {
        labels: backtest.equity_curve.timestamps || backtest.equity_curve.labels || [],
        values: backtest.equity_curve.values || [],
      }
    : null;

  return (
    <div>
      <h1>백테스트 결과</h1>
      <div style={{marginBottom: '2rem'}}>
        <h3>입력한 전략 정보</h3>
        <ul>
          <li><b>전략:</b> {data.strategy}</li>
          <li><b>자본금:</b> {data.capital}</li>
          <li><b>Stop Loss:</b> {data.stopLoss}%</li>
          <li><b>Take Profit:</b> {data.takeProfit}%</li>
        </ul>
      </div>
      {data.code && (
        <div style={{marginBottom: '2rem'}}>
          <h3>변환된 파이썬 코드</h3>
          <pre style={{background: '#222', color: '#fff', padding: '1rem', borderRadius: '8px', overflowX: 'auto'}}>
            {data.code}
          </pre>
        </div>
      )}
      {backtest && (
        <div style={{marginBottom: '2rem'}}>
          <h3>주요 성과 지표</h3>
          <ul>
            <li><b>총 수익률:</b> {backtest.total_return ?? '-'}%</li>
            <li><b>최대 낙폭:</b> {backtest.max_drawdown ?? '-'}</li>
            <li><b>트레이드 수:</b> {backtest.num_trades ?? '-'}</li>
            {/* 필요시 추가 지표 */}
          </ul>
        </div>
      )}
      {chartData ? (
        <ResultChart data={chartData} />
      ) : (
        <div style={{color: '#888', marginTop: '2rem'}}>차트 데이터가 없습니다.</div>
      )}
    </div>
  );
};

export default ResultPage; 