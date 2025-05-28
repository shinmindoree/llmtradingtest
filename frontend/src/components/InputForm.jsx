import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const InputForm = () => {
  const [strategy, setStrategy] = useState('RSI 30이하면 매수');
  const [capital, setCapital] = useState('10000');
  const [capitalPct, setCapitalPct] = useState('0.3');
  const [stopLoss, setStopLoss] = useState('2');
  const [takeProfit, setTakeProfit] = useState('5');
  const [startDate, setStartDate] = useState('2025-05-19');
  const [endDate, setEndDate] = useState('2025-05-24');
  const [commission, setCommission] = useState('0.0004');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. generate-code 호출
      const genRes = await axios.post('http://127.0.0.1:8000/generate-code', {
        strategy,
        capital: parseFloat(capital),
        capital_pct: parseFloat(capitalPct),
        stopLoss: parseFloat(stopLoss),
        takeProfit: parseFloat(takeProfit),
        startDate,
        endDate,
        commission: parseFloat(commission),
      });
      const code = genRes.data.code;
      // 2. run-backtest 호출
      const backtestRes = await axios.post('http://127.0.0.1:8000/run-backtest', {
        code,
        capital: parseFloat(capital),
        capital_pct: parseFloat(capitalPct),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        start_date: startDate,
        end_date: endDate,
        commission: parseFloat(commission),
      });
      const backtestResult = backtestRes.data;
      // 3. 결과 페이지로 이동 (전략, 코드, 백테스트 결과 모두 전달)
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
          backtestResult,
        },
      });
    } catch (err) {
      setError('코드 변환 또는 백테스트 중 오류가 발생했습니다.');
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
            style={{
              resize: 'vertical',
              fontSize: '1.1rem',
              padding: '1rem',
              borderRadius: '16px',
              border: '1.5px solid #bdbdbd',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              background: '#f5f5f5',
              color: '#000',
              transition: 'border 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => e.target.style.border = '1.5px solid #6c63ff'}
            onBlur={e => e.target.style.border = '1.5px solid #bdbdbd'}
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