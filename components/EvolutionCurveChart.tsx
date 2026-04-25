import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

export interface EvolutionPoint {
  name: string;
  score: number;
  fullDate?: string;
}

interface EvolutionCurveChartProps {
  data: EvolutionPoint[];
  height?: number;
}

const EvolutionCurveChart: React.FC<EvolutionCurveChartProps> = ({ data, height = 240 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 16, left: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="evolutionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
              <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: 800 }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            hide
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.15)',
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 12px',
            }}
            cursor={{ stroke: '#C4B5FD', strokeWidth: 1.5 }}
            formatter={(value: number) => [`${value} pts`, 'Nota']}
            labelStyle={{ color: '#8B5CF6', fontWeight: 900, fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#8B5CF6"
            strokeWidth={3}
            fill="url(#evolutionFill)"
            dot={{ r: 4, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvolutionCurveChart;
