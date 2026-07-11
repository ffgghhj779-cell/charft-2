import React, { useEffect, useRef } from 'react';
import {
    createChart,
    CrosshairMode,
    LineStyle,
    ColorType,
    Time,
    IChartApi,
    SeriesMarker,
} from 'lightweight-charts';

export const TradingCentralAnalysisChart: React.FC = () => {
    const topChartContainerRef = useRef<HTMLDivElement>(null);
    const bottomChartContainerRef = useRef<HTMLDivElement>(null);
    
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
                vertLine: { width: 1, color: '#9CA3AF', style: LineStyle.Dashed, labelBackgroundColor: '#4B5563' },
                horzLine: { width: 1, color: '#9CA3AF', style: LineStyle.Dashed, labelBackgroundColor: '#4B5563' },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: { time: true, price: false } },
        };

        const topChart = createChart(topChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                autoScale: false,
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
                autoScale: true,
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
            lineWidth: 1.5,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const rsiMaSeries = bottomChart.addLineSeries({
            color: '#EF4444', // Red
            lineWidth: 1.5,
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
                const priceVal = candleData ? candleData.close : 4050;
                topChart.setCrosshairPosition(priceVal, param.time, candleSeries);
            }
        });

        // --- Data Generation (Premium Smooth Mock) ---
        const generateData = () => {
            const candles = [];
            const ma50 = [];
            const ma20 = [];
            const bbArea = [];
            const rsi = [];
            const rsiMa = [];

            let basePrice = 4050;
            const startTime = new Date('2026-07-07T00:00:00Z').getTime() / 1000;
            
            // Generate a smooth trend using sin waves
            for (let i = 0; i < 200; i++) {
                const time = (startTime + i * 1800) as Time;
                
                // Smooth market movement
                const trend = Math.sin(i / 15) * 20 + Math.cos(i / 5) * 5;
                const open = basePrice;
                const close = open + trend + (Math.random() - 0.5) * 5;
                const high = Math.max(open, close) + Math.random() * 8;
                const low = Math.min(open, close) - Math.random() * 8;
                basePrice = close;

                candles.push({ time, open, high, low, close });

                // Moving Averages with lag
                const simulatedMa50 = basePrice - 15 + Math.sin(i / 12) * 15;
                const simulatedMa20 = basePrice - 5 + Math.sin(i / 6) * 10;
                
                ma50.push({ time, value: simulatedMa50 });
                ma20.push({ time, value: simulatedMa20 });
                // Bollinger upper bound area simulation
                bbArea.push({ time, value: simulatedMa20 + 20 + Math.random() * 2 });

                // RSI Simulation bounded 20-80
                const rsiBase = 50 + Math.sin(i / 8) * 25;
                const rsiVal = rsiBase + (Math.random() - 0.5) * 5;
                rsi.push({ time, value: Math.max(0, Math.min(100, rsiVal)) });
                rsiMa.push({ time, value: Math.max(0, Math.min(100, rsiBase - 2)) });
            }
            return { candles, ma50, ma20, bbArea, rsi, rsiMa };
        };

        const data = generateData();

        bbAreaSeries.setData(data.bbArea);
        candleSeries.setData(data.candles);
        ma50Series.setData(data.ma50);
        ma20Series.setData(data.ma20);
        rsiSeries.setData(data.rsi);
        rsiMaSeries.setData(data.rsiMa);

        // --- Custom Price Lines ---
        const createTargetLine = (series: any, price: number, color: string, style: LineStyle, width: number) => {
            series.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title: '' });
        };

        createTargetLine(candleSeries, 4180, '#10B981', LineStyle.Solid, 2);
        createTargetLine(candleSeries, 4164, '#10B981', LineStyle.Solid, 2);
        createTargetLine(candleSeries, 4127, '#111827', LineStyle.Solid, 2);
        createTargetLine(candleSeries, 4094, '#2563EB', LineStyle.Solid, 2);
        createTargetLine(candleSeries, 4055, '#EF4444', LineStyle.Dashed, 1);
        createTargetLine(candleSeries, 4021, '#EF4444', LineStyle.Dashed, 1);

        createTargetLine(rsiSeries, 70, '#9CA3AF', LineStyle.Dotted, 1);
        createTargetLine(rsiSeries, 50, '#9CA3AF', LineStyle.Dotted, 1);
        createTargetLine(rsiSeries, 30, '#9CA3AF', LineStyle.Dotted, 1);

        // Scale Ranges
        topChart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        });
        candleSeries.applyOptions({
            autoscaleInfoProvider: () => ({ priceRange: { minValue: 3950, maxValue: 4250 } }),
        });

        bottomChart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        });
        rsiSeries.applyOptions({
            autoscaleInfoProvider: () => ({ priceRange: { minValue: 10, maxValue: 90 } }),
        });

        // Forecast Arrow Marker
        const targetCandle = data.candles[data.candles.length - 15]; 
        if (targetCandle) {
            candleSeries.setMarkers([
                {
                    time: targetCandle.time,
                    position: 'aboveBar',
                    color: '#2563EB',
                    shape: 'arrowUp',
                    text: '',
                    size: 3, // Thicker arrow
                }
            ]);
        }

        topChart.timeScale().fitContent();
        bottomChart.timeScale().fitContent();

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
                    <span style={{ fontSize: '20px', fontWeight: '700', marginRight: '12px', letterSpacing: '-0.02em' }}>Gold</span>
                    <span style={{ 
                        backgroundColor: '#F3F4F6', 
                        color: '#4B5563', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        letterSpacing: '0.02em'
                    }}>
                        30 MIN
                    </span>
                </div>
                
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px', fontWeight: '500' }}>
                    Thursday, July 9, 2026 5:51:33 PM CET
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
                        Research © 2026 Trading Central
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
