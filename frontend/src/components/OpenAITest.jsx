import React, { useState } from 'react';
import axios from 'axios';

const OpenAITest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const response = await axios.post('http://127.0.0.1:8000/generate-code', {
        strategy: "RSI가 30 이하일 때 매수하고 70 이상일 때 매도하는 간단한 전략",
        capital: 10000,
        capital_pct: 0.3,
        stopLoss: 2,
        takeProfit: 5,
        startDate: "2023-01-01",
        endDate: "2023-01-15",
        commission: 0.0004
      });
      setResult(response.data.code);
    } catch (err) {
      setError(
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
      {error && (
        <p style={{marginTop: '1rem', color: 'red'}}>{error}</p>
      )}
    </div>
  );
};

export default OpenAITest; 