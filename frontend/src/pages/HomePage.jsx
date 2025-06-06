import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BTCUSDTChart from '../components/BTCUSDTChart';
import ChatInterface from '../components/ChatInterface';
// import TradingResults from '../components/TradingResults'; // 삭제
import '../styles/HomePage.css';

const HomePage = () => {
  const [timeframe, setTimeframe] = useState('1h');
  const [_backtestResult, setBacktestResult] = useState(null);
  const [_currentStrategy, setCurrentStrategy] = useState('');
  const [parameters, setParameters] = useState({
    capital: 10000,
    capital_pct: 0.3,
    stopLoss: 2,
    takeProfit: 5,
    startDate: '2024-05-01',
    endDate: '2024-05-31',
    commission: 0.0004,
    timeframe: timeframe
  });
  
  // timeframe 변경시 parameters 업데이트
  useEffect(() => {
    setParameters(prev => ({
      ...prev,
      timeframe: timeframe
    }));
  }, [timeframe]);
  
  // 백테스트 결과 수신 처리
  const handleBacktestResult = (result, strategy, params) => {
    setBacktestResult(result); // 결과 데이터는 계속 받음
    setCurrentStrategy(strategy); // 전략명도 계속 받음
    setParameters(params);
  };

  // 파라미터 변경 핸들러
  const handleParameterChange = (name, value) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">LLMTrading</div>
        <div style={{ flex: 1 }}></div>
        <div className="user-menu">
          <Link to="/debug" className="toolbar-button debug-button">디버그</Link>
          <button className="toolbar-button">도움말</button>
        </div>
      </header>
      
      <div className="main-content">
        {/* 좌측 컬럼: 차트와 파라미터 */}
        <div className="left-column">
          {/* 차트 섹션 */}
          <div className="chart-section">
            <div className="chart-header">
              <h3 className="chart-title">
                <span className="symbol">BTCUSDT</span>
                <span className="timeframe">{timeframe}</span>
              </h3>
              <div className="chart-toolbar">
                <button 
                  className={`toolbar-button ${timeframe === '15m' ? 'active' : ''}`}
                  onClick={() => setTimeframe('15m')}
                >
                  15m
                </button>
                <button 
                  className={`toolbar-button ${timeframe === '1h' ? 'active' : ''}`}
                  onClick={() => setTimeframe('1h')}
                >
                  1h
                </button>
                <button 
                  className={`toolbar-button ${timeframe === '4h' ? 'active' : ''}`}
                  onClick={() => setTimeframe('4h')}
                >
                  4h
                </button>
                <button 
                  className={`toolbar-button ${timeframe === '1d' ? 'active' : ''}`}
                  onClick={() => setTimeframe('1d')}
                >
                  1d
                </button>
              </div>
            </div>
            <div className="chart-content">
              <BTCUSDTChart timeframe={timeframe} />
            </div>
          </div>
          
          {/* 파라미터 섹션 - 차트 아래 */}
          <div className="params-section">
            <div className="params-header">
              <h3>백테스트 파라미터</h3>
            </div>
            <div className="params-content">
              <div className="param-group">
                <label htmlFor="capital">자본금 (USDT)</label>
                <input 
                  id="capital"
                  type="number" 
                  value={parameters.capital}
                  onChange={(e) => handleParameterChange('capital', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="param-group">
                <label htmlFor="capital_pct">투입비율 (0~1)</label>
                <input 
                  id="capital_pct"
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="1" 
                  value={parameters.capital_pct}
                  onChange={(e) => handleParameterChange('capital_pct', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="param-group">
                <label htmlFor="stopLoss">Stop Loss (%)</label>
                <input 
                  id="stopLoss"
                  type="number" 
                  value={parameters.stopLoss}
                  onChange={(e) => handleParameterChange('stopLoss', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="param-group">
                <label htmlFor="takeProfit">Take Profit (%)</label>
                <input 
                  id="takeProfit"
                  type="number" 
                  value={parameters.takeProfit}
                  onChange={(e) => handleParameterChange('takeProfit', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="param-group">
                <label htmlFor="startDate">시작일</label>
                <input 
                  id="startDate"
                  type="date" 
                  value={parameters.startDate}
                  onChange={(e) => handleParameterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="param-group">
                <label htmlFor="endDate">종료일</label>
                <input 
                  id="endDate"
                  type="date" 
                  value={parameters.endDate}
                  onChange={(e) => handleParameterChange('endDate', e.target.value)}
                />
              </div>
              
              <div className="param-group">
                <label htmlFor="commission">수수료율</label>
                <input 
                  id="commission"
                  type="number" 
                  step="0.0001" 
                  value={parameters.commission}
                  onChange={(e) => handleParameterChange('commission', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 우측 컬럼: 챗 인터페이스 */}
        <div className="right-column">
          <div className="chat-section">
            <div className="panel-header">
              <h3 className="panel-title">AI 트레이딩 어시스턴트</h3>
              <div className="panel-subtitle">자연어로 트레이딩 전략을 설명해주세요</div>
            </div>
            <div className="panel-content">
              <ChatInterface 
                timeframe={timeframe} 
                onBacktestResult={handleBacktestResult} 
                parameters={parameters}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 
