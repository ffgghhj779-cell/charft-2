import React, { useEffect, useRef, useState } from 'react';
import {
    createChart,
    CrosshairMode,
    LineStyle,
    ColorType,
    Time,
    IPriceLine,
} from 'lightweight-charts';
import { SMA, RSI, BollingerBands } from 'technicalindicators';

export const TradingCentralAnalysisChart: React.FC = () => {
    const topChartContainerRef = useRef<HTMLDivElement>(null);
    const bottomChartContainerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const arrowPathRef = useRef<SVGPathElement>(null);
    
    const priceDisplayRef = useRef<HTMLSpanElement>(null);
    const timeDisplayRef = useRef<HTMLDivElement>(null);
    const dateDisplayRef = useRef<HTMLDivElement>(null);

    const [preferenceText, setPreferenceText] = useState<string>("Analyzing market data...");

    useEffect(() => {
        if (!topChartContainerRef.current || !bottomChartContainerRef.current) return;

        const premiumFont = 'Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const commonChartOptions = {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' }, 
                textColor: '#6B7280',
                fontFamily: premiumFont,
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(229, 231, 235, 0.4)', style: LineStyle.Solid },
                horzLines: { color: 'rgba(229, 231, 235, 0.4)', style: LineStyle.Solid },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { width: 1 as const, color: '#9CA3AF', style: LineStyle.Dotted, labelBackgroundColor: '#1F2937' },
                horzLine: { width: 1 as const, color: '#9CA3AF', style: LineStyle.Dotted, labelBackgroundColor: '#1F2937' },
            },
            handleScroll: { vertTouchDrag: false, horzTouchDrag: true, pressedMouseMove: true, mouseWheel: true },
            handleScale: { pinch: true, axisPressedMouseMove: { time: true, price: false }, mouseWheel: true },
            kineticScroll: { touch: true, mouse: false }, 
        };

        const topChart = createChart(topChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(209, 213, 219, 0.5)',
                autoScale: true,
                scaleMargins: { top: 0.1, bottom: 0.2 }, 
            },
            timeScale: {
                borderColor: 'transparent',
                timeVisible: false, 
                visible: false, 
                fixLeftEdge: true,
            },
        });

        const bottomChart = createChart(bottomChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(209, 213, 219, 0.5)',
                autoScale: false,
                alignLabels: true,
            },
            timeScale: {
                borderColor: 'rgba(209, 213, 219, 0.5)',
                timeVisible: true,
                visible: true, 
            },
        });

        topChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) bottomChart.timeScale().setVisibleLogicalRange(range);
        });
        bottomChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) topChart.timeScale().setVisibleLogicalRange(range);
        });

        // --- Exact Image Series Definitions ---
        
        const targetZoneSeries = topChart.addBaselineSeries({
            topFillColor1: 'rgba(255, 0, 0, 0.12)', 
            topFillColor2: 'rgba(255, 0, 0, 0.12)',
            bottomFillColor1: 'rgba(0, 0, 0, 0)', 
            bottomFillColor2: 'rgba(0, 0, 0, 0)',
            topLineColor: 'transparent',
            bottomLineColor: 'transparent',
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
            baseValue: { type: 'price', price: 0 }, 
        });

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
            upColor: '#10B981', 
            downColor: '#EF4444', 
            borderVisible: false,
            wickUpColor: '#10B981',
            wickDownColor: '#EF4444',
        });

        const ma50Series = topChart.addLineSeries({
            color: '#2563EB', 
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const ma20Series = topChart.addLineSeries({
            color: '#EF4444', 
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const rsiSeries = bottomChart.addLineSeries({
            color: '#2563EB', 
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const rsiMaSeries = bottomChart.addLineSeries({
            color: '#EF4444', 
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // Sync Crosshairs
        topChart.subscribeCrosshairMove((param) => {
            if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                bottomChart.clearCrosshairPosition();
            } else {
                const rsiData = param.seriesData.get(rsiSeries) as any; 
                const rsiVal = rsiData ? rsiData.value : 50;
                bottomChart.setCrosshairPosition(rsiVal as number, param.time, rsiSeries);
            }
        });

        bottomChart.subscribeCrosshairMove((param) => {
            if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                topChart.clearCrosshairPosition();
            } else {
                const candleData = param.seriesData.get(candleSeries) as any;
                const priceVal = candleData ? candleData.close : 0;
                topChart.setCrosshairPosition(priceVal, param.time, candleSeries);
            }
        });

        bottomChart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        });
        rsiSeries.applyOptions({
            autoscaleInfoProvider: () => ({ priceRange: { minValue: 10, maxValue: 90 } }),
        });

        let priceLines: IPriceLine[] = [];
        let currentTargetPrice = 0;
        let lastCandleTime: Time | null = null;
        let lastCandleClose = 0;
        let isBullishTrend = false;

        const updateArrowOverlay = () => {
            if (!topChart || !candleSeries || !lastCandleTime || !arrowPathRef.current) return;
            
            const startX = topChart.timeScale().timeToCoordinate(lastCandleTime);
            const startY = candleSeries.priceToCoordinate(lastCandleClose);
            
            let futureX = startX ? startX + 80 : null; 
            const endY = candleSeries.priceToCoordinate(currentTargetPrice);

            if (startX !== null && startY !== null && futureX !== null && endY !== null) {
                arrowPathRef.current.setAttribute('d', `M ${startX} ${startY} L ${futureX} ${endY}`);
                arrowPathRef.current.setAttribute('stroke', isBullishTrend ? '#10B981' : '#2563EB');
                
                const arrowMarker = document.getElementById('arrowhead-polygon');
                if (arrowMarker) {
                    arrowMarker.setAttribute('fill', isBullishTrend ? '#10B981' : '#2563EB');
                }
            } else {
                arrowPathRef.current.setAttribute('d', ''); 
            }
        };

        topChart.timeScale().subscribeVisibleLogicalRangeChange(updateArrowOverlay);
        topChart.timeScale().subscribeSizeChange(updateArrowOverlay);

        const drawTargetLines = (latestPrice: number, highRange: number, lowRange: number) => {
            priceLines.forEach(line => candleSeries.removePriceLine(line));
            priceLines = [];

            // True Mathematical Pivot Point Formula
            const P = (highRange + lowRange + latestPrice) / 3;
            const R1 = (P * 2) - lowRange;
            const R2 = P + (highRange - lowRange);
            const S1 = (P * 2) - highRange;
            const S2 = P - (highRange - lowRange);

            isBullishTrend = latestPrice > P;

            if (isBullishTrend) {
                setPreferenceText(`Our preference: Long positions above ${P.toFixed(2)} with targets at ${R1.toFixed(2)} & ${R2.toFixed(2)} in extension.`);
                currentTargetPrice = R1;
                targetZoneSeries.applyOptions({
                    baseValue: { type: 'price', price: R2 },
                    topFillColor1: 'rgba(0, 0, 0, 0)',
                    topFillColor2: 'rgba(0, 0, 0, 0)',
                    bottomFillColor1: 'rgba(16, 185, 129, 0.12)', 
                    bottomFillColor2: 'rgba(16, 185, 129, 0.12)'
                });
            } else {
                setPreferenceText(`Our preference: Short positions below ${P.toFixed(2)} with targets at ${S1.toFixed(2)} & ${S2.toFixed(2)} in extension.`);
                currentTargetPrice = S1;
                targetZoneSeries.applyOptions({
                    baseValue: { type: 'price', price: S2 },
                    topFillColor1: 'rgba(239, 68, 68, 0.12)', 
                    topFillColor2: 'rgba(239, 68, 68, 0.12)',
                    bottomFillColor1: 'rgba(0, 0, 0, 0)',
                    bottomFillColor2: 'rgba(0, 0, 0, 0)'
                });
            }

            candleSeries.applyOptions({
                autoscaleInfoProvider: () => ({
                    priceRange: {
                        minValue: Math.min(S2, latestPrice) * 0.9995,
                        maxValue: Math.max(R2, latestPrice) * 1.0005,
                    },
                }),
            });

            const createLine = (price: number, color: string, title: string, style: LineStyle = LineStyle.Solid) => {
                const line = candleSeries.createPriceLine({
                    price, color, lineWidth: 1, lineStyle: style,
                    axisLabelVisible: true, axisLabelColor: color, axisLabelTextColor: '#fff', title: '',
                });
                priceLines.push(line);
            };

            createLine(R2, '#10B981', 'Resistance 2 (Target 2)');
            createLine(R1, '#10B981', 'Resistance 1 (Target 1)');
            createLine(P,  '#2563EB', 'Pivot Point');
            createLine(latestPrice, '#111827', 'Current');
            createLine(S1, '#EF4444', 'Support 1 (Target 1)');
            createLine(S2, '#EF4444', 'Support 2 (Target 2)', LineStyle.Solid); 
        };

        let ws: WebSocket;
        let isChartReady = false;
        let currentCandles: any[] = [];
        let currentCloses: number[] = [];
        let targetZoneData: any[] = [];
        let globalHigh = 0;
        let globalLow = Infinity;

        const initDataEngine = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1m&limit=250');
                const rawData = await res.json();

                rawData.forEach((row: any) => {
                    const time = (row[0] / 1000) as Time;
                    const high = parseFloat(row[2]);
                    const low = parseFloat(row[3]);
                    const close = parseFloat(row[4]);
                    
                    if (high > globalHigh) globalHigh = high;
                    if (low < globalLow) globalLow = low;

                    currentCandles.push({ time, open: parseFloat(row[1]), high, low, close });
                    currentCloses.push(close);
                });

                const latestPrice = currentCloses[currentCloses.length - 1];
                drawTargetLines(latestPrice, globalHigh, globalLow); 

                targetZoneData = currentCandles.map(c => ({ time: c.time, value: currentTargetPrice }));
                targetZoneSeries.setData(targetZoneData);

                const sma50Result = SMA.calculate({ period: 50, values: currentCloses });
                const sma20Result = SMA.calculate({ period: 20, values: currentCloses });
                const bbResult = BollingerBands.calculate({ period: 20, stdDev: 2, values: currentCloses });
                const rsiResult = RSI.calculate({ period: 14, values: currentCloses });

                const ma50 = sma50Result.map((val, idx) => ({ time: currentCandles[idx + 49].time, value: val }));
                const ma20 = sma20Result.map((val, idx) => ({ time: currentCandles[idx + 19].time, value: val }));
                const bbArea = bbResult.map((val, idx) => ({ time: currentCandles[idx + 19].time, value: val.upper })); 
                const rsiSeriesData = rsiResult.map((val, idx) => ({ time: currentCandles[idx + 13].time, value: val }));
                
                const rsiMaResult = SMA.calculate({ period: 9, values: rsiResult });
                const rsiMaSeriesData = rsiMaResult.map((val, idx) => ({ time: rsiSeriesData[idx + 8].time, value: val }));

                candleSeries.setData(currentCandles);
                ma50Series.setData(ma50);
                ma20Series.setData(ma20);
                bbAreaSeries.setData(bbArea);
                rsiSeries.setData(rsiSeriesData);
                rsiMaSeries.setData(rsiMaSeriesData);

                lastCandleTime = currentCandles[currentCandles.length - 1].time;
                lastCandleClose = latestPrice;
                
                if (priceDisplayRef.current) priceDisplayRef.current.innerText = `$${latestPrice.toFixed(2)}`;
                if (timeDisplayRef.current) timeDisplayRef.current.innerText = '● Connected';
                
                const now = new Date();
                if (dateDisplayRef.current) {
                    dateDisplayRef.current.innerText = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US') + ' CET';
                }

                topChart.timeScale().fitContent();
                bottomChart.timeScale().fitContent();

                isChartReady = true;
                updateArrowOverlay();

                ws = new WebSocket('wss://stream.binance.com:9443/ws/paxgusdt@kline_1m');
                
                ws.onmessage = (event) => {
                    if (!isChartReady) return;
                    
                    const message = JSON.parse(event.data);
                    const kline = message.k;
                    
                    const tickTime = (kline.t / 1000) as Time;
                    const tickClose = parseFloat(kline.c);
                    const tickHigh = parseFloat(kline.h);
                    const tickLow = parseFloat(kline.l);

                    if (tickHigh > globalHigh) globalHigh = tickHigh;
                    if (tickLow < globalLow) globalLow = tickLow;

                    const newCandle = {
                        time: tickTime,
                        open: parseFloat(kline.o),
                        high: tickHigh,
                        low: tickLow,
                        close: tickClose,
                    };

                    candleSeries.update(newCandle);

                    if (priceDisplayRef.current) priceDisplayRef.current.innerText = `$${tickClose.toFixed(2)}`;

                    if (tickTime === lastCandleTime) {
                        currentCandles[currentCandles.length - 1] = newCandle;
                        currentCloses[currentCloses.length - 1] = tickClose;
                    } else {
                        currentCandles.push(newCandle);
                        currentCloses.push(tickClose);
                        targetZoneSeries.update({ time: tickTime, value: currentTargetPrice }); 
                        if (currentCandles.length > 500) {
                            currentCandles.shift();
                            currentCloses.shift();
                        }
                    }

                    lastCandleTime = tickTime;
                    lastCandleClose = tickClose;
                    updateArrowOverlay(); 

                    // Dynamically recalculate targets every 5 seconds to avoid performance hit on every tick
                    // But for true live, doing it on tick is fine if it's just math.
                    if (tickTime !== lastCandleTime) {
                         drawTargetLines(tickClose, globalHigh, globalLow);
                    }

                    try {
                        const newSma50 = SMA.calculate({ period: 50, values: currentCloses });
                        if (newSma50.length > 0) ma50Series.update({ time: tickTime, value: newSma50[newSma50.length - 1] });

                        const newSma20 = SMA.calculate({ period: 20, values: currentCloses });
                        if (newSma20.length > 0) ma20Series.update({ time: tickTime, value: newSma20[newSma20.length - 1] });

                        const newBB = BollingerBands.calculate({ period: 20, stdDev: 2, values: currentCloses });
                        if (newBB.length > 0) bbAreaSeries.update({ time: tickTime, value: newBB[newBB.length - 1].upper });

                        const newRsi = RSI.calculate({ period: 14, values: currentCloses });
                        if (newRsi.length > 0) {
                            rsiSeries.update({ time: tickTime, value: newRsi[newRsi.length - 1] });
                            const newRsiMa = SMA.calculate({ period: 9, values: newRsi });
                            if (newRsiMa.length > 0) rsiMaSeries.update({ time: tickTime, value: newRsiMa[newRsiMa.length - 1] });
                        }
                    } catch(e) {}
                };

            } catch (error) {
                console.error("Error setting up data engine: ", error);
            }
        };

        initDataEngine();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === topChartContainerRef.current) {
                    const { width, height } = entry.contentRect;
                    topChart.applyOptions({ width, height });
                } else if (entry.target === bottomChartContainerRef.current) {
                    const { width, height } = entry.contentRect;
                    bottomChart.applyOptions({ width, height });
                }
                updateArrowOverlay();
            }
        });

        resizeObserver.observe(topChartContainerRef.current);
        resizeObserver.observe(bottomChartContainerRef.current);

        const style = document.createElement('style');
        style.innerHTML = `
            a[href^="https://www.tradingview.com/"], .tv-lightweight-charts-logo {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            if (ws) ws.close();
            resizeObserver.disconnect();
            topChart.remove();
            bottomChart.remove();
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div 
            style={{ touchAction: 'none' }} 
            className="relative w-full h-screen min-h-[600px] bg-white text-gray-900 font-sans antialiased flex flex-col overflow-hidden"
        >
            
            <div className="absolute top-0 left-0 right-0 pt-4 px-4 md:px-6 pb-2 z-10 pointer-events-none flex flex-col bg-white border-b border-gray-100 shadow-sm">
                
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-black tracking-tight">Gold</span>
                            <span className="border border-gray-300 bg-[#F3F4F6] text-gray-600 px-1.5 py-[1px] text-[10px] font-semibold tracking-wider">
                                30 MIN
                            </span>
                        </div>
                        <div ref={dateDisplayRef} className="text-[11px] text-gray-500 font-medium">
                            Loading Date...
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span ref={priceDisplayRef} className="text-[16px] font-bold text-gray-900 tracking-tight"></span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div ref={timeDisplayRef} className="text-[10px] text-gray-500 font-medium"></div>
                        </div>
                    </div>
                </div>

                {/* Ultimate Premium Feature: Live Textual Preference Analysis */}
                <div className="bg-[#F8FAFC] border-l-2 border-[#2563EB] px-3 py-2 my-1 rounded-r-md">
                    <span className="text-[11.5px] font-semibold text-gray-800 tracking-tight">
                        {preferenceText}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center text-[10px] md:text-[10.5px] font-medium text-gray-500 mt-2 gap-2 md:gap-0">
                    <div className="flex flex-wrap gap-3 md:gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-[#FF6B6B]"></div>
                            <span>MA 20 + Bollinger Bands</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-[#2563EB]"></div>
                            <span>MA 50</span>
                        </div>
                    </div>
                    <div className="text-gray-400 hidden sm:block">
                        Research © {new Date().getFullYear()} Trading Central
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full flex-grow pt-[160px] md:pt-[125px] pb-6 px-4 md:px-6 relative z-0">
                
                <div className="w-full h-[73%] bg-white relative">
                    <div ref={topChartContainerRef} className="w-full h-full relative z-10" />
                    <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                <polygon id="arrowhead-polygon" points="0 0, 6 3, 0 6" fill="#2563EB" />
                            </marker>
                        </defs>
                        <path ref={arrowPathRef} stroke="#2563EB" strokeWidth="4" fill="none" markerEnd="url(#arrowhead)" />
                    </svg>
                </div>
                
                <div className="w-full h-[27%] bg-white relative mt-1 border-t border-gray-100">
                    <div ref={bottomChartContainerRef} className="w-full h-full relative z-10" />
                    
                    <div className="absolute top-2 left-4 z-20 pointer-events-none flex gap-4 text-[10px] font-medium text-gray-500 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-gray-100">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-[#2563EB]"></div>
                            <span>RSI</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-[#EF4444]"></div>
                            <span>9MA</span>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};
