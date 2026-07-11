import React, { useEffect, useRef, useState } from 'react';
import {
    createChart,
    CrosshairMode,
    LineStyle,
    ColorType,
    Time,
    IChartApi,
    SeriesMarker,
} from 'lightweight-charts';
import { SMA, RSI, BollingerBands } from 'technicalindicators';

export const TradingCentralAnalysisChart: React.FC = () => {
    const topChartContainerRef = useRef<HTMLDivElement>(null);
    const bottomChartContainerRef = useRef<HTMLDivElement>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
    const [currentPriceDisplay, setCurrentPriceDisplay] = useState<string>('Loading...');
    
    useEffect(() => {
        if (!topChartContainerRef.current || !bottomChartContainerRef.current) return;

        const premiumFont = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const commonChartOptions = {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#374151',
                fontFamily: premiumFont,
            },
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.4)', style: LineStyle.Dotted },
                horzLines: { color: 'rgba(197, 203, 206, 0.4)', style: LineStyle.Dotted },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { width: 1 as const, color: '#9CA3AF', style: LineStyle.Dashed, labelBackgroundColor: '#4B5563' },
                horzLine: { width: 1 as const, color: '#9CA3AF', style: LineStyle.Dashed, labelBackgroundColor: '#4B5563' },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: { time: true, price: false } },
        };

        const topChart = createChart(topChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                autoScale: true, // Auto-scale to real data
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: Time) => {
                    const date = new Date((time as number) * 1000);
                    return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
                },
            },
        });

        const bottomChart = createChart(bottomChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                autoScale: false, // RSI is strictly 0-100
                alignLabels: true,
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                visible: true,
            },
        });

        // Sync timescales
        topChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) bottomChart.timeScale().setVisibleLogicalRange(range);
        });
        bottomChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) topChart.timeScale().setVisibleLogicalRange(range);
        });

        // --- Series Definitions ---
        
        const bbAreaSeries = topChart.addAreaSeries({
            topColor: 'rgba(255, 182, 193, 0.35)',
            bottomColor: 'rgba(255, 182, 193, 0.05)',
            lineColor: 'rgba(255, 182, 193, 0.9)',
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const candleSeries = topChart.addCandlestickSeries({
            upColor: '#10B981', // Premium green
            downColor: '#EF4444', // Premium red
            borderVisible: false,
            wickUpColor: '#10B981',
            wickDownColor: '#EF4444',
        });

        const ma50Series = topChart.addLineSeries({
            color: '#2563EB', // Royal Blue
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const ma20Series = topChart.addLineSeries({
            color: '#EF4444', // Red
            lineWidth: 2,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const rsiSeries = bottomChart.addLineSeries({
            color: '#2563EB', // Royal Blue
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const rsiMaSeries = bottomChart.addLineSeries({
            color: '#EF4444', // Red
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // Sync Crosshairs perfectly
        topChart.subscribeCrosshairMove((param) => {
            if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                bottomChart.clearCrosshairPosition();
            } else {
                const rsiVal = param.seriesPrices.get(rsiSeries) || 50; 
                bottomChart.setCrosshairPosition(rsiVal as number, param.time, rsiSeries);
            }
        });

        bottomChart.subscribeCrosshairMove((param) => {
            if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                topChart.clearCrosshairPosition();
            } else {
                const candleData = param.seriesPrices.get(candleSeries) as any;
                const priceVal = candleData ? candleData.close : 0;
                topChart.setCrosshairPosition(priceVal, param.time, candleSeries);
            }
        });

        // --- REAL Market Data Fetching & Calculation ---
        const fetchRealData = async () => {
            try {
                // Fetching real Gold (PAX Gold) from Binance free API
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=30m&limit=250');
                const rawData = await res.json();

                const candles: any[] = [];
                const closes: number[] = [];

                rawData.forEach((row: any) => {
                    const time = (row[0] / 1000) as Time;
                    const open = parseFloat(row[1]);
                    const high = parseFloat(row[2]);
                    const low = parseFloat(row[3]);
                    const close = parseFloat(row[4]);

                    candles.push({ time, open, high, low, close });
                    closes.push(close);
                });

                // Update UI state
                const latestPrice = closes[closes.length - 1];
                setCurrentPriceDisplay(`$${latestPrice.toFixed(2)}`);
                setLastUpdateTime(new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' }));

                // Calculate Mathematical Indicators
                const sma50Result = SMA.calculate({ period: 50, values: closes });
                const sma20Result = SMA.calculate({ period: 20, values: closes });
                const bbResult = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
                const rsiResult = RSI.calculate({ period: 14, values: closes });

                // Map results to precise time intervals (accounting for calculation lag)
                const ma50 = sma50Result.map((val, idx) => ({ time: candles[idx + 49].time, value: val }));
                const ma20 = sma20Result.map((val, idx) => ({ time: candles[idx + 19].time, value: val }));
                const bbArea = bbResult.map((val, idx) => ({ time: candles[idx + 19].time, value: val.upper })); // We use upper band as the top of the area

                const rsiSeriesData = rsiResult.map((val, idx) => ({ time: candles[idx + 13].time, value: val }));

                // RSI 9-MA
                const rsiMaResult = SMA.calculate({ period: 9, values: rsiResult });
                const rsiMaSeriesData = rsiMaResult.map((val, idx) => ({ time: rsiSeriesData[idx + 8].time, value: val }));

                // Inject Data to Charts
                candleSeries.setData(candles);
                ma50Series.setData(ma50);
                ma20Series.setData(ma20);
                bbAreaSeries.setData(bbArea);
                rsiSeries.setData(rsiSeriesData);
                rsiMaSeries.setData(rsiMaSeriesData);

                // --- Dynamic Price Lines (Targets & Levels) ---
                const createTargetLine = (series: any, price: number, color: string, style: LineStyle, width: number) => {
                    series.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title: '' });
                };

                // Create visually exact layout but dynamically scaled to REAL market price
                createTargetLine(candleSeries, latestPrice * 1.015, '#10B981', LineStyle.Solid, 2); // Green Top
                createTargetLine(candleSeries, latestPrice * 1.010, '#10B981', LineStyle.Solid, 2); // Green Bottom
                createTargetLine(candleSeries, latestPrice * 1.002, '#111827', LineStyle.Solid, 2); // Black
                createTargetLine(candleSeries, latestPrice * 0.995, '#2563EB', LineStyle.Solid, 2); // Blue
                createTargetLine(candleSeries, latestPrice * 0.985, '#EF4444', LineStyle.Dashed, 1); // Red 1
                createTargetLine(candleSeries, latestPrice * 0.975, '#EF4444', LineStyle.Dashed, 1); // Red 2

                createTargetLine(rsiSeries, 70, '#9CA3AF', LineStyle.Dotted, 1);
                createTargetLine(rsiSeries, 50, '#9CA3AF', LineStyle.Dotted, 1);
                createTargetLine(rsiSeries, 30, '#9CA3AF', LineStyle.Dotted, 1);

                bottomChart.priceScale('right').applyOptions({
                    autoScale: false,
                    scaleMargins: { top: 0.1, bottom: 0.1 },
                });
                rsiSeries.applyOptions({
                    autoscaleInfoProvider: () => ({ priceRange: { minValue: 10, maxValue: 90 } }),
                });

                // Forecast Arrow Marker (pointing to the +1.5% target)
                const targetCandle = candles[candles.length - 8]; 
                if (targetCandle) {
                    candleSeries.setMarkers([
                        {
                            time: targetCandle.time,
                            position: 'aboveBar',
                            color: '#2563EB',
                            shape: 'arrowUp',
                            text: '',
                            size: 3,
                        }
                    ]);
                }

                topChart.timeScale().fitContent();
                bottomChart.timeScale().fitContent();

            } catch (error) {
                console.error("Error fetching live data: ", error);
                setCurrentPriceDisplay("API Error");
            }
        };

        fetchRealData();
        // Optional: Poll every 30 seconds for live updates
        const interval = setInterval(fetchRealData, 30000);

        // --- Perfect ResizeObserver Implementation ---
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === topChartContainerRef.current) {
                    const { width, height } = entry.contentRect;
                    topChart.applyOptions({ width, height });
                } else if (entry.target === bottomChartContainerRef.current) {
                    const { width, height } = entry.contentRect;
                    bottomChart.applyOptions({ width, height });
                }
            }
        });

        resizeObserver.observe(topChartContainerRef.current);
        resizeObserver.observe(bottomChartContainerRef.current);

        return () => {
            clearInterval(interval);
            resizeObserver.disconnect();
            topChart.remove();
            bottomChart.remove();
        };
    }, []);

    return (
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            minHeight: '600px', 
            backgroundColor: '#ffffff',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            color: '#111827'
        }}>
            
            {/* Elite HTML Overlay Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', zIndex: 10, pointerEvents: 'none' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '20px', fontWeight: '700', marginRight: '12px', letterSpacing: '-0.02em' }}>Gold (Live)</span>
                    <span style={{ 
                        backgroundColor: '#F3F4F6', 
                        color: '#4B5563', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        letterSpacing: '0.02em',
                        marginRight: '12px'
                    }}>
                        30 MIN
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: '600', color: '#10B981' }}>{currentPriceDisplay}</span>
                </div>
                
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px', fontWeight: '500' }}>
                    {lastUpdateTime || 'Fetching real-time data...'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: '500' }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '16px', height: '2px', backgroundColor: '#EF4444' }}></div>
                            <span style={{ color: '#4B5563' }}>MA 20 + Bollinger Bands</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '16px', height: '2px', backgroundColor: '#2563EB' }}></div>
                            <span style={{ color: '#4B5563' }}>MA 50</span>
                        </div>
                    </div>
                    <div style={{ color: '#9CA3AF' }}>
                        Research © {new Date().getFullYear()} Trading Central
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', paddingTop: '110px' }}>
                <div ref={topChartContainerRef} style={{ width: '100%', height: '75%', flexShrink: 0 }} />
                <div ref={bottomChartContainerRef} style={{ width: '100%', height: '25%', flexShrink: 0, borderTop: '1px solid #E5E7EB' }} />
            </div>
        </div>
    );
};
