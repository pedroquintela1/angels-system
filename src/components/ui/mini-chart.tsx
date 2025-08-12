import React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface MiniChartProps {
  data: Array<{ value: number; label?: string }>;
  type?: 'line' | 'area';
  color?: string;
  height?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  type = 'line',
  color = '#3b82f6',
  height = 40,
}) => {
  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data}>
          <DataComponent
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={type === 'area' ? color : undefined}
            fillOpacity={type === 'area' ? 0.2 : undefined}
            dot={false}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

// Dados de exemplo para diferentes métricas
export const getExampleChartData = (metric: string) => {
  switch (metric) {
    case 'conversion':
      return [
        { value: 15 },
        { value: 18 },
        { value: 22 },
        { value: 28 },
        { value: 26 },
        { value: 29 },
      ];
    case 'retention':
      return [
        { value: 45 },
        { value: 42 },
        { value: 38 },
        { value: 35 },
        { value: 32 },
        { value: 29 },
      ];
    case 'churn':
      return [
        { value: 8 },
        { value: 6 },
        { value: 4 },
        { value: 2 },
        { value: 1 },
        { value: 0 },
      ];
    case 'ltv':
      return [
        { value: 1200 },
        { value: 1800 },
        { value: 2400 },
        { value: 2800 },
        { value: 3100 },
        { value: 3245 },
      ];
    default:
      return [];
  }
};
