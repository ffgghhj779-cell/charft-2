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
    const previousPriceRef = useRef<number>(0);
    
    useEffect(() => {
        if (!topChartContainerRef.current || !bottomChartContainerRef.current) return;

        const premiumFont = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const commonChartOptions = {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' }, // Transparent so our premium CSS background shows through
                textColor: '#6B7280',
                fontFamily: premiumFont,
            },
            grid: {
                vertLines: { color: 'rgba(229, 231, 235, 0.6)', style: LineStyle.Dotted },
                horzLines: { color: 'rgba(229, 231, 235, 0.6)', style: LineStyle.Dotted },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { width: 1 as const, color: '#9CA3AF', style: LineStyle.Solid, labelBackgroundColor: '#1F2937' },
                horzLine: { width: 1 as const, color: '#9CA3AF', style: LineStyle.Solid, labelBackgroundColor: '#1F2937' },
            },
            handleScroll: { 
                vertTouchDrag: false, 
                horzTouchDrag: true, 
                pressedMouseMove: true, 
                mouseWheel: true 
            },
            handleScale: { 
                pinch: true, 
                axisPressedMouseMove: { time: true, price: false },
                mouseWheel: true 
            },
            kineticScroll: { touch: true, mouse: false }, 
        };

        const topChart = createChart(topChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(209, 213, 219, 0.8)',
                autoScale: true,
            },
            timeScale: {
                borderColor: 'rgba(209, 213, 219, 0.8)',
                timeVisible: true,
                secondsVisible: false, 
            },
            watermark: {
                color: 'rgba(17, 24, 39, 0.03)',
                visible: true,
                text: 'TRADING CENTRAL',
                fontSize: 64,
                fontFamily: premiumFont,
                horzAlign: 'center',
                vertAlign: 'center',
            },
        });

        const bottomChart = createChart(bottomChartContainerRef.current, {
            ...commonChartOptions,
            rightPriceScale: {
                borderColor: 'rgba(209, 213, 219, 0.8)',
                autoScale: false,
                alignLabels: true,
            },
            timeScale: {
                borderColor: 'rgba(209, 213, 219, 0.8)',
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

        // --- Elite Series Definitions ---
        
        const bbAreaSeries = topChart.addAreaSeries({
            topColor: 'rgba(225, 29, 72, 0.15)', // Premium Crimson Glow
            bottomColor: 'rgba(225, 29, 72, 0.01)',
            lineColor: 'rgba(225, 29, 72, 0.4)',
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const candleSeries = topChart.addCandlestickSeries({
            upColor: '#059669', // Institutional Emerald
            downColor: '#E11D48', // Institutional Crimson
            borderVisible: false,
            wickUpColor: '#059669',
            wickDownColor: '#E11D48',
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
            color: '#E11D48', // Crimson
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
            createTargetLine(candleSeries, latestPrice * 1.005, '#059669', LineStyle.Solid, 2); // Green Top
            createTargetLine(candleSeries, latestPrice * 1.002, '#059669', LineStyle.Solid, 2); // Green Bottom
            createTargetLine(candleSeries, latestPrice * 1.001, '#111827', LineStyle.Solid, 2); // Black
            createTargetLine(candleSeries, latestPrice * 0.999, '#2563EB', LineStyle.Solid, 2); // Blue
            createTargetLine(candleSeries, latestPrice * 0.998, '#E11D48', LineStyle.Dashed, 1); // Red 1
            createTargetLine(candleSeries, latestPrice * 0.995, '#E11D48', LineStyle.Dashed, 1); // Red 2

            createTargetLine(rsiSeries, 70, '#9CA3AF', LineStyle.Dotted, 1);
            createTargetLine(rsiSeries, 50, '#9CA3AF', LineStyle.Dotted, 1);
            createTargetLine(rsiSeries, 30, '#9CA3AF', LineStyle.Dotted, 1);
        };

        // --- REAL Market Data Engine ---
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
                    currentCandles.push({ time, open: parseFloat(row[1]), high: parseFloat(row[2]), low: parseFloat(row[3]), close: parseFloat(row[4]) });
                    currentCloses.push(parseFloat(row[4]));
                });

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

                const latestPrice = currentCloses[currentCloses.length - 1];
                previousPriceRef.current = latestPrice;
                if (priceDisplayRef.current) priceDisplayRef.current.innerText = `$${latestPrice.toFixed(2)}`;
                if (timeDisplayRef.current) timeDisplayRef.current.innerText = '● Live Data Stream Connected';

                drawTargetLines(latestPrice);

                topChart.timeScale().fitContent();
                bottomChart.timeScale().fitContent();

                isChartReady = true;

                // Open WebSocket
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

                    // --- Dynamic Price Flashing Effect ---
                    if (priceDisplayRef.current) {
                        priceDisplayRef.current.innerText = `$${tickClose.toFixed(2)}`;
                        
                        if (tickClose > previousPriceRef.current) {
                            priceDisplayRef.current.className = 'text-lg md:text-xl font-bold text-[#059669] transition-none';
                        } else if (tickClose < previousPriceRef.current) {
                            priceDisplayRef.current.className = 'text-lg md:text-xl font-bold text-[#E11D48] transition-none';
                        }
                        
                        // Fade back to neutral instantly after flash
                        setTimeout(() => {
                            if (priceDisplayRef.current) {
                                priceDisplayRef.current.className = 'text-lg md:text-xl font-bold text-gray-900 transition-colors duration-500';
                            }
                        }, 250);
                    }
                    previousPriceRef.current = tickClose;

                    // Maintain arrays
                    const lastRecordedTime = currentCandles[currentCandles.length - 1].time;
                    if (tickTime === lastRecordedTime) {
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
                if (priceDisplayRef.current) priceDisplayRef.current.innerText = "API Error";
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
        <div 
            style={{ touchAction: 'none' }} 
            className="relative w-full h-screen min-h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 text-gray-900 font-sans antialiased flex flex-col overflow-hidden shadow-2xl"
        >
            
            {/* Elite Glassmorphic Overlay Header */}
            <div className="absolute top-0 left-0 right-0 p-4 md:px-6 md:pt-6 md:pb-3 z-10 pointer-events-none flex flex-col bg-white/60 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all">
                
                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <span className="text-xl md:text-[22px] font-extrabold text-gray-900 tracking-tight">Gold</span>
                    <span className="bg-white/80 border border-gray-200/60 shadow-sm text-gray-600 px-2 py-0.5 rounded text-[11px] font-bold tracking-widest uppercase">
                        30 MIN
                    </span>
                    {/* Live flashing price */}
                    <span ref={priceDisplayRef} className="text-lg md:text-xl font-bold text-gray-900 ml-auto md:ml-0 transition-colors duration-500">
                        Loading...
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div ref={timeDisplayRef} className="text-xs md:text-[13px] text-gray-500 font-medium">
                        Connecting to Binance Engine...
                    </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent mb-3"></div>

                <div className="flex flex-col md:flex-row md:justify-between md:items-center text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-[#E11D48] shadow-[0_0_8px_rgba(225,29,72,0.6)]"></div>
                            <span>MA 20 + Bollinger Bands</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
                            <span>MA 50</span>
                        </div>
                    </div>
                    <div className="text-gray-400 hidden md:block tracking-widest">
                        RESEARCH © {new Date().getFullYear()} TRADING CENTRAL
                    </div>
                </div>
            </div>

            {/* Responsive Chart Container with refined padding for Glass Header */}
            <div className="flex flex-col w-full flex-grow pt-[140px] pb-6 px-4 md:px-6 relative z-0">
                
                {/* Premium container shadows and rounding */}
                <div className="w-full h-[70%] bg-white/40 rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] p-1 overflow-hidden relative backdrop-blur-sm">
                    <div ref={topChartContainerRef} className="w-full h-full" />
                </div>
                
                <div className="w-full h-[30%] bg-white/40 rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] p-1 overflow-hidden relative mt-3 backdrop-blur-sm">
                    <div ref={bottomChartContainerRef} className="w-full h-full" />
                    
                    {/* Glassmorphic Bottom Pane Legend */}
                    <div className="absolute top-3 left-4 z-10 pointer-events-none flex gap-4 text-[11px] font-bold tracking-widest text-gray-600 uppercase bg-white/80 backdrop-blur-md border border-white/50 shadow-sm px-3 py-1.5 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-[#2563EB]"></div>
                            <span>RSI</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-[#E11D48]"></div>
                            <span>9MA</span>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};
