import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

const BTCChart = () => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState({ value: 0, percentage: 0 });
  const [volume, setVolume] = useState(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      // 차트 생성
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { color: '#131722' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2a2e39' },
          horzLines: { color: '#363c4e' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#363c4e',
        },
        rightPriceScale: {
          borderColor: '#363c4e',
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#758696',
            width: 1,
            style: 1,
            labelBackgroundColor: '#2a2e39',
          },
          horzLine: {
            color: '#758696',
            width: 1,
            style: 1,
            labelBackgroundColor: '#2a2e39',
          },
        },
      });

      // 캔들스틱 시리즈 추가 (최신 API 방식으로 수정)
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      
      // 라인 시리즈 추가 (최신 API 방식으로 수정)
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#2962FF',
        lineWidth: 2,
      });
      
      // 참조 저장
      candlestickSeriesRef.current = candlestickSeries;
      lineSeriesRef.current = lineSeries;

      // 차트 리사이징 핸들러
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        }
      };

      // 데이터 가져오기
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1000')
        .then(res => res.json())
        .then(data => {
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
          candlestickSeries.setData(cdata);
          
          // 라인 시리즈 데이터 설정 (종가 기준)
          const lineData = cdata.map(item => ({
            time: item.time,
            value: item.close
          }));
          lineSeries.setData(lineData);
          
          // 최신 가격 정보 저장
          if (cdata.length > 0) {
            const lastCandle = cdata[cdata.length - 1];
            const prevCandle = cdata[cdata.length - 2];
            
            setLastPrice(lastCandle.close);
            
            // 가격 변동 계산
            const change = lastCandle.close - prevCandle.close;
            const changePercent = (change / prevCandle.close) * 100;
            setPriceChange({
              value: change,
              percentage: changePercent
            });
            
            // 거래량 계산 (24시간)
            const last24hVolume = cdata
              .slice(cdata.length - 24)
              .reduce((sum, candle) => sum + candle.volume, 0);
            setVolume(last24hVolume);
            
            try {
              // 지지선과 저항선 계산 (간단한 예: 최근 종가의 ±5%)
              const supportPrice = lastCandle.close * 0.95;
              const resistancePrice = lastCandle.close * 1.05;
              
              // 가격선 추가
              // 현재가 표시
              candlestickSeries.createPriceLine({
                price: lastCandle.close,
                color: '#FFD700',
                lineWidth: 2,
                lineStyle: 0, // 실선
                axisLabelVisible: true,
                title: '현재가',
              });
              
              // 지지선 표시
              candlestickSeries.createPriceLine({
                price: supportPrice,
                color: '#26a69a',
                lineWidth: 1,
                lineStyle: 2, // 점선
                axisLabelVisible: true,
                title: '지지선',
              });
              
              // 저항선 표시
              candlestickSeries.createPriceLine({
                price: resistancePrice,
                color: '#ef5350',
                lineWidth: 1,
                lineStyle: 2, // 점선
                axisLabelVisible: true,
                title: '저항선',
              });
            } catch (error) {
              console.error('가격선 생성 오류:', error);
            }
          }
          
          // 차트 표시 영역 조정
          chart.timeScale().fitContent();
        })
        .catch(err => console.error('데이터 불러오기 오류:', err));

      // 리사이징 이벤트 리스너 등록
      window.addEventListener('resize', handleResize);
      
      // 참조 저장
      chartRef.current = chart;

      // 컴포넌트 언마운트 시 정리
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

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

export default BTCChart; 