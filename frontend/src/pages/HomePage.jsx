import React from 'react';
import InputForm from '../components/InputForm';
import StrategyPrompt from '../components/StrategyPrompt';
import OpenAITest from '../components/OpenAITest';
import BTCChart from '../components/BTCUSDTChart';
import '../styles/HomePage.css';

const HomePage = () => {
  return (
    <div className="home-container">
      <h1 className="app-title">BTC/USDT 트레이딩 전략 백테스트</h1>
      
      <div className="chart-section">
        <h2>BTC/USDT 실시간 차트</h2>
        <BTCChart />
      </div>
      
      <div className="strategy-section">
        <h2>트레이딩 전략 입력</h2>
        <StrategyPrompt />
        <InputForm />
      </div>
      
      <div className="test-section">
        <OpenAITest />
      </div>
    </div>
  );
};

export default HomePage; 