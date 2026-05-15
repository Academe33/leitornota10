import { analyzeReadingPayload, validateAnalyzePayload } from "../server/analyzeReading.js";

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const payload = validateAnalyzePayload(req.body || {});
    const result = await analyzeReadingPayload(payload);
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error?.statusCode || 502;
    console.error("Falha ao analisar áudio na Vercel:", error);
    return res.status(statusCode).json({
      error: error?.message || "Falha ao analisar áudio.",
    });
  }
}
