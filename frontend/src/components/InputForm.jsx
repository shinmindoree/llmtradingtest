import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const InputForm = () => {
  const [strategy, setStrategy] = useState('');
  const [capital, setCapital] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // 입력값을 결과 페이지로 전달
    navigate('/result', {
      state: {
        strategy,
        capital,
        stopLoss,
        takeProfit,
      },
    });
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
        <button type="submit">전략 제출</button>
      </form>
    </div>
  );
};

export default InputForm; 