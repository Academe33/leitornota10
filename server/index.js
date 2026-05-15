import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { analyzeReadingPayload, validateAnalyzePayload } from "./analyzeReading.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const payload = validateAnalyzePayload(req.body || {});
    const result = await analyzeReadingPayload(payload);
    return res.json(result);
  } catch (error) {
    const statusCode = error?.statusCode || 502;
    console.error("Falha ao analisar áudio:", error);
    return res.status(statusCode).json({
      error: error?.message || "Falha ao analisar áudio.",
    });
  }
});

app.listen(port, () => {
  console.log(`API Node.js ativa em http://localhost:${port}`);
});
