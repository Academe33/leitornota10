
import { AnalysisResult } from "../types";

export const analyzeReadingAudio = async (
  audioBase64: string,
  mimeType: string,
  expectedText?: string,
  interpretationAudioBase64?: string
): Promise<AnalysisResult> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      readingAudioBase64: audioBase64,
      interpretationAudioBase64,
      mimeType,
      expectedText,
    }),
  });

  if (!response.ok) {
    let message = "Falha ao analisar áudio.";
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === "string") {
        message = errorBody.error;
      }
    } catch {
      // ignora erro de parse para manter mensagem padrão
    }
    throw new Error(message);
  }

  return (await response.json()) as AnalysisResult;
};
