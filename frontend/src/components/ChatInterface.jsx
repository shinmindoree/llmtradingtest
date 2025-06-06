import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/ChatInterface.css';

const ChatInterface = ({ timeframe, onBacktestResult, parameters }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: '안녕하세요! 트레이딩 전략을 자연어로 설명해주시면 Python 코드로 변환하고 백테스트를 수행해 드릴게요. 어떤 전략을 시도해보고 싶으신가요?',
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [editableCode, setEditableCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // 타이핑 효과를 위한 상태 추가
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState(null);
  const [displayedContent, setDisplayedContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typingCode, setTypingCode] = useState('');
  const [isCodeTyping, setIsCodeTyping] = useState(false);
  
  // 새로운 상태 추가: 단계별 처리
  const [currentStrategy, setCurrentStrategy] = useState('');
  const [isConfirmingStrategy, setIsConfirmingStrategy] = useState(false);
  const [preparedData, setPreparedData] = useState(null);
  
  const messagesEndRef = useRef(null);

  // 새 메시지가 추가될 때마다 스크롤 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedContent]);

  // 타이핑 효과 구현
  useEffect(() => {
    if (isTyping && currentIndex < fullContent.length) {
      const typingTimer = setTimeout(() => {
        setDisplayedContent(prev => prev + fullContent.charAt(currentIndex));
        setCurrentIndex(prev => prev + 1);
      }, 15); // 타이핑 속도 조절 (밀리초)
      
      return () => clearTimeout(typingTimer);
    } else if (isTyping && currentIndex >= fullContent.length) {
      // 텍스트 타이핑 완료 후 코드 타이핑 시작
      if (isCodeTyping) {
        if (!typingCode) {
          setIsCodeTyping(false);
          setIsTyping(false);
          
          // 타이핑이 완료된 메시지로 업데이트
          if (currentTypingMessageId !== null) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === currentTypingMessageId 
                  ? { 
                      ...msg, 
                      content: fullContent, 
                      code: currentCode, 
                      isTyping: false,
                      typingCode: false
                    } 
                  : msg
              )
            );
            setCurrentTypingMessageId(null);
          }
          return;
        }
        
        // 일정 시간마다 코드의 일부를 표시
        const codeLength = typingCode.length;
        const charsPerFrame = 10; // 한 번에 표시할 문자 수
        let displayedChars = 0;
        
        const codeTypingInterval = setInterval(() => {
          if (displayedChars < codeLength) {
            displayedChars = Math.min(displayedChars + charsPerFrame, codeLength);
            
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === currentTypingMessageId 
                  ? { 
                      ...msg, 
                      code: typingCode.slice(0, displayedChars),
                      typingCode: true
                    } 
                  : msg
              )
            );
          } else {
            clearInterval(codeTypingInterval);
            setIsCodeTyping(false);
            setIsTyping(false);
            
            // 타이핑이 완료된 메시지로 업데이트
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === currentTypingMessageId 
                  ? { 
                      ...msg, 
                      content: fullContent, 
                      code: typingCode, 
                      isTyping: false,
                      typingCode: false
                    } 
                  : msg
              )
            );
            setCurrentTypingMessageId(null);
          }
        }, 30); // 코드 타이핑 속도
      } else {
        setIsTyping(false);
        
        // 타이핑이 완료된 메시지로 업데이트
        if (currentTypingMessageId !== null) {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === currentTypingMessageId 
                ? { ...msg, content: fullContent, isTyping: false } 
                : msg
            )
          );
          setCurrentTypingMessageId(null);
        }
      }
    }
  }, [isTyping, currentIndex, fullContent, currentTypingMessageId, isCodeTyping, typingCode, currentCode]);

  // 타이핑 효과 시작
  const startTypingEffect = (content, code = null) => {
    setFullContent(content);
    setDisplayedContent('');
    setCurrentIndex(0);
    setIsTyping(true);
    
    if (code) {
      setTypingCode(code);
      setIsCodeTyping(true);
    } else {
      setTypingCode('');
      setIsCodeTyping(false);
    }
  };

  // 메시지 전송 처리 (수정됨 - 단계별 처리)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    // 전략 확인 모드인 경우
    if (isConfirmingStrategy) {
      // '진행해줘' 또는 유사한 긍정적인 응답인 경우
      if (
        inputMessage.trim().toLowerCase().includes('진행') || 
        inputMessage.trim().toLowerCase().includes('시작') || 
        inputMessage.trim().toLowerCase().includes('네') || 
        inputMessage.trim().toLowerCase().includes('예') || 
        inputMessage.trim().toLowerCase().includes('좋아')
      ) {
        // 사용자 메시지 추가
        const userMessage = {
          id: messages.length + 1,
          type: 'user',
          content: inputMessage,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        
        // 로딩 메시지 추가
        const loadingMessage = {
          id: messages.length + 2,
          type: 'assistant',
          content: '데이터를 준비하고 있습니다...',
          isLoading: true,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, loadingMessage]);
        
        // 데이터 준비 API 호출
        try {
          const prepareRes = await axios.post('http://127.0.0.1:8000/prepare-data', {
            strategy: currentStrategy,
            capital: parameters.capital,
            capital_pct: parameters.capital_pct,
            stopLoss: parameters.stopLoss,
            takeProfit: parameters.takeProfit,
            startDate: parameters.startDate,
            endDate: parameters.endDate,
            commission: parameters.commission,
            timeframe: timeframe
          });
          
          // 로딩 메시지 제거
          setMessages(prev => prev.filter(msg => !msg.isLoading));
          
          // 데이터 준비 완료 메시지 추가
          const dataReadyMessage = {
            id: messages.length + 2,
            type: 'assistant',
            content: `데이터 준비가 완료되었습니다. ${prepareRes.data.file_saved} 파일에 ${prepareRes.data.rows}개의 데이터가 저장되었습니다. 다음 기술 지표들이 추가되었습니다: ${prepareRes.data.indicators_added.join(', ')}`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, dataReadyMessage]);
          setPreparedData(prepareRes.data);
          
          // 백테스트 시작 메시지 추가
          const backtestStartMessage = {
            id: messages.length + 3,
            type: 'assistant',
            content: '이제 백테스트를 시작합니다...',
            isLoading: true,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, backtestStartMessage]);
          
          // 코드 생성 API 호출
          const genRes = await axios.post('http://127.0.0.1:8000/generate-code', {
            strategy: currentStrategy,
            capital: parameters.capital,
            capital_pct: parameters.capital_pct,
            stopLoss: parameters.stopLoss,
            takeProfit: parameters.takeProfit,
            startDate: parameters.startDate,
            endDate: parameters.endDate,
            commission: parameters.commission,
            timeframe: timeframe
          });
          
          const code = genRes.data.code;
          setCurrentCode(code);
          
          // 백테스트 실행 API 호출
          const backtestRes = await axios.post('http://127.0.0.1:8000/run-backtest', {
            code,
            capital: parameters.capital,
            capital_pct: parameters.capital_pct,
            stop_loss: parameters.stopLoss,
            take_profit: parameters.takeProfit,
            start_date: parameters.startDate,
            end_date: parameters.endDate,
            commission: parameters.commission,
            timeframe: timeframe
          });
          
          const backtestResult = backtestRes.data;
          
          // 로딩 메시지 제거
          setMessages(prev => prev.filter(msg => !msg.isLoading));
          
          // 백테스트 결과 메시지 추가
          const resultContent = `백테스트 결과: 총 수익률: ${backtestResult.total_return?.toFixed(2)}%, 거래 횟수: ${backtestResult.num_trades || 0}회, 승률: ${backtestResult.win_rate?.toFixed(2) || 0}%, 최대 낙폭: ${backtestResult.max_drawdown?.toFixed(2) || 0}%`;
          
          const responseMessage = {
            id: messages.length + 4,
            type: 'assistant',
            content: '', // 타이핑 효과로 채워질 예정
            code: '',
            timestamp: new Date(),
            isTyping: true,
            backtestResult: backtestResult
          };
          
          setMessages(prev => [...prev, responseMessage]);
          setCurrentTypingMessageId(messages.length + 4);
          setIsLoading(false);
          setIsConfirmingStrategy(false);
          
          // 타이핑 효과 시작
          startTypingEffect(resultContent, code);
          
          // 부모 컴포넌트에 백테스트 결과 전달
          if (onBacktestResult) {
            onBacktestResult(backtestResult, currentStrategy, {
              ...parameters,
              timeframe: timeframe
            });
          }
        } catch (error) {
          console.error('Error during data preparation or backtest:', error);
          
          // 로딩 메시지 제거
          setMessages(prev => prev.filter(msg => !msg.isLoading));
          
          // 에러 메시지 추가
          const errorContent = "죄송합니다. 데이터 준비 또는 백테스트 중 오류가 발생했습니다. 다시 시도해주세요.";
          const errorMessage = {
            id: messages.length + 2,
            type: 'error',
            content: '', // 타이핑 효과로 채워질 예정
            timestamp: new Date(),
            isTyping: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          setCurrentTypingMessageId(messages.length + 2);
          setIsLoading(false);
          setIsConfirmingStrategy(false);
          
          // 타이핑 효과 시작
          startTypingEffect(errorContent);
        }
      } else {
        // 사용자가 계속 진행하기를 원하지 않는 경우
        const userMessage = {
          id: messages.length + 1,
          type: 'user',
          content: inputMessage,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        
        const cancelMessage = {
          id: messages.length + 2,
          type: 'assistant',
          content: '백테스트가 취소되었습니다. 다른 전략이나 파라미터로 다시 시도해보세요.',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, cancelMessage]);
        setIsConfirmingStrategy(false);
      }
      
      return;
    }
    
    // 새로운 전략 입력 처리
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setCurrentStrategy(inputMessage); // 전략 저장
    
    // 로딩 메시지 추가
    const loadingMessage = {
      id: messages.length + 2,
      type: 'assistant',
      content: '전략을 분석 중입니다...',
      isLoading: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      // 전략 확인 API 호출
      const confirmRes = await axios.post('http://127.0.0.1:8000/confirm-strategy', {
        strategy: inputMessage,
        capital: parameters.capital,
        capital_pct: parameters.capital_pct,
        stopLoss: parameters.stopLoss,
        takeProfit: parameters.takeProfit,
        startDate: parameters.startDate,
        endDate: parameters.endDate,
        commission: parameters.commission,
        timeframe: timeframe
      });
      
      // 로딩 메시지 제거
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      // 전략 분석 결과
      const analysis = confirmRes.data.analysis;
      
      // 파라미터 확인 메시지 구성
      const confirmContent = `
트레이딩 전략을 분석했습니다.

【전략 분석】
• 사용 지표: ${analysis.indicators.join(', ')}
• 진입 조건: ${analysis.entry_conditions}
• 청산 조건: ${analysis.exit_conditions}
• 전략 유형: ${analysis.strategy_type}

【백테스트 파라미터】
• 자본금: ${parameters.capital} USDT
• 투입 비율: ${parameters.capital_pct * 100}%
• 손절: ${parameters.stopLoss}%
• 익절: ${parameters.takeProfit}%
• 기간: ${parameters.startDate} ~ ${parameters.endDate}
• 시간 간격: ${timeframe}
• 수수료율: ${parameters.commission * 100}%

이대로 백테스트를 진행하시겠습니까? '진행해줘'라고 답변해주세요.
      `;
      
      // 응답 메시지 추가
      const responseMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: confirmContent,
        timestamp: new Date(),
        analysis: analysis
      };
      
      setMessages(prev => [...prev, responseMessage]);
      setIsLoading(false);
      setIsConfirmingStrategy(true); // 전략 확인 모드로 변경
      
    } catch (error) {
      console.error('Error during strategy confirmation:', error);
      
      // 로딩 메시지 제거
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      // 에러 메시지 추가
      const errorContent = "죄송합니다. 전략 분석 중 오류가 발생했습니다. 다른 전략을 시도해보세요.";
      const errorMessage = {
        id: messages.length + 2,
        type: 'error',
        content: '', // 타이핑 효과로 채워질 예정
        timestamp: new Date(),
        isTyping: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setCurrentTypingMessageId(messages.length + 2);
      setIsLoading(false);
      setIsConfirmingStrategy(false);
      
      // 타이핑 효과 시작
      startTypingEffect(errorContent);
    }
  };

  // 코드 편집 시작
  const handleEditCode = (code) => {
    setEditableCode(code);
    setIsEditing(true);
  };

  // 수정된 코드 저장 및 백테스트 재실행
  const handleSaveEdit = async () => {
    setIsEditing(false);
    setCurrentCode(editableCode);
    setIsLoading(true);
    
    try {
      // 백테스트 재실행
      const backtestRes = await axios.post('http://127.0.0.1:8000/run-backtest', {
        code: editableCode,
        capital: parameters.capital,
        capital_pct: parameters.capital_pct,
        stop_loss: parameters.stopLoss,
        take_profit: parameters.takeProfit,
        start_date: parameters.startDate,
        end_date: parameters.endDate,
        commission: parameters.commission,
        timeframe: timeframe
      });
      
      const backtestResult = backtestRes.data;
      
      // 결과 메시지 추가
      const resultContent = `수정된 코드로 백테스트를 실행했습니다. 총 수익률: ${backtestResult.total_return?.toFixed(2)}%, 거래 횟수: ${backtestResult.num_trades || 0}회`;
      const resultMessage = {
        id: messages.length + 1,
        type: 'assistant',
        content: resultContent,
        code: editableCode,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, resultMessage]);
      setIsLoading(false);
      
      // 부모 컴포넌트에 백테스트 결과 전달
      if (onBacktestResult) {
        onBacktestResult(backtestResult, "사용자 정의 전략 (코드 수정)", {
          ...parameters,
          timeframe: timeframe
        });
      }
      
    } catch (error) {
      setIsLoading(false);
      
      // 에러 메시지 추가
      const errorMessage = {
        id: messages.length + 1,
        type: 'error',
        content: "코드 실행 중 오류가 발생했습니다. 코드를 확인해주세요.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 코드 편집 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableCode('');
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`chat-message ${message.type} ${message.isLoading ? 'loading' : ''}`}
          >
            {message.isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <div className="message-content">
                  {message.isTyping && currentTypingMessageId === message.id ? displayedContent : message.content}
                </div>
                
                {message.backtestResult && (
                  <div className="backtest-result">
                    <h4>백테스트 상세 결과</h4>
                    <div className="result-stats">
                      <div className="stat-item">
                        <span className="stat-label">총 수익률:</span>
                        <span className={`stat-value ${message.backtestResult.total_return >= 0 ? 'positive' : 'negative'}`}>
                          {message.backtestResult.total_return?.toFixed(2)}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">거래 횟수:</span>
                        <span className="stat-value">{message.backtestResult.num_trades || 0}회</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">승률:</span>
                        <span className="stat-value">{message.backtestResult.win_rate?.toFixed(2) || 0}%</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">최대 낙폭:</span>
                        <span className="stat-value negative">{message.backtestResult.max_drawdown?.toFixed(2) || 0}%</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">손익비:</span>
                        <span className="stat-value">{message.backtestResult.profit_loss_ratio?.toFixed(2) || 0}</span>
                      </div>
                    </div>
                    
                    {message.backtestResult.trade_history && message.backtestResult.trade_history.length > 0 && (
                      <div className="trade-history">
                        <h4>거래 내역</h4>
                        <div className="trades-container">
                          <table className="trades-table">
                            <thead>
                              <tr>
                                <th>진입일</th>
                                <th>청산일</th>
                                <th>진입가</th>
                                <th>청산가</th>
                                <th>손익</th>
                                <th>손익률</th>
                              </tr>
                            </thead>
                            <tbody>
                              {message.backtestResult.trade_history.map((trade, idx) => (
                                <tr key={idx} className={trade.pnl >= 0 ? 'profit' : 'loss'}>
                                  <td>{new Date(trade.entry_date).toLocaleDateString()}</td>
                                  <td>{new Date(trade.exit_date).toLocaleDateString()}</td>
                                  <td>{trade.entry_price?.toFixed(2)}</td>
                                  <td>{trade.exit_price?.toFixed(2)}</td>
                                  <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                                    {trade.pnl?.toFixed(2)}
                                  </td>
                                  <td className={trade.pnl_pct >= 0 ? 'positive' : 'negative'}>
                                    {(trade.pnl_pct * 100)?.toFixed(2)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {message.code && (
                  <div className="code-block">
                    <div className="code-header">
                      <span>생성된 Python 코드</span>
                      {!isEditing && (
                        <button 
                          className="edit-button"
                          onClick={() => handleEditCode(message.code)}
                        >
                          코드 수정
                        </button>
                      )}
                    </div>
                    <pre className="code-content">
                      <code>{message.code}</code>
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {isEditing ? (
        <div className="code-editor">
          <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            rows={10}
          ></textarea>
          <div className="editor-actions">
            <button onClick={handleCancelEdit}>취소</button>
            <button onClick={handleSaveEdit} disabled={isLoading}>
              {isLoading ? '실행 중...' : '저장 및 실행'}
            </button>
          </div>
        </div>
      ) : (
        <form className="chat-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder={isConfirmingStrategy ? "'진행해줘'라고 입력하세요..." : "트레이딩 전략을 자연어로 설명해주세요..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !inputMessage.trim()}>
            {isLoading ? '처리 중...' : '전송'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatInterface; 