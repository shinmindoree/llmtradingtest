import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const InputForm = () => {
  const [strategy, setStrategy] = useState('');
  const [capital, setCapital] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://127.0.0.1:8000/generate-code', {
        strategy,
        capital: parseFloat(capital),
        stopLoss: parseFloat(stopLoss),
        takeProfit: parseFloat(takeProfit),
      });
      const code = response.data.code;
      navigate('/result', {
        state: {
          strategy,
          capital,
          stopLoss,
          takeProfit,
          code,
        },
      });
    } catch (err) {
      setError('코드 변환 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>트레이딩 전략 입력</h2>
      <form onSubmit={handleSubmit}>
        <label>
          자연어 전략:
          <input type="text" name="strategy" placeholder="예: BTC 가격이 5% 상승하면 매수"
            value={strategy} onChange={e => setStrategy(e.target.value)} required />
        </label>
        <label>
          자본금:
          <input type="number" name="capital" placeholder="예: 10000"
            value={capital} onChange={e => setCapital(e.target.value)} required />
        </label>
        <label>
          Stop Loss (%):
          <input type="number" name="stopLoss" placeholder="예: 2"
            value={stopLoss} onChange={e => setStopLoss(e.target.value)} required />
        </label>
        <label>
          Take Profit (%):
          <input type="number" name="takeProfit" placeholder="예: 5"
            value={takeProfit} onChange={e => setTakeProfit(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? '전송 중...' : '전략 제출'}</button>
        {error && <div style={{color: 'red', marginTop: '1rem'}}>{error}</div>}
      </form>
    </div>
  );
};

export default InputForm; 