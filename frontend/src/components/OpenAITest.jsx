import React, { useState } from 'react';
import axios from 'axios';

const OpenAITest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult('');
    try {
      const response = await axios.post('http://127.0.0.1:8000/generate-code', {
        strategy: 'BTC 가격이 5% 상승하면 매수, 2% 하락하면 매도',
        capital: 10000,
        stopLoss: 2,
        takeProfit: 5,
      });
      setResult(response.data.code);
    } catch (err) {
      setResult(
        err.response?.data?.detail
          ? `에러: ${err.response.data.detail}`
          : '알 수 없는 에러'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{marginTop: '2rem', padding: '1rem', border: '1px solid #ccc'}}>
      <h3>OpenAI API 테스트</h3>
      <button onClick={handleTest} disabled={loading}>
        {loading ? '테스트 중...' : 'OpenAI API 호출 테스트'}
      </button>
      {result && (
        <pre style={{marginTop: '1rem', background: '#222', color: '#fff', padding: '1rem', borderRadius: '8px', overflowX: 'auto'}}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default OpenAITest; 