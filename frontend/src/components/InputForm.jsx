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
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>자연어 전략</label>
          <textarea
            name="strategy"
            placeholder="예: BTC 가격이 5% 상승하면 매수, 2% 하락하면 매도 등 자유롭게 입력하세요."
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            required
            rows={5}
          />
        </div>
        
        <div className="form-row">
          <div className="input-group">
            <label>자본금 (USDT)</label>
            <input 
              type="number" 
              name="capital" 
              placeholder="예: 10000"
              value={capital} 
              onChange={e => setCapital(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>투입비율 (0~1)</label>
            <input 
              type="number" 
              step="0.01" 
              min="0" 
              max="1" 
              name="capitalPct" 
              placeholder="예: 0.3"
              value={capitalPct} 
              onChange={e => setCapitalPct(e.target.value)} 
              required 
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="input-group">
            <label>Stop Loss (%)</label>
            <input 
              type="number" 
              name="stopLoss" 
              placeholder="예: 2"
              value={stopLoss} 
              onChange={e => setStopLoss(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Take Profit (%)</label>
            <input 
              type="number" 
              name="takeProfit" 
              placeholder="예: 5"
              value={takeProfit} 
              onChange={e => setTakeProfit(e.target.value)} 
              required 
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="input-group">
            <label>백테스트 시작일</label>
            <input 
              type="date" 
              name="startDate"
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>백테스트 종료일</label>
            <input 
              type="date" 
              name="endDate"
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              required 
            />
          </div>
        </div>
        
        <div className="input-group">
          <label>수수료율</label>
          <input 
            type="number" 
            step="0.0001" 
            name="commission" 
            placeholder="예: 0.0004"
            value={commission} 
            onChange={e => setCommission(e.target.value)} 
            required 
          />
        </div>
        
        <div className="form-submit">
          <button 
            type="submit" 
            className="submit-button" 
            disabled={loading}
          >
            {loading ? '전략 분석 중...' : '전략 백테스트 실행'}
          </button>
        </div>
        
        {error && <div className="alert alert-error">{error}</div>}
      </form>
    </div>
  );
};

export default InputForm; 