import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const InputForm = () => {
  const [strategy, setStrategy] = useState('');
  const [capital, setCapital] = useState('');
  const [capitalPct, setCapitalPct] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [commission, setCommission] = useState('');
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
        capital_pct: parseFloat(capitalPct),
        stopLoss: parseFloat(stopLoss),
        takeProfit: parseFloat(takeProfit),
        startDate,
        endDate,
        commission: parseFloat(commission),
      });
      const code = response.data.code;
      navigate('/result', {
        state: {
          strategy,
          capital,
          capitalPct,
          stopLoss,
          takeProfit,
          startDate,
          endDate,
          commission,
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
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.2rem', maxWidth: 600, margin: '0 auto'}}>
        <label style={{display: 'flex', flexDirection: 'column', fontWeight: 'bold'}}>
          자연어 전략:
          <textarea
            name="strategy"
            placeholder="예: BTC 가격이 5% 상승하면 매수, 2% 하락하면 매도 등 자유롭게 입력하세요."
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            required
            rows={6}
            style={{resize: 'vertical', fontSize: '1.1rem', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', marginTop: '0.5rem'}}
          />
        </label>
        <label>
          자본금:
          <input type="number" name="capital" placeholder="예: 10000"
            value={capital} onChange={e => setCapital(e.target.value)} required />
        </label>
        <label>
          투입비율(0~1):
          <input type="number" step="0.01" min="0" max="1" name="capitalPct" placeholder="예: 0.3"
            value={capitalPct} onChange={e => setCapitalPct(e.target.value)} required />
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
        <label>
          백테스트 시작일:
          <input type="date" name="startDate"
            value={startDate} onChange={e => setStartDate(e.target.value)} required />
        </label>
        <label>
          백테스트 종료일:
          <input type="date" name="endDate"
            value={endDate} onChange={e => setEndDate(e.target.value)} required />
        </label>
        <label>
          수수료율:
          <input type="number" step="0.0001" name="commission" placeholder="예: 0.0004"
            value={commission} onChange={e => setCommission(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading} style={{padding: '0.8rem', fontSize: '1.1rem', borderRadius: '8px', background: '#222', color: '#fff', fontWeight: 'bold'}}>
          {loading ? '전송 중...' : '전략 제출'}
        </button>
        {error && <div style={{color: 'red', marginTop: '1rem'}}>{error}</div>}
      </form>
    </div>
  );
};

export default InputForm; 