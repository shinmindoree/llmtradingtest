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

  // 샘플 차트 데이터 (실제 백엔드 연동 전까지)
  const sampleData = {
    labels: ['1월', '2월', '3월', '4월', '5월'],
    values: [10000, 10500, 10200, 10800, 11000],
  };

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
      <ResultChart data={sampleData} />
    </div>
  );
};

export default ResultPage; 