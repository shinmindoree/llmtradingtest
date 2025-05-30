import React, { useState } from 'react';
import axios from 'axios';
import '../styles/DebugPage.css';

const DebugPage = () => {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-05');
  const [maxDataPoints, setMaxDataPoints] = useState(5000);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [apiCallLogs, setApiCallLogs] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(null);
  
  // 페이지네이션과 정렬 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // 캔들 시간 간격 상태 추가
  const [timeframe, setTimeframe] = useState('15m');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setApiCallLogs([]);
    setLoadingProgress({
      status: '데이터 요청 중...',
      progress: 0
    });
    
    try {
      const response = await axios.post('http://127.0.0.1:8001/debug/fetch-data', {
        start_date: startDate,
        end_date: endDate,
        max_data_points: maxDataPoints,
        timeframe: timeframe // 캔들 시간 간격 파라미터 추가
      });
      
      if (response.data && response.data.data) {
        setData(response.data.data);
        setCurrentPage(1); // 새 데이터를 로드하면 첫 페이지로 이동
        
        // API 호출 로그 저장
        if (response.data.logs) {
          setApiCallLogs(response.data.logs);
        }
        
        // 간단한 통계 계산
        const ohlcData = response.data.data;
        if (ohlcData.length > 0) {
          const openPrices = ohlcData.map(item => parseFloat(item.open));
          const closePrices = ohlcData.map(item => parseFloat(item.close));
          const highPrices = ohlcData.map(item => parseFloat(item.high));
          const lowPrices = ohlcData.map(item => parseFloat(item.low));
          const volumes = ohlcData.map(item => parseFloat(item.volume));
          
          const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          const maxHigh = Math.max(...highPrices);
          const minLow = Math.min(...lowPrices);
          const volatility = ((maxHigh - minLow) / minLow) * 100;
          const overallReturn = ((closePrices[closePrices.length - 1] - openPrices[0]) / openPrices[0]) * 100;
          
          // 상승/하락 데이터 포인트 수 계산
          let upCount = 0;
          let downCount = 0;
          let noChangeCount = 0;
          
          for (let i = 1; i < ohlcData.length; i++) {
            const prevClose = parseFloat(ohlcData[i-1].close);
            const currentClose = parseFloat(ohlcData[i].close);
            
            if (currentClose > prevClose) upCount++;
            else if (currentClose < prevClose) downCount++;
            else noChangeCount++;
          }
          
          // 최대 상승/하락 구간 찾기
          let maxConsecutiveUp = 0;
          let maxConsecutiveDown = 0;
          let currentConsecutiveUp = 0;
          let currentConsecutiveDown = 0;
          
          for (let i = 1; i < ohlcData.length; i++) {
            const prevClose = parseFloat(ohlcData[i-1].close);
            const currentClose = parseFloat(ohlcData[i].close);
            
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
          
          setStats({
            dataPoints: ohlcData.length,
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
            timeframe: timeframe, // 캔들 시간 간격 추가
            dateRange: `${new Date(ohlcData[0].timestamp).toLocaleDateString()} ~ ${new Date(ohlcData[ohlcData.length-1].timestamp).toLocaleDateString()}`
          });
        }
        
        setLoadingProgress({
          status: '데이터 로딩 완료',
          progress: 100
        });
      } else {
        setError('응답에 데이터가 없습니다.');
        setLoadingProgress({
          status: '오류 발생',
          progress: 0
        });
      }
    } catch (err) {
      console.error('데이터 가져오기 오류:', err);
      setError(`데이터 가져오기 오류: ${err.message}`);
      setLoadingProgress({
        status: '오류 발생',
        progress: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 기간 프리셋 설정
  const setDatePreset = (preset) => {
    switch (preset) {
      case '1day':
        setStartDate('2024-01-01');
        setEndDate('2024-01-02');
        break;
      case '1week':
        setStartDate('2024-01-01');
        setEndDate('2024-01-08');
        break;
      case '1month':
        setStartDate('2024-01-01');
        setEndDate('2024-02-01');
        break;
      case '3months':
        setStartDate('2024-01-01');
        setEndDate('2024-04-01');
        break;
      case '6months':
        setStartDate('2023-06-01');
        setEndDate('2023-12-31');
        break;
      case '1year':
        setStartDate('2023-01-01');
        setEndDate('2023-12-31');
        break;
      default:
        break;
    }
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
    if (!data.length) return [];
    
    return [...data].sort((a, b) => {
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
  
  // 현재 페이지의 데이터 계산
  const getCurrentPageData = () => {
    const sortedData = getSortedData();
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  };
  
  // 총 페이지 수 계산
  const totalPages = Math.ceil(data.length / rowsPerPage);
  
  // 페이지 이동 함수
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  // 페이지네이션 버튼 범위 계산
  const getPageButtons = () => {
    const buttons = [];
    const maxButtons = 5; // 표시할 버튼 최대 개수
    
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    // 시작 페이지 조정
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
      buttons.push(1); // 첫 페이지
      if (startPage > 2) buttons.push('...'); // 줄임표
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(i);
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push('...'); // 줄임표
      buttons.push(totalPages); // 마지막 페이지
    }
    
    return buttons;
  };

  return (
    <div className="debug-page">
      <h1>Binance API 데이터 디버그</h1>
      <div className="data-source-info">
        <span className="source-badge">Binance API</span>
        데이터 직접 가져오기
      </div>
      
      <div className="date-controls">
        <div className="date-inputs">
          <div className="input-group">
            <label>시작일:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="input-group">
            <label>종료일:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <div className="input-group">
            <label>최대 데이터 포인트:</label>
            <select 
              value={maxDataPoints} 
              onChange={(e) => setMaxDataPoints(parseInt(e.target.value))}
            >
              <option value="1000">1,000</option>
              <option value="2000">2,000</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000</option>
              <option value="20000">20,000</option>
            </select>
          </div>
          
          <div className="input-group">
            <label>캔들 시간 간격:</label>
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="1m">1분</option>
              <option value="3m">3분</option>
              <option value="5m">5분</option>
              <option value="15m">15분</option>
              <option value="30m">30분</option>
              <option value="1h">1시간</option>
              <option value="2h">2시간</option>
              <option value="4h">4시간</option>
              <option value="6h">6시간</option>
              <option value="8h">8시간</option>
              <option value="12h">12시간</option>
              <option value="1d">1일</option>
              <option value="3d">3일</option>
              <option value="1w">1주</option>
            </select>
          </div>
          
          <button 
            className="fetch-btn"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? '로딩 중...' : '데이터 가져오기'}
          </button>
        </div>
        
        <div className="preset-buttons">
          <button onClick={() => setDatePreset('1day')}>1일</button>
          <button onClick={() => setDatePreset('1week')}>1주</button>
          <button onClick={() => setDatePreset('1month')}>1개월</button>
          <button onClick={() => setDatePreset('3months')}>3개월</button>
          <button onClick={() => setDatePreset('6months')}>6개월</button>
          <button onClick={() => setDatePreset('1year')}>1년</button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading && loadingProgress && (
        <div className="loading-progress">
          <div className="progress-status">{loadingProgress.status}</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${loadingProgress.progress}%`}}
            ></div>
          </div>
        </div>
      )}
      
      {apiCallLogs.length > 0 && (
        <div className="api-logs">
          <h2>API 호출 로그</h2>
          <ul>
            {apiCallLogs.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
        </div>
      )}
      
      {stats && (
        <div className="data-stats">
          <h2>데이터 통계</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">데이터 포인트 수:</span>
              <span className="stat-value">{stats.dataPoints}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">날짜 범위:</span>
              <span className="stat-value">{stats.dateRange}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">캔들 시간 간격:</span>
              <span className="stat-value">{stats.timeframe}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">시작 가격:</span>
              <span className="stat-value">${stats.startPrice}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">종료 가격:</span>
              <span className="stat-value">${stats.endPrice}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최고 가격:</span>
              <span className="stat-value">${stats.highestPrice}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최저 가격:</span>
              <span className="stat-value">${stats.lowestPrice}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">변동성:</span>
              <span className="stat-value">{stats.volatility}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">전체 수익률:</span>
              <span className={`stat-value ${parseFloat(stats.overallReturn) >= 0 ? 'positive' : 'negative'}`}>
                {stats.overallReturn}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균 거래량:</span>
              <span className="stat-value">{stats.averageVolume}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">상승/하락/유지:</span>
              <span className="stat-value">
                <span className="positive">{stats.upCount}</span> / 
                <span className="negative">{stats.downCount}</span> / 
                <span>{stats.noChangeCount}</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최대 연속 상승:</span>
              <span className="stat-value positive">{stats.maxConsecutiveUp}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최대 연속 하락:</span>
              <span className="stat-value negative">{stats.maxConsecutiveDown}개</span>
            </div>
          </div>
        </div>
      )}
      
      {data.length > 0 && (
        <div className="data-table-container">
          <div className="table-header">
            <h2>OHLCV 데이터 ({data.length}개 레코드)</h2>
            <div className="table-controls">
              <div className="rows-per-page">
                <label>페이지당 행:</label>
                <select 
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value));
                    setCurrentPage(1); // 페이지당 행 수 변경 시 첫 페이지로 이동
                  }}
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                </select>
              </div>
              <div className="page-info">
                {currentPage} / {totalPages} 페이지 (총 {data.length}개 항목)
              </div>
            </div>
          </div>
          
          <table className="data-table">
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
                <th>변동률</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPageData().map((item, index) => {
                // 실제 인덱스 계산 (현재 페이지 기준)
                const realIndex = getSortedData().indexOf(item);
                const prevClose = realIndex > 0 ? parseFloat(getSortedData()[realIndex - 1].close) : parseFloat(item.open);
                const currentClose = parseFloat(item.close);
                const changePercent = ((currentClose - prevClose) / prevClose) * 100;
                
                return (
                  <tr key={index}>
                    <td>{new Date(item.timestamp).toLocaleString()}</td>
                    <td>${parseFloat(item.open).toFixed(2)}</td>
                    <td>${parseFloat(item.high).toFixed(2)}</td>
                    <td>${parseFloat(item.low).toFixed(2)}</td>
                    <td>${parseFloat(item.close).toFixed(2)}</td>
                    <td>{parseFloat(item.volume).toFixed(2)}</td>
                    <td className={changePercent >= 0 ? 'positive' : 'negative'}>
                      {changePercent.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => goToPage(1)} 
                disabled={currentPage === 1}
                className="pagination-btn first"
              >
                &laquo;
              </button>
              <button 
                onClick={() => goToPage(currentPage - 1)} 
                disabled={currentPage === 1}
                className="pagination-btn prev"
              >
                &lsaquo;
              </button>
              
              <div className="page-buttons">
                {getPageButtons().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="ellipsis">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>
              
              <button 
                onClick={() => goToPage(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="pagination-btn next"
              >
                &rsaquo;
              </button>
              <button 
                onClick={() => goToPage(totalPages)} 
                disabled={currentPage === totalPages}
                className="pagination-btn last"
              >
                &raquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugPage; 