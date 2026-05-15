import { GoogleGenAI, Type } from "@google/genai";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não encontrada no ambiente do servidor.");
  }
  return new GoogleGenAI({ apiKey });
};

const buildPrompt = (expectedText) => `
Atue como um avaliador pedagógico rigoroso de leitura em português.

Você receberá um ou dois áudios:
1. O PRIMEIRO ÁUDIO é a leitura do texto pelo aluno.
2. O SEGUNDO ÁUDIO (se fornecido) é a explicação do aluno sobre o que ele entendeu do texto.

${expectedText ? `TEXTO ESPERADO (para o primeiro áudio): "${expectedText}"` : "Avalie a leitura de forma geral."}

CRITÉRIOS DE AVALIAÇÃO RIGOROSOS:
1. PRECISÃO (Accuracy) - FATOR CRÍTICO:
   - Se o aluno leu apenas uma parte do texto (leitura incompleta), a nota de precisão deve ser proporcional à porcentagem do texto lido.
   - Penalize trocas, omissões ou invenções.

2. COMPREENSÃO (Comprehension) - NOVO CRITÉRIO:
   - Analise o SEGUNDO ÁUDIO (explicação).
   - O aluno conseguiu captar a ideia central do texto?
   - Ele mencionou os personagens principais e o desfecho?
   - Se não houver segundo áudio ou se for ininteligível, dê nota 0 em compreensão.
   - Se a explicação for superficial ("fala de um leão"), nota baixa (30-50).
   - Se for detalhada e correta (ex: "O leão soltou o rato e depois o rato salvou o leão roendo a corda"), nota alta (80-100).

3. NOTA GERAL (Overall Score):
   - Considere a leitura (peso 70%) e a compreensão (peso 30%).
   - Leitura incompleta ainda penaliza muito a nota geral.

Forneça uma análise detalhada incluindo:
1. Nota de Fluência (0-100)
2. Nota de Pronúncia (0-100)
3. Nota de Ritmo/Velocidade (0-100)
4. Nota de Expressão/Entonação (0-100)
5. Nota de Precisão (0-100)
6. Nota de Compreensão (0-100) - Baseada na explicação.
7. Transcrição exata da LEITURA (primeiro áudio).
8. Feedback qualitativo: Comente sobre a leitura e sobre a capacidade de interpretação demonstrada.
9. Pontos fortes.
10. Áreas para melhoria.
11. Estimativa de WPM (da leitura).
`;

export const validateAnalyzePayload = (payload = {}) => {
  const {
    readingAudioBase64,
    interpretationAudioBase64,
    mimeType,
    expectedText,
  } = payload;

  if (!readingAudioBase64 || !mimeType) {
    const error = new Error("Parâmetros inválidos. readingAudioBase64 e mimeType são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  return {
    readingAudioBase64,
    interpretationAudioBase64,
    mimeType,
    expectedText,
  };
};

export const analyzeReadingPayload = async (payload) => {
  const {
    readingAudioBase64,
    interpretationAudioBase64,
    mimeType,
    expectedText,
  } = validateAnalyzePayload(payload);

  const ai = getAiClient();
  const model = "gemini-3-pro-preview";
  const parts = [{ inlineData: { data: readingAudioBase64, mimeType } }];

  if (interpretationAudioBase64) {
    parts.push({ inlineData: { data: interpretationAudioBase64, mimeType } });
  }

  parts.push({ text: buildPrompt(expectedText) });

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const currentTimeoutMs = attempt === 1 ? 12000 : attempt === 2 ? 18000 : 25000;

    try {
      const generateContentPromise = ai.models.generateContent({
        model,
        contents: { parts },
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
                required: [
                  "fluency",
                  "pronunciation",
                  "pacing",
                  "expression",
                  "accuracy",
                  "comprehension",
                ],
              },
              feedback: { type: Type.STRING },
              transcription: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
              estimatedWPM: { type: Type.NUMBER },
            },
            required: [
              "overallScore",
              "metrics",
              "feedback",
              "transcription",
              "strengths",
              "areasForImprovement",
              "estimatedWPM",
            ],
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Timeout na tentativa ${attempt} (${currentTimeoutMs}ms).`)),
          currentTimeoutMs
        );
      });

      const response = await Promise.race([generateContentPromise, timeoutPromise]);
      const resultText = response?.text;

      if (!resultText) {
        throw new Error("Resposta vazia da IA.");
      }

      return JSON.parse(resultText);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error("Falha ao analisar áudio após múltiplas tentativas.");
};
