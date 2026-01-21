import KPICard from '@/components/financial/KPICard';
import type { KPIData } from '@/types/financial';

interface KPIGridProps {
  kpis: KPIData[];
  loading?: boolean;
}

export default function KPIGrid({ kpis, loading }: KPIGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <KPICard key={i} data={{} as KPIData} loading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <KPICard key={index} data={kpi} />
      ))}
    </div>
  );
}