# Componente Radar Cognitivo (Hexágono de Habilidades)

Este documento contém o código completo e instruções para o componente de gráfico Radar (CognitiveRadarChart), utilizado para visualizar as métricas de leitura (Fluência, Precisão, Ritmo, Expressão, Pronúncia).

## 1. Dependências

Certifique-se de ter a biblioteca `recharts` instalada no seu projeto:

```bash
npm install recharts
```

## 2. Código do Componente

Crie o arquivo `components/CognitiveRadarChart.tsx` com o seguinte conteúdo:

```tsx
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface RadarMetrics {
  fluency: number;      // Fluência
  accuracy: number;     // Precisão
  pacing: number;       // Ritmo
  expression: number;   // Expressão
  pronunciation: number;// Pronúncia
}

interface CognitiveRadarChartProps {
  metrics: RadarMetrics;
  width?: number | string;
  height?: number | string;
}

const CognitiveRadarChart: React.FC<CognitiveRadarChartProps> = ({ 
  metrics, 
  width = "100%", 
  height = 320 // Altura ajustada para evitar cortes nos textos
}) => {
  
  // Configuração dos eixos e valores
  const radarData = [
    { subject: 'FLUÊNCIA', A: metrics.fluency, fullMark: 100 },
    { subject: 'PRECISÃO', A: metrics.accuracy, fullMark: 100 },
    { subject: 'RITMO', A: metrics.pacing, fullMark: 100 },
    { subject: 'EXPRESSÃO', A: metrics.expression, fullMark: 100 },
    { subject: 'PRONÚNCIA', A: metrics.pronunciation, fullMark: 100 },
  ];

  return (
    <div style={{ width, height }} className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
          {/* Grid Hexagonal de Fundo */}
          <PolarGrid stroke="#F1F5F9" />
          
          {/* Rótulos dos Eixos (Texto em volta) */}
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 900 }} 
          />
          
          {/* A Forma Preenchida (Dados) */}
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
```

## 3. Como Utilizar

Para usar o componente em qualquer parte da sua aplicação, importe-o e passe o objeto `metrics`:

```tsx
import CognitiveRadarChart from './components/CognitiveRadarChart';

// Exemplo de uso
const MeuComponente = () => {
  const minhasMetricas = {
    fluency: 85,
    accuracy: 90,
    pacing: 75,
    expression: 80,
    pronunciation: 95
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm">
      <h2>Minha Análise de Leitura</h2>
      <CognitiveRadarChart 
        metrics={minhasMetricas}
        height={350} // Opcional: ajusta altura se precisar
      />
    </div>
  );
};
```
