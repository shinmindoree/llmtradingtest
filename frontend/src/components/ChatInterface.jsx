import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/ChatInterface.css';
import { FaRegCopy, FaRegEdit } from 'react-icons/fa';

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
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editableCode, setEditableCode] = useState('');
  
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
  const startTypingEffect = (content, code = null, messageId = null) => {
    setFullContent(content);
    setDisplayedContent('');
    setCurrentIndex(0);
    setIsTyping(true);

    if (code && messageId) {
      // 메시지의 content와 code를 각각 타이핑 효과로 업데이트
      let idx = 0;
      let codeIdx = 0;
      const typeChar = () => {
        setMessages(prevMsgs => prevMsgs.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: content.slice(0, Math.min(idx + 1, content.length)),
                code: code.slice(0, Math.max(0, codeIdx))
              }
            : msg
        ));
        if (idx < content.length) idx++;
        if (codeIdx < code.length) codeIdx += 10; // 코드 타이핑은 10글자씩
        if (idx < content.length || codeIdx < code.length) {
          setTimeout(typeChar, 15);
        } else {
          setIsTyping(false);
          setMessages(prevMsgs => prevMsgs.map(msg =>
            msg.id === messageId
              ? { ...msg, isTyping: false, content, code }
              : msg
          ));
        }
      };
      typeChar();
      return;
    }

    // content만 타이핑 효과 (코멘트 메시지)
    if (messageId) {
      let idx = 0;
      const typeChar = () => {
        setMessages(prevMsgs => prevMsgs.map(msg =>
          msg.id === messageId ? { ...msg, content: content.slice(0, idx + 1) } : msg
        ));
        idx++;
        if (idx < content.length) {
          setTimeout(typeChar, 15);
        } else {
          setIsTyping(false);
          setMessages(prevMsgs => prevMsgs.map(msg =>
            msg.id === messageId ? { ...msg, isTyping: false, content } : msg
          ));
        }
      };
      typeChar();
    }
  };

  // 메시지 전송 처리 (수정됨 - 타이핑 효과 적용, 코멘트 메시지 유지)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

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
    setCurrentStrategy(inputMessage); // 전략 저장

    try {
      // 1. 전략 분석(코멘트) 타이핑 효과로 출력
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
      const analysis = confirmRes.data.analysis;
      const analysisContent = `\n【전략 분석】\n• 사용 지표: ${analysis.indicators.join(', ')}\n• 진입 조건: ${analysis.entry_conditions}\n• 청산 조건: ${analysis.exit_conditions}\n• 전략 유형: ${analysis.strategy_type}`;
      const analysisMessageId = messages.length + 2;
      const analysisMessage = {
        id: analysisMessageId,
        type: 'assistant',
        content: '', // 타이핑 효과로 채워질 예정
        timestamp: new Date(),
        isTyping: true,
        analysis: analysis
      };
      setMessages(prev => [...prev, analysisMessage]);
      setCurrentTypingMessageId(analysisMessageId);
      // 분석 코멘트 타이핑 효과 시작 (messageId 전달)
      await new Promise((resolve) => {
        startTypingEffect(analysisContent, null, analysisMessageId);
        // 타이핑 효과가 끝날 때까지 대기
        const checkTyping = () => {
          setTimeout(() => {
            if (!isTyping) resolve();
            else checkTyping();
          }, 50);
        };
        checkTyping();
      });

      // 2. 코드 생성 API 호출 및 코드 타이핑 효과로 출력
      const genRes = await axios.post('http://127.0.0.1:8000/generate-code', {
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
      const code = genRes.data.code;
      setCurrentCode(code);
      setEditableCode(code);
      const codeMessageId = messages.length + 3;
      const codeMessage = {
        id: codeMessageId,
        type: 'assistant',
        content: '', // 타이핑 효과로 채워질 예정
        code: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, codeMessage]);
      setCurrentTypingMessageId(codeMessageId);
      // 코드 타이핑 효과 시작 (messageId 전달)
      await new Promise((resolve) => {
        startTypingEffect('아래는 변환된 Python 코드입니다. 필요시 바로 수정 후 실행할 수 있습니다.', code, codeMessageId);
        // 코드 타이핑 효과가 끝날 때까지 대기
        const checkTyping = () => {
          setTimeout(() => {
            if (!isTyping && !isCodeTyping) resolve();
            else checkTyping();
          }, 50);
        };
        checkTyping();
      });
      setEditingMessageId(codeMessageId); // 코드 에디터 활성화
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      const errorMessage = {
        id: messages.length + 2,
        type: 'error',
        content: '전략 분석 또는 코드 변환 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 코드 편집 시작
  const handleEditCode = (messageId, code) => {
    setEditingMessageId(messageId);
    setEditableCode(code);
  };

  // 수정된 코드 저장 및 백테스트 재실행
  const handleSaveEdit = async (messageId) => {
    setIsLoading(true);
    setEditingMessageId(null);
    setCurrentCode(editableCode);
    try {
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
      if (onBacktestResult) {
        onBacktestResult(backtestResult, '사용자 정의 전략 (코드 수정)', {
          ...parameters,
          timeframe: timeframe
        });
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = {
        id: messages.length + 1,
        type: 'error',
        content: '코드 실행 중 오류가 발생했습니다. 코드를 확인해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // 코드 편집 취소
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditableCode('');
  };

  const handleCopyCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
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
                  <div className="gpt-code-block">
                    <div className="gpt-code-header">
                      <span className="gpt-code-title">생성된 Python 코드</span>
                      <div className="gpt-code-actions">
                        <button
                          className="gpt-code-btn"
                          title="코드 복사"
                          onClick={() => handleCopyCode(message.code)}
                        >
                          <FaRegCopy /> 복사
                        </button>
                        {editingMessageId !== message.id && (
                          <button
                            className="gpt-code-btn"
                            title="코드 수정"
                            onClick={() => handleEditCode(message.id, message.code)}
                            disabled={isLoading}
                          >
                            <FaRegEdit /> 수정
                          </button>
                        )}
                      </div>
                    </div>
                    {editingMessageId === message.id ? (
                      <>
                        <textarea
                          value={editableCode}
                          onChange={e => setEditableCode(e.target.value)}
                          rows={Math.max(10, editableCode.split('\n').length)}
                          className="gpt-code-editor-textarea"
                        ></textarea>
                        <div className="gpt-editor-actions">
                          <button onClick={handleCancelEdit} disabled={isLoading}>취소</button>
                          <button onClick={() => handleSaveEdit(message.id)} disabled={isLoading}>
                            {isLoading ? '실행 중...' : '저장 및 실행'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <pre className="gpt-code-content">
                        <code>{message.code}</code>
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="트레이딩 전략을 자연어로 설명해주세요..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputMessage.trim()}>
          {isLoading ? '처리 중...' : '전송'}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 