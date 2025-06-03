import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

const BTCUSDTChart = ({ timeframe = '1h' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState({ value: 0, percentage: 0 });
  const [volume, setVolume] = useState(null);
  const resizeListenerRef = useRef(null);

  // 차트 및 이벤트 리스너 정리 함수
  const cleanupChart = () => {
    if (resizeListenerRef.current) {
      window.removeEventListener('resize', resizeListenerRef.current);
      resizeListenerRef.current = null;
    }
    
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.log("차트 제거 중 오류 발생:", e);
      }
      chartRef.current = null;
    }
    
    candlestickSeriesRef.current = null;
  };

  useEffect(() => {
    // 컴포넌트 마운트 해제 시 정리
    return () => {
      cleanupChart();
    };
  }, []);

  useEffect(() => {
    // 이전 차트 정리
    cleanupChart();
    
    if (!chartContainerRef.current) return;
    
    try {
      // 기본 차트 생성
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { type: 'solid', color: '#131722' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2a2e39' },
          horzLines: { color: '#363c4e' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });
      
      // 차트 참조 저장
      chartRef.current = chart;
      
      // 캔들스틱 시리즈 추가 (5.0.7 버전에 맞는 방식)
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
      });
      
      // 참조 저장
      candlestickSeriesRef.current = candlestickSeries;

      // 차트 리사이징 핸들러
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          try {
            chartRef.current.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            });
          } catch (e) {
            console.log("차트 리사이징 중 오류 발생:", e);
          }
        }
      };
      
      // 리사이징 이벤트 리스너 등록 및 참조 저장
      window.addEventListener('resize', handleResize);
      resizeListenerRef.current = handleResize;

      // 데이터 가져오기
      fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${timeframe}&limit=1000`)
        .then(res => res.json())
        .then(data => {
          // 차트가 이미 제거되었으면 처리하지 않음
          if (!chartRef.current || !candlestickSeriesRef.current) return;
          
          try {
            const cdata = data.map(d => {
              return {
                time: d[0] / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
              };
            });
            
            // 캔들스틱 데이터 설정
            candlestickSeriesRef.current.setData(cdata);
            
            // 최신 가격 정보 저장
            if (cdata.length > 0) {
              const lastCandle = cdata[cdata.length - 1];
              const prevCandle = cdata[cdata.length - 2] || lastCandle;
              
              setLastPrice(lastCandle.close);
              
              // 가격 변동 계산
              const change = lastCandle.close - prevCandle.close;
              const changePercent = (change / prevCandle.close) * 100;
              setPriceChange({
                value: change,
                percentage: changePercent
              });
              
              // 거래량 계산 (24시간 상당)
              let volumePeriod = 24;
              if (timeframe === '15m') volumePeriod = 96;      // 15분 * 96 = 24시간
              if (timeframe === '4h') volumePeriod = 6;        // 4시간 * 6 = 24시간
              if (timeframe === '1d') volumePeriod = 1;        // 1일 * 1 = 24시간
              
              const lastPeriodVolume = cdata
                .slice(Math.max(0, cdata.length - volumePeriod))
                .reduce((sum, candle) => sum + candle.volume, 0);
              setVolume(lastPeriodVolume);
            }
            
            // 차트 표시 영역 조정
            chartRef.current.timeScale().fitContent();
          } catch (error) {
            console.error('차트 데이터 설정 중 오류:', error);
          }
        })
        .catch(err => console.error('데이터 불러오기 오류:', err));
    } catch (error) {
      console.error('차트 생성 중 오류:', error);
    }
  }, [timeframe]);

  return (
    <div className="chart-wrapper">
      <div 
        ref={chartContainerRef} 
        style={{ 
          width: '100%', 
          height: '400px'
        }}
      />
      
      {lastPrice && (
        <div className="price-info">
          <div className="price-item">
            <span className="price-label">BTC/USDT</span>
            <span className="price-value">${lastPrice.toLocaleString()}</span>
          </div>
          
          <div className="price-item">
            <span className="price-label">24h 변동</span>
            <span className={`price-value ${priceChange.value >= 0 ? 'positive' : 'negative'}`}>
              {priceChange.value >= 0 ? '+' : ''}{priceChange.value.toFixed(2)} ({priceChange.percentage.toFixed(2)}%)
            </span>
          </div>
          
          {volume && (
            <div className="price-item">
              <span className="price-label">24h 거래량</span>
              <span className="price-value">{(volume / 1000000).toFixed(2)}M</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BTCUSDTChart; 