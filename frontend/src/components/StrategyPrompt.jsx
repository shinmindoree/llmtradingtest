import React from 'react';

const StrategyPrompt = () => {
  return (
    <div className="strategy-guide">
      <div className="guide-section">
        <h4 className="guide-title">전략 입력 가이드</h4>
        <p className="guide-text">아래 예시를 참고하여 자연어로 트레이딩 전략을 입력하세요:</p>
        
        <div className="example-list">
          <div className="example-item">
            <div className="example-badge">예시 1</div>
            <div className="example-content">
              "RSI가 30 이하일 때 매수하고, RSI가 70 이상일 때 매도한다. 손절은 3%, 익절은 5%로 설정한다."
            </div>
          </div>
          
          <div className="example-item">
            <div className="example-badge">예시 2</div>
            <div className="example-content">
              "20일 이동평균선을 50일 이동평균선이 상향 돌파할 때 매수하고, 하향 돌파할 때 매도한다."
            </div>
          </div>
          
          <div className="example-item">
            <div className="example-badge">예시 3</div>
            <div className="example-content">
              "MACD 히스토그램이 양수로 전환될 때 매수하고, 음수로 전환될 때 매도한다. 동시에 볼린저 밴드 하단에 닿았을 때만 매수한다."
            </div>
          </div>
        </div>
        
        <div className="tips">
          <div className="tip-title">💡 팁</div>
          <ul className="tip-list">
            <li>기술적 지표(RSI, MACD, 이동평균선 등)를 활용해보세요.</li>
            <li>매수/매도 조건을 명확하게 기술하세요.</li>
            <li>복수의 조건을 결합하여 더 정교한 전략을 만들 수 있습니다.</li>
            <li>AI가 분석 후 Python 코드로 변환하여 백테스트를 수행합니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StrategyPrompt; 