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
    const tooltipRef = useRef<HTMLDivElement>(null);
    
    const dateDisplayRef = useRef<HTMLDivElement>(null);

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
            handleScroll: { 
                vertTouchDrag: true,
                horzTouchDrag: true, 
                pressedMouseMove: true, 
                mouseWheel: true 
            },
            handleScale: { pinch: true, axisPressedMouseMove: { time: true, price: false }, mouseWheel: true },
            kineticScroll: { touch: true, mouse: false }, 
            trackingMode: { exitMode: 1 }, 
        };

        const topChart = createChart(topChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(209, 213, 219, 0.5)',
                autoScale: true,
                scaleMargins: { top: 0.15, bottom: 0.15 }, 
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

        let isSyncingLeft = false;
        let isSyncingRight = false;

        topChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range && !isSyncingRight) {
                isSyncingLeft = true;
                bottomChart.timeScale().setVisibleLogicalRange(range);
                isSyncingLeft = false;
            }
        });
        bottomChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range && !isSyncingLeft) {
                isSyncingRight = true;
                topChart.timeScale().setVisibleLogicalRange(range);
                isSyncingRight = false;
            }
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
            upColor: '#111827', 
            downColor: '#EF4444', 
            borderVisible: false,
            wickUpColor: '#111827',
            wickDownColor: '#EF4444',
            lastValueVisible: true, 
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

        topChart.subscribeCrosshairMove((param) => {
            if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                bottomChart.clearCrosshairPosition();
                if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            } else {
                const rsiData = param.seriesData.get(rsiSeries) as any; 
                const rsiVal = rsiData ? rsiData.value : 50;
                bottomChart.setCrosshairPosition(rsiVal as number, param.time, rsiSeries);
                
                const candleData = param.seriesData.get(candleSeries) as any;
                if (candleData && tooltipRef.current) {
                    tooltipRef.current.style.display = 'block';
                    const dateStr = new Date((param.time as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    tooltipRef.current.innerHTML = `
                        <div style="font-weight: 700; margin-bottom: 6px; color: #111827; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; font-size: 11px;">${dateStr}</div>
                        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
                            <span style="color: #6B7280; font-size: 10px;">Open</span><span style="font-weight: 600; color: #111827; font-size: 10.5px;">${candleData.open.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
                            <span style="color: #6B7280; font-size: 10px;">High</span><span style="font-weight: 600; color: #10B981; font-size: 10.5px;">${candleData.high.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
                            <span style="color: #6B7280; font-size: 10px;">Low</span><span style="font-weight: 600; color: #EF4444; font-size: 10.5px;">${candleData.low.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 16px;">
                            <span style="color: #6B7280; font-size: 10px;">Close</span><span style="font-weight: 700; color: #2563EB; font-size: 10.5px;">${candleData.close.toFixed(2)}</span>
                        </div>
                    `;
                    
                    const tooltipWidth = 110;
                    const tooltipHeight = 110;
                    const margin = 15;
                    
                    let left = param.point.x + margin;
                    if (left > topChartContainerRef.current!.clientWidth - tooltipWidth) {
                        left = param.point.x - margin - tooltipWidth;
                    }
                    
                    let top = param.point.y + margin;
                    if (top > topChartContainerRef.current!.clientHeight - tooltipHeight) {
                        top = param.point.y - tooltipHeight - margin;
                    }
                    
                    tooltipRef.current.style.left = left + 'px';
                    tooltipRef.current.style.top = top + 'px';
                }
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
        let globalTarget1 = 0;
        let lastCandleTime: Time | null = null;
        let lastCandleClose = 0;

        const updateArrowOverlay = () => {
            if (!topChart || !candleSeries || !lastCandleTime || !arrowPathRef.current || !globalTarget1) return;
            
            const startX = topChart.timeScale().timeToCoordinate(lastCandleTime);
            let adjustedStartX = startX ? startX + 5 : null; 
            const startY = candleSeries.priceToCoordinate(lastCandleClose);
            
            let futureX = startX ? startX + 60 : null; 
            const endY = candleSeries.priceToCoordinate(globalTarget1);

            if (adjustedStartX !== null && startY !== null && futureX !== null && endY !== null) {
                arrowPathRef.current.setAttribute('d', `M ${adjustedStartX} ${startY} L ${futureX} ${endY}`);
            } else {
                arrowPathRef.current.setAttribute('d', ''); 
            }
        };

        topChart.timeScale().subscribeVisibleLogicalRangeChange(updateArrowOverlay);
        topChart.timeScale().subscribeSizeChange(updateArrowOverlay);

        const drawTargetLines = (latestPrice: number) => {
            priceLines.forEach(line => candleSeries.removePriceLine(line));
            priceLines = [];

            // Exact proportional spacing to perfectly mimic the Trading Central screenshot
            // Screenshot ratios (Base = 4102): P=4115, R1=4138, R2=4164, T1=4075, T2=4055
            const C = latestPrice;
            const P = C * (4115 / 4102);
            const R1 = C * (4138 / 4102);
            const R2 = C * (4164 / 4102);
            const T1 = C * (4075 / 4102);
            const T2 = C * (4055 / 4102);

            globalTarget1 = T1;

            const createLine = (price: number, lineColor: string, bgColor: string, textColor: string) => {
                const line = candleSeries.createPriceLine({
                    price,
                    color: lineColor,
                    lineWidth: 1,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    axisLabelColor: bgColor,
                    axisLabelTextColor: textColor,
                    title: '',
                });
                priceLines.push(line);
            };

            createLine(R2, '#10B981', '#ffffff', '#10B981'); 
            createLine(R1, '#10B981', '#ffffff', '#10B981'); 
            createLine(P,  '#2563EB', '#2563EB', '#ffffff'); 
            createLine(T1, '#EF4444', '#EF4444', '#ffffff'); 
            createLine(T2, '#EF4444', '#EF4444', '#ffffff'); 

            candleSeries.applyOptions({
                autoscaleInfoProvider: () => ({
                    priceRange: {
                        minValue: T2 * 0.9995,
                        maxValue: R2 * 1.0005,
                    },
                }),
            });
        };

        let ws: WebSocket;
        let isChartReady = false;
        let currentCandles: any[] = [];
        let currentCloses: number[] = [];

        const initDataEngine = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1m&limit=250');
                const rawData = await res.json();

                rawData.forEach((row: any) => {
                    const time = (row[0] / 1000) as Time;
                    const high = parseFloat(row[2]);
                    const low = parseFloat(row[3]);
                    const close = parseFloat(row[4]);
                    currentCandles.push({ time, open: parseFloat(row[1]), high, low, close });
                    currentCloses.push(close);
                });

                const latestPrice = currentCloses[currentCloses.length - 1];
                drawTargetLines(latestPrice); 

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

                    const newCandle = {
                        time: tickTime,
                        open: parseFloat(kline.o),
                        high: parseFloat(kline.h),
                        low: parseFloat(kline.l),
                        close: tickClose,
                    };

                    candleSeries.update(newCandle);

                    if (tickTime === lastCandleTime) {
                        currentCandles[currentCandles.length - 1] = newCandle;
                        currentCloses[currentCloses.length - 1] = tickClose;
                    } else {
                        currentCandles.push(newCandle);
                        currentCloses.push(tickClose);
                        if (currentCandles.length > 500) {
                            currentCandles.shift();
                            currentCloses.shift();
                        }
                    }

                    lastCandleTime = tickTime;
                    lastCandleClose = tickClose;
                    updateArrowOverlay(); 

                    if (tickTime !== lastCandleTime) {
                         drawTargetLines(tickClose);
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
        <div className="relative w-full h-screen min-h-[600px] bg-white text-gray-900 font-sans antialiased flex flex-col overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none flex flex-col bg-white">
                <div className="flex flex-col gap-1 px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-gray-800">Gold</span>
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-[1px] text-[10px] font-semibold border border-gray-200">
                            30 MIN
                        </span>
                    </div>
                    <div ref={dateDisplayRef} className="text-[11px] text-gray-500 font-medium">
                        Loading Date...
                    </div>
                </div>

                <div className="w-full h-px bg-gray-200"></div>

                <div className="flex justify-between items-center px-4 py-2 text-[10px] text-gray-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-[#EF4444]"></div>
                            <span>MA 20 + Bollinger Bands</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-[#2563EB]"></div>
                            <span>MA 50</span>
                        </div>
                    </div>
                    <div>
                        Research © {new Date().getFullYear()} Trading Central
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full flex-grow pt-[85px] pb-6 px-4 md:px-6 relative z-0">
                
                <div className="w-full h-[73%] bg-white relative">
                    <div ref={topChartContainerRef} className="w-full h-full relative z-10" />
                    
                    {/* SVG ARROW - Thick exactly like screenshot */}
                    <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="4.5" markerHeight="4.5" refX="4" refY="2.25" orient="auto">
                                <polygon id="arrowhead-polygon" points="0 0, 4.5 2.25, 0 4.5" fill="#2563EB" />
                            </marker>
                        </defs>
                        <path ref={arrowPathRef} stroke="#2563EB" strokeWidth="5" fill="none" markerEnd="url(#arrowhead)" />
                    </svg>

                    <div ref={tooltipRef} style={{
                        position: 'absolute',
                        display: 'none',
                        padding: '10px 12px',
                        boxSizing: 'border-box',
                        fontSize: '12px',
                        textAlign: 'left',
                        zIndex: 1000,
                        top: '12px',
                        left: '12px',
                        pointerEvents: 'none',
                        border: '1px solid rgba(229, 231, 235, 0.8)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}></div>
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
