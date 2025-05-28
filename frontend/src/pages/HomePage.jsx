import React, { useState } from 'react';
import InputForm from '../components/InputForm';
import StrategyPrompt from '../components/StrategyPrompt';
import OpenAITest from '../components/OpenAITest';
import BTCChart from '../components/BTCUSDTChart';
import '../styles/HomePage.css';

const HomePage = () => {
  const [timeframe, setTimeframe] = useState('1h');
  
  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">LLMTrading</div>
        <div style={{ flex: 1 }}></div>
        <div className="user-menu">
          <button className="toolbar-button">도움말</button>
        </div>
      </header>
      
      <div className="main-content">
        <div className="chart-container">
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
              <BTCChart />
            </div>
          </div>
          
          <div className="strategy-section">
            <div className="panel-header">
              <h3 className="panel-title">AI 트레이딩 전략 생성기</h3>
            </div>
            <div className="panel-content">
              <StrategyPrompt />
              <InputForm />
            </div>
          </div>
        </div>
        
        <div className="sidebar">
          <div className="price-info">
            <div className="price-item">
              <span className="price-label">BTC/USDT</span>
              <span className="price-value">67,890.45</span>
            </div>
            <div className="price-item">
              <span className="price-label">24h 변동</span>
              <span className="price-value positive">+2.45%</span>
            </div>
            <div className="price-item">
              <span className="price-label">거래량</span>
              <span className="price-value">16.8B</span>
            </div>
          </div>
          
          <div className="test-section">
            <div className="panel-header">
              <h3 className="panel-title">거래 통계</h3>
            </div>
            <div className="panel-content">
              <OpenAITest />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 