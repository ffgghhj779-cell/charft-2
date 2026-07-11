import React, { useEffect, useRef } from 'react';
import {
    createChart,
    CrosshairMode,
    LineStyle,
    ColorType,
    Time,
    IChartApi,
} from 'lightweight-charts';
import { SMA, RSI, BollingerBands } from 'technicalindicators';

export const TradingCentralAnalysisChart: React.FC = () => {
    const topChartContainerRef = useRef<HTMLDivElement>(null);
    const bottomChartContainerRef = useRef<HTMLDivElement>(null);
    
    // High-frequency UI refs (avoid React state for 10 updates/second to ensure buttery smooth performance)
    const priceDisplayRef = useRef<HTMLSpanElement>(null);
    const timeDisplayRef = useRef<HTMLDivElement>(null);
    
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
            handleScroll: { 
                vertTouchDrag: false, 
                horzTouchDrag: true, // Perfect mobile horizontal swipe
                pressedMouseMove: true, 
                mouseWheel: true 
            },
            handleScale: { 
                pinch: true, // Two-finger pinch to zoom on mobile
                axisPressedMouseMove: { time: true, price: false },
                mouseWheel: true 
            },
            kineticScroll: { touch: true, mouse: false }, // Smooth scrolling physics
        };

        const topChart = createChart(topChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                autoScale: true,
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                secondsVisible: false, // 1m candles don't need seconds displayed on axis
            },
        });

        const bottomChart = createChart(bottomChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                autoScale: false,
                alignLabels: true,
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                visible: true,
            },
        });

        // Sync timescales flawlessly
        topChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) bottomChart.timeScale().setVisibleLogicalRange(range);
        });
        bottomChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) topChart.timeScale().setVisibleLogicalRange(range);
        });

        // --- Series Definitions (using lightweight-charts v4 API) ---
        
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

        // Setup fixed RSI scale limits
        bottomChart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        });
        rsiSeries.applyOptions({
            autoscaleInfoProvider: () => ({ priceRange: { minValue: 10, maxValue: 90 } }),
        });

        // Target Line Drawer
        const drawTargetLines = (latestPrice: number) => {
            const createTargetLine = (series: any, price: number, color: string, style: LineStyle, width: number) => {
                series.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title: '' });
            };
            createTargetLine(candleSeries, latestPrice * 1.005, '#10B981', LineStyle.Solid, 2); // Green Top
            createTargetLine(candleSeries, latestPrice * 1.002, '#10B981', LineStyle.Solid, 2); // Green Bottom
            createTargetLine(candleSeries, latestPrice * 1.001, '#111827', LineStyle.Solid, 2); // Black
            createTargetLine(candleSeries, latestPrice * 0.999, '#2563EB', LineStyle.Solid, 2); // Blue
            createTargetLine(candleSeries, latestPrice * 0.998, '#EF4444', LineStyle.Dashed, 1); // Red 1
            createTargetLine(candleSeries, latestPrice * 0.995, '#EF4444', LineStyle.Dashed, 1); // Red 2

            createTargetLine(rsiSeries, 70, '#9CA3AF', LineStyle.Dotted, 1);
            createTargetLine(rsiSeries, 50, '#9CA3AF', LineStyle.Dotted, 1);
            createTargetLine(rsiSeries, 30, '#9CA3AF', LineStyle.Dotted, 1);
        };

        // --- REAL Market Data Engine (Initial fetch + WebSockets) ---
        let ws: WebSocket;
        let isChartReady = false;
        let currentCandles: any[] = [];
        let currentCloses: number[] = [];

        const initDataEngine = async () => {
            try {
                // 1. Fetch historical 1-minute candles for immediate chart rendering
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1m&limit=250');
                const rawData = await res.json();

                rawData.forEach((row: any) => {
                    const time = (row[0] / 1000) as Time;
                    currentCandles.push({ time, open: parseFloat(row[1]), high: parseFloat(row[2]), low: parseFloat(row[3]), close: parseFloat(row[4]) });
                    currentCloses.push(parseFloat(row[4]));
                });

                // Calculate Initial Indicators
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

                // Inject Data
                candleSeries.setData(currentCandles);
                ma50Series.setData(ma50);
                ma20Series.setData(ma20);
                bbAreaSeries.setData(bbArea);
                rsiSeries.setData(rsiSeriesData);
                rsiMaSeries.setData(rsiMaSeriesData);

                const latestPrice = currentCloses[currentCloses.length - 1];
                if (priceDisplayRef.current) priceDisplayRef.current.innerText = `$${latestPrice.toFixed(2)}`;
                if (timeDisplayRef.current) timeDisplayRef.current.innerText = 'Connected (Live Streaming...)';

                drawTargetLines(latestPrice);

                topChart.timeScale().fitContent();
                bottomChart.timeScale().fitContent();

                isChartReady = true;

                // 2. Open High-Frequency WebSocket for Live Ticks
                ws = new WebSocket('wss://stream.binance.com:9443/ws/paxgusdt@kline_1m');
                
                ws.onmessage = (event) => {
                    if (!isChartReady) return;
                    
                    const message = JSON.parse(event.data);
                    const kline = message.k;
                    
                    const tickTime = (kline.t / 1000) as Time;
                    const tickClose = parseFloat(kline.c);
                    const isFinal = kline.x; // Is this candle closed?

                    const newCandle = {
                        time: tickTime,
                        open: parseFloat(kline.o),
                        high: parseFloat(kline.h),
                        low: parseFloat(kline.l),
                        close: tickClose,
                    };

                    // Live update the candle series (Dances up and down live!)
                    candleSeries.update(newCandle);

                    // Update UI Reference instantly (No React State lag!)
                    if (priceDisplayRef.current) priceDisplayRef.current.innerText = `$${tickClose.toFixed(2)}`;

                    // Maintain our tracking arrays
                    const lastRecordedTime = currentCandles[currentCandles.length - 1].time;
                    if (tickTime === lastRecordedTime) {
                        // Updating current unclosed candle
                        currentCandles[currentCandles.length - 1] = newCandle;
                        currentCloses[currentCloses.length - 1] = tickClose;
                    } else {
                        // New minute candle started
                        currentCandles.push(newCandle);
                        currentCloses.push(tickClose);
                        // Memory cleanup to prevent infinite array growth
                        if (currentCandles.length > 500) {
                            currentCandles.shift();
                            currentCloses.shift();
                        }
                    }

                    // Dynamically Update Indicators on the last tick
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
                            
                            // Re-calculate RSI MA
                            const newRsiMa = SMA.calculate({ period: 9, values: newRsi });
                            if (newRsiMa.length > 0) rsiMaSeries.update({ time: tickTime, value: newRsiMa[newRsiMa.length - 1] });
                        }
                    } catch(e) { /* math error on partial tick */ }
                };

            } catch (error) {
                console.error("Error setting up data engine: ", error);
                if (priceDisplayRef.current) priceDisplayRef.current.innerText = "API Error";
            }
        };

        initDataEngine();

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
            if (ws) ws.close();
            resizeObserver.disconnect();
            topChart.remove();
            bottomChart.remove();
        };
    }, []);

    return (
        <div style={{ touchAction: 'none' }} className="relative w-full h-screen min-h-[600px] bg-white text-gray-900 font-sans antialiased flex flex-col">
            
            {/* Elite Tailwind Mobile-Responsive Overlay Header */}
            <div className="absolute top-0 left-0 right-0 p-4 md:px-6 md:pt-6 md:pb-2 z-10 pointer-events-none flex flex-col bg-white">
                
                <div className="flex flex-wrap items-center gap-3 mb-1">
                    <span className="text-xl md:text-[22px] font-bold text-black tracking-tight">Gold</span>
                    <span className="border border-gray-300 text-gray-700 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider">
                        30 MIN
                    </span>
                    {/* Live updating DOM ref without React re-renders */}
                    <span ref={priceDisplayRef} className="text-lg md:text-xl font-bold text-black ml-auto md:ml-0 transition-colors duration-75">
                        Loading...
                    </span>
                </div>
                
                <div ref={timeDisplayRef} className="text-xs md:text-[13px] text-gray-500 font-normal mb-3">
                    Connecting to Binance WebSockets...
                </div>

                <div className="w-full h-px bg-gray-200 mb-2"></div>

                <div className="flex flex-col md:flex-row md:justify-between md:items-center text-[11px] font-medium text-gray-500">
                    <div className="flex gap-5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 bg-[#FF6B6B]"></div>
                            <span>MA 20 + Bollinger Bands</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 bg-[#2563EB]"></div>
                            <span>MA 50</span>
                        </div>
                    </div>
                    <div className="text-gray-400 hidden md:block">
                        Research © {new Date().getFullYear()} Trading Central
                    </div>
                </div>
            </div>

            {/* Responsive Chart Container */}
            <div className="flex flex-col w-full flex-grow pt-[120px] pb-4 px-2 relative">
                <div ref={topChartContainerRef} className="w-full h-[70%]" />
                
                <div className="w-full h-[30%] relative mt-2">
                    <div ref={bottomChartContainerRef} className="w-full h-full" />
                    {/* Bottom Pane Legend (RSI) */}
                    <div className="absolute top-2 left-4 z-10 pointer-events-none flex gap-4 text-[11px] font-medium text-gray-500 bg-white/80 px-2 py-1 rounded">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 bg-[#2563EB]"></div>
                            <span>RSI</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 bg-[#FF6B6B]"></div>
                            <span>9MA</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
