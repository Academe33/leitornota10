
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
  readingAudioBase64: string,
  comprehensionAudioBase64: string,
  mimeType: string,
  expectedText?: string
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';

  const prompt = `
    Atue como um avaliador pedagógico rigoroso de leitura em português.
    Você receberá DOIS áudios:
    1. O primeiro áudio é a LEITURA do aluno do texto esperado abaixo.
    2. O segundo áudio é a EXPLICAÇÃO (Interpretação) do aluno sobre o que ele entendeu do texto.
    
    ${expectedText ? `TEXTO ESPERADO: "${expectedText}"` : "Avalie a leitura de forma geral."}
    
    CRITÉRIOS DE AVALIAÇÃO RIGOROSOS:
    1. PRECISÃO (Accuracy) - FATOR CRÍTICO:
       - Se o aluno leu apenas uma parte do texto (leitura incompleta), a nota de precisão deve ser proporcional à porcentagem do texto lido.
       - Penalize cada palavra trocada, omitida ou inventada.
    
    2. COMPREENSÃO (Comprehension) - NOVA MÉTRICA:
       - Analise o segundo áudio (Explicação).
       - O aluno conseguiu captar a ideia principal do texto?
       - Ele mencionou os personagens principais e o desfecho?
       - A explicação faz sentido com o texto original?
       - Nota 0 se não houver explicação ou for totalmente desconexa. Nota 100 para um resumo perfeito.

    3. NOTA GERAL (Overall Score):
       - A nota geral deve ser uma média ponderada entre a qualidade da leitura (60%) e a compreensão (40%).
       - Leitura incompleta ainda penaliza gravemente a nota geral.

    Forneça uma análise detalhada incluindo:
    1. Nota de Fluência (0-100)
    2. Nota de Pronúncia (0-100)
    3. Nota de Ritmo/Velocidade (0-100)
    4. Nota de Expressão/Entonação (0-100)
    5. Nota de Precisão (0-100)
    6. Nota de Compreensão (0-100) - Baseada no segundo áudio.
    7. Transcrição exata da LEITURA (primeiro áudio).
    8. Feedback qualitativo: Comente sobre a leitura E sobre a explicação do aluno.
    9. Pontos fortes.
    10. Áreas para melhoria.
    11. Estimativa de WPM (apenas da leitura).
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: "Áudio 1: Leitura do Texto" },
          { inlineData: { data: readingAudioBase64, mimeType: mimeType } },
          { text: "Áudio 2: Explicação/Interpretação" },
          { inlineData: { data: comprehensionAudioBase64, mimeType: mimeType } },
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
                comprehension: { type: Type.NUMBER },
              },
              required: ["fluency", "pronunciation", "pacing", "expression", "accuracy", "comprehension"]
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
