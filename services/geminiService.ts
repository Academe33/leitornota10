
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key do Gemini não encontrada. Verifique se a variável GEMINI_API_KEY está definida no arquivo .env");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeReadingAudio = async (
  audioBase64: string,
  mimeType: string,
  expectedText?: string
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';

  const prompt = `
    Atue como um avaliador pedagógico rigoroso de leitura em português.
    Analise esta gravação de áudio comparando com o texto esperado abaixo.
    
    ${expectedText ? `TEXTO ESPERADO: "${expectedText}"` : "Avalie a leitura de forma geral."}
    
    CRITÉRIOS DE AVALIAÇÃO RIGOROSOS:
    1. PRECISÃO (Accuracy) - FATOR CRÍTICO:
       - Se o aluno leu apenas uma parte do texto (leitura incompleta), a nota de precisão deve ser proporcional à porcentagem do texto lido. (Ex: Leu apenas a primeira frase de um parágrafo = Precisão muito baixa).
       - Penalize cada palavra trocada, omitida ou inventada.
       - Trocas que alteram o sentido (ex: "tanto" por "tentar") são erros graves.
    
    2. NOTA GERAL (Overall Score):
       - A nota geral deve refletir o DESEMPENHO NA TAREFA COMPLETA.
       - Se a leitura foi interrompida prematuramente ou abrange apenas uma pequena parte do texto, a nota geral DEVE SER BAIXA (abaixo de 50), independentemente da qualidade da voz ou dicção naquele pequeno trecho.
       - NÃO dê notas altas (> 60) para leituras incompletas ou com muitos erros de precisão.
       - A "boa voz" ou "boa dicção" não compensa o fato de não ter lido o texto corretamente.

    Forneça uma análise detalhada incluindo:
    1. Nota de Fluência (0-100)
    2. Nota de Pronúncia (0-100)
    3. Nota de Ritmo/Velocidade (0-100)
    4. Nota de Expressão/Entonação (0-100)
    5. Nota de Precisão (0-100) - Seja impiedoso com leituras incompletas.
    6. Transcrição exata do que foi ouvido.
    7. Feedback qualitativo: Explique claramente por que a nota foi dada, mencionando explicitamente se a leitura foi incompleta.
    8. Pontos fortes.
    9. Áreas para melhoria.
    10. Estimativa de WPM.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            metrics: {
              type: Type.OBJECT,
              properties: {
                fluency: { type: Type.NUMBER },
                pronunciation: { type: Type.NUMBER },
                pacing: { type: Type.NUMBER },
                expression: { type: Type.NUMBER },
                accuracy: { type: Type.NUMBER },
              },
              required: ["fluency", "pronunciation", "pacing", "expression", "accuracy"]
            },
            feedback: { type: Type.STRING },
            transcription: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedWPM: { type: Type.NUMBER },
          },
          required: ["overallScore", "metrics", "feedback", "transcription", "strengths", "areasForImprovement", "estimatedWPM"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Não foi possível obter resposta da IA");
    
    return JSON.parse(resultText) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
