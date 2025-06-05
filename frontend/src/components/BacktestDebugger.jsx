import React, { useState } from 'react';
import '../styles/BacktestDebugger.css';

const BacktestDebugger = ({ debugInfo }) => {
  const [activeTab, setActiveTab] = useState('data');

  if (!debugInfo) {
    return (
      <div className="backtest-debugger">
        <div className="debugger-header">
          <h3>백테스트 디버깅 정보</h3>
        </div>
        <div className="debugger-content empty">
          <p>백테스트를 실행하면 디버깅 정보가 여기에 표시됩니다.</p>
        </div>
      </div>
    );
  }

  const { data_info, strategy_info, trade_details, performance } = debugInfo;

  return (
    <div className="backtest-debugger">
      <div className="debugger-header">
        <h3>백테스트 디버깅 정보</h3>
        <div className="debugger-tabs">
          <button 
            className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            데이터
          </button>
          <button 
            className={`tab-button ${activeTab === 'strategy' ? 'active' : ''}`}
            onClick={() => setActiveTab('strategy')}
          >
            전략
          </button>
          <button 
            className={`tab-button ${activeTab === 'trades' ? 'active' : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            거래
          </button>
          <button 
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            성능
          </button>
        </div>
      </div>
      
      <div className="debugger-content">
        {activeTab === 'data' && (
          <div className="debug-tab data-tab">
            <h4>데이터 정보</h4>
            <div className="debug-info-grid">
              <div className="info-item">
                <div className="info-label">총 바 수:</div>
                <div className="info-value">{data_info.total_bars.toLocaleString()}</div>
              </div>
              <div className="info-item">
                <div className="info-label">날짜 범위:</div>
                <div className="info-value">{data_info.date_range}</div>
              </div>
              <div className="info-item">
                <div className="info-label">타임프레임:</div>
                <div className="info-value">{data_info.timeframe}</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'strategy' && (
          <div className="debug-tab strategy-tab">
            <h4>전략 정보</h4>
            <div className="debug-info-grid">
              <div className="info-item">
                <div className="info-label">매수 신호:</div>
                <div className="info-value">{strategy_info.has_buy_signals ? '있음' : '없음'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">매도 신호:</div>
                <div className="info-value">{strategy_info.has_sell_signals ? '있음' : '없음'}</div>
              </div>
              <div className="info-item full-width">
                <div className="info-label">전략 파라미터:</div>
                <div className="info-value params">
                  <table className="params-table">
                    <tbody>
                      {Object.entries(strategy_info.strategy_params).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'trades' && (
          <div className="debug-tab trades-tab">
            <h4>거래 상세 정보</h4>
            <div className="debug-info-grid">
              <div className="info-item">
                <div className="info-label">총 거래 수:</div>
                <div className="info-value">{trade_details.total_trades}</div>
              </div>
              <div className="info-item">
                <div className="info-label">미결제 거래:</div>
                <div className="info-value">{trade_details.open_trades}</div>
              </div>
              <div className="info-item">
                <div className="info-label">종료된 거래:</div>
                <div className="info-value">{trade_details.closed_trades}</div>
              </div>
              <div className="info-item">
                <div className="info-label">성공 거래:</div>
                <div className="info-value">{trade_details.won_trades}</div>
              </div>
              <div className="info-item">
                <div className="info-label">실패 거래:</div>
                <div className="info-value">{trade_details.lost_trades}</div>
              </div>
              <div className="info-item attention">
                <div className="info-label">주의:</div>
                <div className="info-value">
                  총 거래 수가 2로 고정되는 문제가 있다면, backtrader의 total 속성 처리 문제일 수 있습니다.
                  실제 거래 내역과 비교해보세요.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'performance' && (
          <div className="debug-tab performance-tab">
            <h4>성능 지표</h4>
            <div className="debug-info-grid">
              <div className="info-item">
                <div className="info-label">초기 자본금:</div>
                <div className="info-value">{performance.initial_cash.toLocaleString()} USDT</div>
              </div>
              <div className="info-item">
                <div className="info-label">최종 현금:</div>
                <div className="info-value">{performance.final_cash.toLocaleString()} USDT</div>
              </div>
              <div className="info-item">
                <div className="info-label">최종 포트폴리오 가치:</div>
                <div className="info-value">{performance.final_value.toLocaleString()} USDT</div>
              </div>
              <div className="info-item">
                <div className="info-label">수익률:</div>
                <div className={`info-value ${performance.return_pct >= 0 ? 'positive' : 'negative'}`}>
                  {performance.return_pct.toFixed(2)}%
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">최대 낙폭:</div>
                <div className="info-value negative">{performance.max_drawdown_pct.toFixed(2)}%</div>
              </div>
              <div className="info-item attention">
                <div className="info-label">비정상 수익률 확인:</div>
                <div className="info-value">
                  {Math.abs(performance.return_pct) > 1000 
                    ? '수익률이 비정상적으로 높거나 낮습니다. 레버리지 설정 또는 거래 크기 문제일 수 있습니다.' 
                    : '수익률이 정상 범위 내에 있습니다.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestDebugger; 