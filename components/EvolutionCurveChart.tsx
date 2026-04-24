import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LabelList,
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

const EvolutionCurveChart: React.FC<EvolutionCurveChartProps> = ({ data, height = 260 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 30, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#EEF2FF" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 800 }}
            dy={10}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: 700 }}
            width={30}
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              fontSize: 12,
              fontWeight: 700,
            }}
            cursor={{ stroke: '#8B5CF6', strokeWidth: 1.5, strokeDasharray: '4 4' }}
            formatter={(value: number) => [`${value} pts`, 'Nota']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ r: 6, fill: '#fff', stroke: '#8B5CF6', strokeWidth: 3 }}
            activeDot={{ r: 8, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 3 }}
          >
            <LabelList
              dataKey="score"
              position="top"
              offset={12}
              fill="#8B5CF6"
              fontSize={12}
              fontWeight={900}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvolutionCurveChart;
