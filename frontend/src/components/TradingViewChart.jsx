import React, { useEffect, useState } from 'react';
import Plotly from 'plotly.js';
import createPlotlyComponent from 'react-plotly.js/factory';
import '../styles/TradingViewChart.css';

// 플롯리 컴포넌트 생성
const Plot = createPlotlyComponent(Plotly);

const TradingViewChart = ({ data }) => {
  const [layout, setLayout] = useState({});
  const [chartData, setChartData] = useState([]);

  // 데이터가 변경될 때마다 차트 데이터 업데이트
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    prepareChartData();
  }, [data]);

  // 차트 데이터 준비
  const prepareChartData = () => {
    if (!data || data.length === 0) return;

    // 데이터 정렬 (날짜별로)
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 타임스탬프 배열
    const timestamps = sortedData.map(item => item.timestamp);
    
    // 캔들스틱 데이터
    const candlestick = {
      x: timestamps,
      open: sortedData.map(item => item.open),
      high: sortedData.map(item => item.high),
      low: sortedData.map(item => item.low),
      close: sortedData.map(item => item.close),
      type: 'candlestick',
      name: 'BTC/USDT',
      increasing: { line: { color: '#26a69a' } },
      decreasing: { line: { color: '#ef5350' } },
      xaxis: 'x',
      yaxis: 'y',
    };
    
    // 거래량 데이터
    const volume = {
      x: timestamps,
      y: sortedData.map(item => item.volume),
      type: 'bar',
      name: 'Volume',
      marker: {
        color: sortedData.map(item => item.close > item.open ? '#26a69a' : '#ef5350'),
        opacity: 0.5,
      },
      xaxis: 'x',
      yaxis: 'y2',
    };
    
    // RSI 데이터
    const rsi = {
      x: timestamps,
      y: sortedData.map(item => item.rsi),
      type: 'scatter',
      mode: 'lines',
      name: 'RSI',
      line: { color: '#7b1fa2', width: 1 },
      xaxis: 'x',
      yaxis: 'y3',
    };
    
    // MACD 데이터
    const macd = {
      x: timestamps,
      y: sortedData.map(item => item.macd),
      type: 'scatter',
      mode: 'lines',
      name: 'MACD',
      line: { color: '#2196f3', width: 1 },
      xaxis: 'x',
      yaxis: 'y4',
    };
    
    // MACD 시그널 라인
    const macdSignal = {
      x: timestamps,
      y: sortedData.map(item => item.macd_signal),
      type: 'scatter',
      mode: 'lines',
      name: 'Signal',
      line: { color: '#ff9800', width: 1 },
      xaxis: 'x',
      yaxis: 'y4',
    };
    
    // MACD 히스토그램
    const macdHistogram = {
      x: timestamps,
      y: sortedData.map(item => item.macd_histogram),
      type: 'bar',
      name: 'Histogram',
      marker: {
        color: sortedData.map(item => item.macd_histogram >= 0 ? '#26a69a' : '#ef5350'),
      },
      xaxis: 'x',
      yaxis: 'y4',
    };
    
    // 차트 레이아웃 설정
    const newLayout = {
      // 반응형 레이아웃
      autosize: true,
      
      // 색상 테마 (어두운 테마)
      paper_bgcolor: '#1E1E1E',
      plot_bgcolor: '#1E1E1E',
      font: {
        color: '#CCCCCC',
      },
      
      // 차트 마진
      margin: {
        l: 50,
        r: 20,
        t: 50,
        b: 20,
      },
      
      // 그리드 스타일
      xaxis: {
        rangeslider: { visible: false },
        autorange: true,
        title: 'Date',
        showgrid: true,
        gridcolor: '#333333',
        gridwidth: 1,
        linecolor: '#333333',
        domain: [0, 1],
        type: 'date',
        rangeselector: {
          buttons: [
            {
              count: 1,
              label: '1h',
              step: 'hour',
              stepmode: 'backward',
            },
            {
              count: 6,
              label: '6h',
              step: 'hour',
              stepmode: 'backward',
            },
            {
              count: 1,
              label: '1d',
              step: 'day',
              stepmode: 'backward',
            },
            {
              count: 7,
              label: '1w',
              step: 'day',
              stepmode: 'backward',
            },
            {
              count: 1,
              label: '1m',
              step: 'month',
              stepmode: 'backward',
            },
            {
              step: 'all',
            },
          ],
          x: 0.05,
          y: 1.1,
          bgcolor: '#333333',
          activecolor: '#4CAF50',
          font: { color: '#CCCCCC' },
        },
      },
      
      // 메인 차트 (캔들스틱) Y축
      yaxis: {
        autorange: true,
        title: 'Price',
        showgrid: true,
        gridcolor: '#333333',
        domain: [0.5, 1],
        linecolor: '#333333',
        side: 'right',
      },
      
      // 거래량 Y축
      yaxis2: {
        title: 'Volume',
        showgrid: false,
        domain: [0.4, 0.5],
        linecolor: '#333333',
        side: 'right',
      },
      
      // RSI Y축
      yaxis3: {
        title: 'RSI',
        showgrid: true,
        domain: [0.2, 0.4],
        gridcolor: '#333333',
        range: [0, 100],
        tickvals: [0, 30, 50, 70, 100],
        linecolor: '#333333',
        side: 'right',
      },
      
      // MACD Y축
      yaxis4: {
        title: 'MACD',
        showgrid: true,
        domain: [0, 0.2],
        gridcolor: '#333333',
        zeroline: true,
        zerolinecolor: '#999999',
        linecolor: '#333333',
        side: 'right',
      },
      
      // 그리드 스타일 및 범례
      grid: {
        rows: 4,
        columns: 1,
        subplots: [['xy'], ['xy2'], ['xy3'], ['xy4']],
        roworder: 'top to bottom'
      },
      
      legend: {
        orientation: 'h',
        x: 0.5,
        y: 1.1,
        xanchor: 'center',
        font: { color: '#CCCCCC' }
      },
      
      // 차트 제목
      title: {
        text: 'BTC/USDT 차트 (Binance 데이터)',
        font: {
          color: '#FFFFFF',
          size: 18
        }
      },
      
      // 차트 호버 모드
      hovermode: 'x unified',
    };

    // 차트 데이터와 레이아웃 설정
    setChartData([candlestick, volume, rsi, macd, macdSignal, macdHistogram]);
    setLayout(newLayout);
  };

  // 반응형 레이아웃 설정
  const handleResize = () => {
    setLayout(prevLayout => ({
      ...prevLayout,
      autosize: true
    }));
  };

  // 컴포넌트 마운트/언마운트 시 창 크기 변경 이벤트 리스너 등록/해제
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 차트 설정
  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      'zoomIn2d', 'zoomOut2d', 'autoScale2d',
      'toggleSpikelines', 'hoverClosestCartesian',
      'hoverCompareCartesian', 'lasso2d', 'select2d'
    ],
    modeBarButtonsToAdd: [
      'drawline', 'drawopenpath', 'drawclosedpath',
      'drawcircle', 'drawrect', 'eraseshape'
    ],
  };

  return (
    <div className="tradingview-chart-container">
      {data && data.length > 0 ? (
        <Plot
          data={chartData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      ) : (
        <div className="chart-loading">차트 데이터를 불러오는 중입니다...</div>
      )}
    </div>
  );
};

export default TradingViewChart; 