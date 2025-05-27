import React from 'react';

const StrategyPrompt = () => {
  return (
    <div>
      <h2>전략 입력 가이드</h2>
      <p>아래 예시를 참고하여 전략을 입력하세요:</p>
      <ul>
        <li>BTC 가격이 5% 상승하면 매수하고, 2% 하락하면 매도.</li>
        <li>자본금: 10,000 USD</li>
        <li>Stop Loss: 2%</li>
        <li>Take Profit: 5%</li>
      </ul>
    </div>
  );
};

export default StrategyPrompt; 