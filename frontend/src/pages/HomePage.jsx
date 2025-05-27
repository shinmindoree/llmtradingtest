import React from 'react';
import InputForm from '../components/InputForm';
import StrategyPrompt from '../components/StrategyPrompt';
import OpenAITest from '../components/OpenAITest';

const HomePage = () => {
  return (
    <div>
      <h1>트레이딩 전략 백테스트</h1>
      <StrategyPrompt />
      <InputForm />
      <OpenAITest />
    </div>
  );
};

export default HomePage; 