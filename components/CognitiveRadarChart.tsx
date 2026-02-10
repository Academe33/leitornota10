import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

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
  height = 320 // Altura padrão aumentada para evitar cortes nos rótulos
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
        <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
          <PolarGrid stroke="#F1F5F9" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 900 }} 
          />
          <Radar 
            name="Habilidades" 
            dataKey="A" 
            stroke="#8B5CF6" 
            fill="#8B5CF6" 
            fillOpacity={0.4} 
            strokeWidth={3} 
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CognitiveRadarChart;
