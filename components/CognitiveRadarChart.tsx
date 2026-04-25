import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';

interface RadarMetrics {
  fluency: number;
  accuracy: number;
  pacing: number;
  expression: number;
  pronunciation: number;
  comprehension: number;
}

interface CognitiveRadarChartProps {
  metrics: RadarMetrics;
  width?: number | string;
  height?: number | string;
}

const CognitiveRadarChart: React.FC<CognitiveRadarChartProps> = ({
  metrics,
  width = "100%",
  height = 340
}) => {

  const radarData = [
    { subject: 'FLUÊNCIA', A: metrics.fluency, fullMark: 100 },
    { subject: 'PRECISÃO', A: metrics.accuracy, fullMark: 100 },
    { subject: 'RITMO', A: metrics.pacing, fullMark: 100 },
    { subject: 'EXPRESSÃO', A: metrics.expression, fullMark: 100 },
    { subject: 'PRONÚNCIA', A: metrics.pronunciation, fullMark: 100 },
    { subject: 'COMPREENSÃO', A: metrics.comprehension, fullMark: 100 },
  ];

  return (
    <div style={{ width, height }} className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="78%" data={radarData}>
          <defs>
            <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.55} />
            </radialGradient>
          </defs>
          <PolarGrid
            stroke="#EDE9FE"
            strokeDasharray="2 4"
            radialLines={true}
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900, letterSpacing: 1 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            axisLine={false}
            tick={false}
          />
          <Radar
            name="Habilidades"
            dataKey="A"
            stroke="#8B5CF6"
            fill="url(#radarFill)"
            fillOpacity={1}
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#fff', stroke: '#8B5CF6', strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CognitiveRadarChart;
