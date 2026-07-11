'use client';
import dynamic from 'next/dynamic';

const TradingCentralAnalysisChart = dynamic(
  () => import('@/components/TradingCentralAnalysisChart').then(mod => mod.TradingCentralAnalysisChart),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="w-screen h-screen m-0 p-0 overflow-hidden bg-white">
      <TradingCentralAnalysisChart />
    </main>
  );
}
