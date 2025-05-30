import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/ChatInterface.css';
import ResultChart from './ResultChart';

const ChatInterface = ({ onBacktestStart }) => {
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
  const [parameters, setParameters] = useState({
    capital: 10000,
    capital_pct: 0.3,
    stopLoss: 2,
    takeProfit: 5,
    startDate: '2024-01-01',
    endDate: '2024-01-10',
    commission: 0.0004,
    timeframe: '15m'
  });
  
  // Binance API 데이터 표시를 위한 상태 추가
  const [priceData, setPriceData] = useState([]);
  const [showPriceData, setShowPriceData] = useState(false);
  const [priceDataStats, setPriceDataStats] = useState(null);
  const [loadingPriceData, setLoadingPriceData] = useState(false);
  const [priceDataError, setPriceDataError] = useState('');
  
  // 페이지네이션과 정렬을 위한 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // 타이핑 효과를 위한 상태 추가
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState(null);
  const [displayedContent, setDisplayedContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typingCode, setTypingCode] = useState('');
  const [isCodeTyping, setIsCodeTyping] = useState(false);
  
  const [showParameters, setShowParameters] = useState(false);
  const messagesEndRef = useRef(null);

  // 새 메시지가 추가될 때마다 스크롤 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedContent]);

  // 타이핑 효과 구현
  useEffect(() => {
    // 코드 타이핑 효과 내부 함수
    const startCodeTypingInner = () => {
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
      
      return () => clearInterval(codeTypingInterval);
    };

    if (isTyping && currentIndex < fullContent.length) {
      const typingTimer = setTimeout(() => {
        setDisplayedContent(prev => prev + fullContent.charAt(currentIndex));
        setCurrentIndex(prev => prev + 1);
      }, 15); // 타이핑 속도 조절 (밀리초)
      
      return () => clearTimeout(typingTimer);
    } else if (isTyping && currentIndex >= fullContent.length) {
      // 텍스트 타이핑 완료 후 코드 타이핑 시작
      if (isCodeTyping) {
        startCodeTypingInner();
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

  // 메시지 전송 처리
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
    
    // 트레이딩 관련 입력인지 확인
    const tradingKeywords = ['매수', '매도', '트레이딩', '전략', 'RSI', 'MACD', '이동평균', '볼린저', '지표', '지지선', '저항선', '캔들', '차트', '백테스트', '수익률', '손절', '익절'];
    const hasTradingKeyword = tradingKeywords.some(keyword => inputMessage.includes(keyword));
    
    if (!hasTradingKeyword) {
      // 트레이딩 관련 입력이 아닌 경우 가이드 메시지 표시
      const guideMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: '트레이딩 전략에 대해 말씀해주세요. 예를 들어 "RSI가 30 이하일 때 매수하고, 70 이상일 때 매도하는 전략을 테스트해줘" 또는 "20일 이동평균선이 50일 이동평균선을 상향 돌파할 때 매수하는 전략"과 같이 구체적인 트레이딩 규칙을 알려주시면 코드로 변환하고 백테스트를 수행할 수 있습니다.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, guideMessage]);
      setIsLoading(false);
      return;
    }
    
    try {
      // API 호출하여 코드 생성
      const genRes = await axios.post('http://127.0.0.1:8000/generate-code', {
        strategy: inputMessage,
        capital: parameters.capital,
        capital_pct: parameters.capital_pct,
        stopLoss: parameters.stopLoss,
        takeProfit: parameters.takeProfit,
        startDate: parameters.startDate,
        endDate: parameters.endDate,
        commission: parameters.commission,
        timeframe: parameters.timeframe,
      });
      
      const generatedCode = genRes.data.code;
      setCurrentCode(generatedCode);
      
      // 응답 메시지 추가 (타이핑 효과와 함께)
      const responseContent = '전략을 분석했습니다. 아래는 생성된 코드입니다. 수정하거나 백테스트를 실행할 수 있습니다.';
      const assistantMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: '', // 타이핑 효과로 채워질 예정
        code: '', // 타이핑 효과로 채워질 예정
        timestamp: new Date(),
        isTyping: true,
        typingCode: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentTypingMessageId(messages.length + 2);
      setIsLoading(false);
      
      // 타이핑 효과 시작
      startTypingEffect(responseContent, generatedCode);
      
    } catch (error) {
      // 에러 메시지 추가
      const errorContent = '코드 생성 중 오류가 발생했습니다. 다른 전략을 시도해주세요.';
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
      
      // 타이핑 효과 시작
      startTypingEffect(errorContent);
      
      console.error('Error generating code:', error);
    }
  };

  // 코드 수정 시작
  const handleEditCode = (code) => {
    setEditableCode(code);
    setIsEditing(true);
  };

  // 코드 수정 저장
  const handleSaveEdit = () => {
    setCurrentCode(editableCode);
    
    // 수정된 코드 메시지 추가
    const editMessage = {
      id: messages.length + 1,
      type: 'system',
      content: '코드가 수정되었습니다.',
      code: editableCode,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, editMessage]);
    setIsEditing(false);
  };

  // 코드 수정 취소
  const handleCancelEdit = () => {
    setEditableCode('');
    setIsEditing(false);
  };

  // 백테스트 실행 & 가격 데이터 가져오기
  const handleRunBacktest = async () => {
    if (!currentCode) return;
    
    setIsLoading(true);
    
    try {
      // 백테스트 API 호출
      console.log('백테스트 요청 파라미터:', {
        code: currentCode.slice(0, 100) + '...',
        capital: parseFloat(parameters.capital),
        capital_pct: parseFloat(parameters.capital_pct),
        stop_loss: parseFloat(parameters.stopLoss),
        take_profit: parseFloat(parameters.takeProfit),
        start_date: parameters.startDate,
        end_date: parameters.endDate,
        commission: parseFloat(parameters.commission),
        timeframe: parameters.timeframe
      });
      
      const backtestRes = await axios.post('http://127.0.0.1:8000/run-backtest', {
        code: currentCode,
        capital: parseFloat(parameters.capital),
        capital_pct: parseFloat(parameters.capital_pct),
        stop_loss: parseFloat(parameters.stopLoss),
        take_profit: parseFloat(parameters.takeProfit),
        start_date: parameters.startDate,
        end_date: parameters.endDate,
        commission: parseFloat(parameters.commission),
        timeframe: parameters.timeframe
      });
      
      const result = backtestRes.data;
      console.log('백테스트 결과:', result);
      
      // 결과 유효성 검증
      if (!result.equity_curve || !result.equity_curve.labels || result.equity_curve.labels.length === 0) {
        throw new Error('백테스트 결과에 유효한 equity_curve 데이터가 없습니다.');
      }
      
      // 실제 트레이딩 내역 또는 생성된 트레이딩 내역 사용
      let tradeHistory = [];
      
      // 백엔드에서 제공한 거래 내역이 있는 경우
      if (result.trade_history && result.trade_history.length > 0) {
        console.log('백엔드에서 제공한 거래 내역 사용:', result.trade_history.length);
        tradeHistory = result.trade_history.map(trade => ({
          date: trade.entry_date.split(' ')[0], // 날짜 부분만 추출
          action: '매수',
          price: parseFloat(trade.entry_price).toFixed(2),
          returnPct: parseFloat(trade.pnl_pct).toFixed(2)
        }));
      } 
      // 없는 경우 프론트에서 생성
      else {
        console.log('프론트에서 생성한 거래 내역 사용');
        const numTrades = result.num_trades || 0;
        console.log(`트레이딩 수: ${numTrades}, 기간 길이: ${result.equity_curve.labels.length}`);
        
        // 전체 기간을 트레이드 수로 나누어 대략적인 거래 시점 배치
        if (numTrades > 0) {
          const totalDays = result.equity_curve.labels.length;
          const interval = Math.max(1, Math.floor(totalDays / numTrades));
          
          let capital = parseFloat(parameters.capital);
          
          for (let i = 0; i < numTrades && i * interval < totalDays; i++) {
            const dayIndex = i * interval;
            const date = result.equity_curve.labels[dayIndex];
            const price = result.equity_curve.values[dayIndex] / capital;
            
            // 거래 방향은 랜덤으로 결정 (정확한 정보가 없으므로)
            const isBuy = i % 2 === 0;
            const action = isBuy ? '매수' : '매도';
            
            // 수익률 계산 (이전 값과 현재 값의 차이)
            const prevValue = i > 0 ? result.equity_curve.values[dayIndex - 1] : capital;
            const currentValue = result.equity_curve.values[dayIndex];
            const returnPct = ((currentValue - prevValue) / prevValue * 100).toFixed(2);
            
            tradeHistory.push({
              date,
              action,
              price: price.toFixed(2),
              returnPct: isBuy ? '0.00' : returnPct
            });
          }
        }
      }
      
      // 백테스트 실행 메시지 추가
      const backtestMessage = {
        id: messages.length + 1,
        type: 'assistant',
        content: `백테스트 실행 결과입니다. 총 ${result.num_trades}개의 거래가 발생했고, 총 수익률은 ${result.total_return}%입니다.`,
        backtestResult: result,
        tradeHistory: tradeHistory,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, backtestMessage]);
      
      // 추가: Binance API 데이터 가져오기
      setLoadingPriceData(true);
      setPriceDataError('');
      setShowPriceData(true);
      
      try {
        const priceDataRes = await axios.post('http://127.0.0.1:8000/debug/fetch-data', {
          start_date: parameters.startDate,
          end_date: parameters.endDate,
          max_data_points: 10000,
          timeframe: parameters.timeframe
        });
        
        if (priceDataRes.data && priceDataRes.data.data) {
          const ohlcvData = priceDataRes.data.data;
          setPriceData(ohlcvData);
          
          // 간단한 통계 계산
          if (ohlcvData.length > 0) {
            const openPrices = ohlcvData.map(item => parseFloat(item.open));
            const closePrices = ohlcvData.map(item => parseFloat(item.close));
            const highPrices = ohlcvData.map(item => parseFloat(item.high));
            const lowPrices = ohlcvData.map(item => parseFloat(item.low));
            const volumes = ohlcvData.map(item => parseFloat(item.volume));
            
            const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
            const maxHigh = Math.max(...highPrices);
            const minLow = Math.min(...lowPrices);
            const volatility = ((maxHigh - minLow) / minLow) * 100;
            const overallReturn = ((closePrices[closePrices.length - 1] - openPrices[0]) / openPrices[0]) * 100;
            
            // 상승/하락 데이터 포인트 수 계산
            let upCount = 0;
            let downCount = 0;
            let noChangeCount = 0;
            
            for (let i = 1; i < ohlcvData.length; i++) {
              const prevClose = parseFloat(ohlcvData[i-1].close);
              const currentClose = parseFloat(ohlcvData[i].close);
              
              if (currentClose > prevClose) upCount++;
              else if (currentClose < prevClose) downCount++;
              else noChangeCount++;
            }
            
            // 최대 상승/하락 구간 찾기
            let maxConsecutiveUp = 0;
            let maxConsecutiveDown = 0;
            let currentConsecutiveUp = 0;
            let currentConsecutiveDown = 0;
            
            for (let i = 1; i < ohlcvData.length; i++) {
              const prevClose = parseFloat(ohlcvData[i-1].close);
              const currentClose = parseFloat(ohlcvData[i].close);
              
              if (currentClose > prevClose) {
                currentConsecutiveUp++;
                currentConsecutiveDown = 0;
                maxConsecutiveUp = Math.max(maxConsecutiveUp, currentConsecutiveUp);
              } else if (currentClose < prevClose) {
                currentConsecutiveDown++;
                currentConsecutiveUp = 0;
                maxConsecutiveDown = Math.max(maxConsecutiveDown, currentConsecutiveDown);
              } else {
                currentConsecutiveUp = 0;
                currentConsecutiveDown = 0;
              }
            }
            
            const stats = {
              dataPoints: ohlcvData.length,
              startPrice: openPrices[0].toFixed(2),
              endPrice: closePrices[closePrices.length - 1].toFixed(2),
              highestPrice: maxHigh.toFixed(2),
              lowestPrice: minLow.toFixed(2),
              volatility: volatility.toFixed(2),
              averageVolume: avgVolume.toFixed(2),
              overallReturn: overallReturn.toFixed(2),
              upCount,
              downCount,
              noChangeCount,
              maxConsecutiveUp,
              maxConsecutiveDown,
              timeframe: parameters.timeframe,
              dateRange: `${new Date(ohlcvData[0].timestamp).toLocaleDateString()} ~ ${new Date(ohlcvData[ohlcvData.length-1].timestamp).toLocaleDateString()}`
            };
            
            setPriceDataStats(stats);
          }
        }
      } catch (priceDataError) {
        console.error('가격 데이터 가져오기 오류:', priceDataError);
        setPriceDataError(`가격 데이터 가져오기 오류: ${priceDataError.message}`);
      } finally {
        setLoadingPriceData(false);
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('백테스트 오류 상세 정보:', error);
      
      // 에러 메시지 추가 (타이핑 효과와 함께)
      const errorContent = `백테스트 실행 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}. 코드를 수정하거나 다른 전략을 시도해주세요.`;
      const errorMessage = {
        id: messages.length + 1,
        type: 'error',
        content: '', // 타이핑 효과로 채워질 예정
        timestamp: new Date(),
        isTyping: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setCurrentTypingMessageId(messages.length + 1);
      setIsLoading(false);
      
      // 타이핑 효과 시작
      startTypingEffect(errorContent);
    }
  };

  // 파라미터 업데이트
  const handleParameterChange = (e) => {
    const { name, value } = e.target;
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 정렬 처리 함수
  const handleSort = (field) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 정렬 방향 전환
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 새 필드 선택 시 오름차순으로 시작
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 정렬된 데이터 계산
  const getSortedData = () => {
    if (!priceData.length) return [];
    
    return [...priceData].sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'timestamp') {
        aValue = new Date(a[sortField]).getTime();
        bValue = new Date(b[sortField]).getTime();
      } else {
        aValue = parseFloat(a[sortField]);
        bValue = parseFloat(b[sortField]);
      }
      
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };
  
  // 현재 페이지 데이터 계산
  const getCurrentPageData = () => {
    const sortedData = getSortedData();
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  };
  
  // 페이지 이동
  const goToPage = (page) => {
    setCurrentPage(page);
  };
  
  // 페이지 버튼 생성
  const getPageButtons = () => {
    const totalPages = Math.ceil(priceData.length / rowsPerPage);
    const buttons = [];
    
    // 현재 페이지 주변 5개 페이지만 표시
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
      buttons.push(
        <button key="first" onClick={() => goToPage(1)}>1</button>
      );
      if (startPage > 2) {
        buttons.push(<span key="dots1">...</span>);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button 
          key={i} 
          className={i === currentPage ? 'active' : ''}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="dots2">...</span>);
      }
      buttons.push(
        <button key="last" onClick={() => goToPage(totalPages)}>
          {totalPages}
        </button>
      );
    }
    
    return buttons;
  };
  
  // 행 표시 개수 변경
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // 페이지 1로 리셋
  };

  return (
    <div className="chat-interface">
      <div className="chat-parameters">
        <button 
          className="toggle-params-btn"
          onClick={() => setShowParameters(!showParameters)}
        >
          {showParameters ? '파라미터 숨기기' : '백테스트 파라미터 설정'}
        </button>
        
        <div className={`parameters-form ${showParameters ? 'show' : ''}`}>
          <div className="form-row">
            <div className="input-group">
              <label>자본금 (USDT)</label>
              <input 
                type="number" 
                name="capital" 
                value={parameters.capital}
                onChange={handleParameterChange}
              />
            </div>
            
            <div className="input-group">
              <label>투입비율 (0~1)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                max="1" 
                name="capital_pct" 
                value={parameters.capital_pct}
                onChange={handleParameterChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="input-group">
              <label>Stop Loss (%)</label>
              <input 
                type="number" 
                name="stopLoss" 
                value={parameters.stopLoss}
                onChange={handleParameterChange}
              />
            </div>
            
            <div className="input-group">
              <label>Take Profit (%)</label>
              <input 
                type="number" 
                name="takeProfit" 
                value={parameters.takeProfit}
                onChange={handleParameterChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="input-group">
              <label>백테스트 시작일</label>
              <input 
                type="date" 
                name="startDate"
                value={parameters.startDate}
                onChange={handleParameterChange}
              />
            </div>
            
            <div className="input-group">
              <label>백테스트 종료일</label>
              <input 
                type="date" 
                name="endDate"
                value={parameters.endDate}
                onChange={handleParameterChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="input-group">
              <label>시간 간격</label>
              <select 
                name="timeframe" 
                value={parameters.timeframe}
                onChange={handleParameterChange}
              >
                <option value="1m">1분</option>
                <option value="5m">5분</option>
                <option value="15m">15분</option>
                <option value="30m">30분</option>
                <option value="1h">1시간</option>
                <option value="4h">4시간</option>
                <option value="1d">일봉</option>
              </select>
            </div>
            
            <div className="input-group">
              <label>수수료율</label>
              <input 
                type="number" 
                step="0.0001" 
                name="commission" 
                value={parameters.commission}
                onChange={handleParameterChange}
              />
            </div>
          </div>
          
          <div className="preset-dates">
            <label>기간 프리셋:</label>
            <div className="preset-buttons">
              <button 
                type="button" 
                onClick={() => setParameters(prev => ({
                  ...prev,
                  startDate: '2024-01-01',
                  endDate: '2024-01-31'
                }))}
              >
                2024년 1월
              </button>
              <button 
                type="button" 
                onClick={() => setParameters(prev => ({
                  ...prev,
                  startDate: '2023-06-01',
                  endDate: '2023-06-30'
                }))}
              >
                2023년 6월
              </button>
              <button 
                type="button" 
                onClick={() => setParameters(prev => ({
                  ...prev,
                  startDate: '2023-01-01',
                  endDate: '2023-03-31'
                }))}
              >
                2023년 1분기
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.type} ${message.isTyping ? 'typing' : ''}`}
          >
            <div className="message-content">
              {message.isTyping && message.id === currentTypingMessageId 
                ? <span>{displayedContent}<span className="cursor"></span></span> 
                : message.content}
              
              {message.code && (
                <div className="code-block">
                  <div className="code-header">
                    <span>Python 코드</span>
                    <button 
                      className="edit-code-btn"
                      onClick={() => handleEditCode(message.code)}
                    >
                      수정
                    </button>
                  </div>
                  <pre>
                    <code>
                      {message.code}
                      {message.typingCode && <span className="code-cursor">|</span>}
                    </code>
                  </pre>
                </div>
              )}
              
              {message.backtestResult && (
                <div className="backtest-result">
                  <div className="result-header">
                    <h3>백테스트 결과</h3>
                  </div>
                  <div className="performance-metrics">
                    <h4>주요 성과 지표</h4>
                    <ul>
                      <li><b>총 수익률:</b> {message.backtestResult.total_return ? `${message.backtestResult.total_return}%` : '-'}</li>
                      <li><b>최대 낙폭:</b> {message.backtestResult.max_drawdown || '-'}</li>
                      <li><b>트레이드 수:</b> {message.backtestResult.num_trades || '-'}</li>
                      <li><b>승률:</b> {message.backtestResult.win_rate ? `${message.backtestResult.win_rate}%` : '-'}</li>
                      <li><b>수익/손실 비율:</b> {message.backtestResult.profit_loss_ratio || '-'}</li>
                    </ul>
                  </div>
                  
                  {message.tradeHistory && message.tradeHistory.length > 0 && (
                    <div className="trade-history">
                      <h4>트레이딩 내역</h4>
                      <div className="trade-table-container">
                        <table className="trade-table">
                          <thead>
                            <tr>
                              <th>날짜</th>
                              <th>거래</th>
                              <th>가격</th>
                              <th>수익률</th>
                            </tr>
                          </thead>
                          <tbody>
                            {message.tradeHistory.map((trade, index) => (
                              <tr key={index} className={trade.action === '매수' ? 'buy-trade' : 'sell-trade'}>
                                <td>{trade.date}</td>
                                <td>{trade.action}</td>
                                <td>{trade.price}</td>
                                <td className={parseFloat(trade.returnPct) >= 0 ? 'positive-return' : 'negative-return'}>
                                  {trade.returnPct}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {message.backtestResult.equity_curve && (
                    <div className="result-chart">
                      <ResultChart data={{
                        labels: message.backtestResult.equity_curve.timestamps || message.backtestResult.equity_curve.labels || [],
                        values: message.backtestResult.equity_curve.values || []
                      }} />
                    </div>
                  )}
                </div>
              )}
              
              {message.priceDataStats && (
                <div className="price-data-message">
                  <div className="data-stats">
                    <h4>가격 데이터 통계</h4>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">데이터 포인트 수:</span>
                        <span className="stat-value">{message.priceDataStats.dataPoints}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">날짜 범위:</span>
                        <span className="stat-value">{message.priceDataStats.dateRange}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">캔들 시간 간격:</span>
                        <span className="stat-value">{message.priceDataStats.timeframe}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">시작 가격:</span>
                        <span className="stat-value">${message.priceDataStats.startPrice}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">종료 가격:</span>
                        <span className="stat-value">${message.priceDataStats.endPrice}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">최고 가격:</span>
                        <span className="stat-value">${message.priceDataStats.highestPrice}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">최저 가격:</span>
                        <span className="stat-value">${message.priceDataStats.lowestPrice}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">변동성:</span>
                        <span className="stat-value">{message.priceDataStats.volatility}%</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">전체 수익률:</span>
                        <span className={`stat-value ${parseFloat(message.priceDataStats.overallReturn) >= 0 ? 'positive' : 'negative'}`}>
                          {message.priceDataStats.overallReturn}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">상승/하락/유지:</span>
                        <span className="stat-value">
                          <span className="positive">{message.priceDataStats.upCount}</span> / 
                          <span className="negative">{message.priceDataStats.downCount}</span> / 
                          <span>{message.priceDataStats.noChangeCount}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {message.priceData && (
                    <div className="data-table-container">
                      <h4>OHLCV 데이터 샘플 (총 {message.totalDataPoints}개 중 처음 20개)</h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>타임스탬프</th>
                            <th>시가</th>
                            <th>고가</th>
                            <th>저가</th>
                            <th>종가</th>
                            <th>거래량</th>
                          </tr>
                        </thead>
                        <tbody>
                          {message.priceData.map((item, index) => (
                            <tr key={index}>
                              <td>{new Date(item.timestamp).toLocaleString()}</td>
                              <td>{parseFloat(item.open).toFixed(2)}</td>
                              <td>{parseFloat(item.high).toFixed(2)}</td>
                              <td>{parseFloat(item.low).toFixed(2)}</td>
                              <td>{parseFloat(item.close).toFixed(2)}</td>
                              <td>{parseFloat(item.volume).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {isEditing && (
        <div className="code-editor">
          <div className="editor-header">
            <h3>코드 수정</h3>
            <div className="editor-actions">
              <button 
                className="cancel-btn"
                onClick={handleCancelEdit}
              >
                취소
              </button>
              <button 
                className="save-btn"
                onClick={handleSaveEdit}
              >
                저장
              </button>
            </div>
          </div>
          <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            spellCheck="false"
          />
        </div>
      )}
      
      <div className="chat-input">
        <form onSubmit={handleSendMessage}>
          <textarea
            placeholder="트레이딩 전략을 자연어로 설명해주세요..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            disabled={isTyping || isLoading}
          />
          <div className="input-actions">
            {currentCode && (
              <button 
                type="button" 
                className="backtest-btn"
                onClick={handleRunBacktest}
                disabled={isTyping || isLoading}
              >
                백테스트 실행
              </button>
            )}
            <button 
              type="submit" 
              className="send-btn"
              disabled={isTyping || isLoading || !inputMessage.trim()}
            >
              전송
            </button>
          </div>
        </form>
      </div>
      
      {/* 가격 데이터 섹션 (채팅 UI 아래에 추가) */}
      {showPriceData && (
        <div className="price-data-section">
          <div className="section-header">
            <h3>가격 데이터 통계</h3>
            <button
              className="close-section-btn"
              onClick={() => setShowPriceData(false)}
            >
              닫기
            </button>
          </div>
          
          {loadingPriceData ? (
            <div className="loading-indicator price-data-loading">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : priceDataError ? (
            <div className="error-message">{priceDataError}</div>
          ) : (
            <>
              {priceDataStats && (
                <div className="data-stats-grid">
                  <div className="stats-header">
                    <div className="stat-item main-stat">
                      <span className="stat-label">데이터 포인트 수:</span>
                      <span className="stat-value">{priceDataStats.dataPoints}</span>
                    </div>
                    
                    <div className="stat-item main-stat">
                      <span className="stat-label">날짜 범위:</span>
                      <span className="stat-value">{priceDataStats.dateRange}</span>
                    </div>
                    
                    <div className="stat-item main-stat">
                      <span className="stat-label">캔들 시간 간격:</span>
                      <span className="stat-value">{priceDataStats.timeframe}</span>
                    </div>
                    
                    <div className="stat-item main-stat">
                      <span className="stat-label">시작 가격:</span>
                      <span className="stat-value">${priceDataStats.startPrice}</span>
                    </div>
                    
                    <div className="stat-item main-stat">
                      <span className="stat-label">종료 가격:</span>
                      <span className="stat-value">${priceDataStats.endPrice}</span>
                    </div>
                    
                    <div className="stat-item main-stat">
                      <span className="stat-label">전체 수익률:</span>
                      <span className={`stat-value ${parseFloat(priceDataStats.overallReturn) >= 0 ? 'positive' : 'negative'}`}>
                        {priceDataStats.overallReturn}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">최고 가격:</span>
                      <span className="stat-value">${priceDataStats.highestPrice}</span>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">최저 가격:</span>
                      <span className="stat-value">${priceDataStats.lowestPrice}</span>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">변동성:</span>
                      <span className="stat-value">{priceDataStats.volatility}%</span>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">상승/하락/유지:</span>
                      <span className="stat-value">
                        <span className="positive">{priceDataStats.upCount}</span> / 
                        <span className="negative">{priceDataStats.downCount}</span> / 
                        <span>{priceDataStats.noChangeCount}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {priceData.length > 0 && (
                <div className="price-data-table-container">
                  <div className="table-header">
                    <h4>OHLCV 데이터 (총 {priceData.length}개)</h4>
                    <div className="table-controls">
                      <div className="rows-per-page">
                        <label>표시 개수:</label>
                        <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="page-info">
                        페이지 {currentPage} / {Math.ceil(priceData.length / rowsPerPage)}
                      </div>
                    </div>
                  </div>
                  <div className="table-wrapper">
                    <table className="price-data-table">
                      <thead>
                        <tr>
                          <th 
                            className={sortField === 'timestamp' ? `sorted ${sortDirection}` : ''}
                            onClick={() => handleSort('timestamp')}
                          >
                            타임스탬프
                          </th>
                          <th 
                            className={sortField === 'open' ? `sorted ${sortDirection}` : ''}
                            onClick={() => handleSort('open')}
                          >
                            시가
                          </th>
                          <th 
                            className={sortField === 'high' ? `sorted ${sortDirection}` : ''}
                            onClick={() => handleSort('high')}
                          >
                            고가
                          </th>
                          <th 
                            className={sortField === 'low' ? `sorted ${sortDirection}` : ''}
                            onClick={() => handleSort('low')}
                          >
                            저가
                          </th>
                          <th 
                            className={sortField === 'close' ? `sorted ${sortDirection}` : ''}
                            onClick={() => handleSort('close')}
                          >
                            종가
                          </th>
                          <th 
                            className={sortField === 'volume' ? `sorted ${sortDirection}` : ''}
                            onClick={() => handleSort('volume')}
                          >
                            거래량
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getCurrentPageData().map((item, index) => {
                          return (
                            <tr key={index}>
                              <td>{new Date(item.timestamp).toLocaleString()}</td>
                              <td>{parseFloat(item.open).toFixed(2)}</td>
                              <td>{parseFloat(item.high).toFixed(2)}</td>
                              <td>{parseFloat(item.low).toFixed(2)}</td>
                              <td>{parseFloat(item.close).toFixed(2)}</td>
                              <td>{parseFloat(item.volume).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button 
                      onClick={() => goToPage(1)} 
                      disabled={currentPage === 1}
                    >
                      &laquo;
                    </button>
                    <button 
                      onClick={() => goToPage(currentPage - 1)} 
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </button>
                    {getPageButtons()}
                    <button 
                      onClick={() => goToPage(currentPage + 1)} 
                      disabled={currentPage === Math.ceil(priceData.length / rowsPerPage)}
                    >
                      &gt;
                    </button>
                    <button 
                      onClick={() => goToPage(Math.ceil(priceData.length / rowsPerPage))} 
                      disabled={currentPage === Math.ceil(priceData.length / rowsPerPage)}
                    >
                      &raquo;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInterface; 