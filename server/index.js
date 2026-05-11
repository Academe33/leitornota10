import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const AUTH_USER = process.env.AUTH_USER || "Ferramentas@academe.com.br";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "Novaeduca@333";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-in-production";
const SESSION_COOKIE_NAME = "academe_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // 15 minutos
const loginAttempts = new Map();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const toBase64Url = (text) => Buffer.from(text, "utf8").toString("base64url");
const fromBase64Url = (text) => Buffer.from(text, "base64url").toString("utf8");

const signPayload = (payloadBase64) => {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
};

const createSessionToken = (username) => {
  const payload = {
    sub: username,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
};

const safeEqualString = (a, b) => {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((acc, pair) => {
    const [rawName, ...rest] = pair.trim().split("=");
    if (!rawName) return acc;
    acc[rawName] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const verifySessionToken = (token) => {
  if (!token || typeof token !== "string") return null;
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = signPayload(payloadBase64);
  if (!safeEqualString(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64));
    if (!payload?.sub || !payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

const getClientKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : req.socket.remoteAddress || "unknown";
  const identifier = typeof req.body?.identifier === "string" ? req.body.identifier : "";
  return `${ip}:${identifier.toLowerCase()}`;
};

const recordFailedAttempt = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, blockedUntil: 0 };
  if (entry.blockedUntil && now < entry.blockedUntil) return entry;
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = now + LOGIN_BLOCK_MS;
    entry.count = 0;
  }
  loginAttempts.set(key, entry);
  return entry;
};

const clearAttempts = (key) => {
  loginAttempts.delete(key);
};

const isBlocked = (key) => {
  const entry = loginAttempts.get(key);
  if (!entry) return { blocked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { blocked: true, retryAfterMs: entry.blockedUntil - now };
  }
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    loginAttempts.delete(key);
  }
  return { blocked: false, retryAfterMs: 0 };
};

const getSessionFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  return verifySessionToken(token);
};

const requireAuth = (req, res, next) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  req.session = session;
  return next();
};

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/session", (req, res) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, user: session.sub });
});

app.post("/api/auth/login", (req, res) => {
  const { identifier, password } = req.body || {};
  const key = getClientKey(req);
  const blocked = isBlocked(key);

  if (blocked.blocked) {
    return res.status(429).json({
      error: "Muitas tentativas. Tente novamente em alguns minutos.",
      retryAfterMs: blocked.retryAfterMs,
    });
  }

  if (typeof identifier !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Credenciais inválidas." });
  }

  const isValidUser = safeEqualString(identifier, AUTH_USER);
  const isValidPassword = safeEqualString(password, AUTH_PASSWORD);
  const isValid = isValidUser && isValidPassword;

  if (!isValid) {
    recordFailedAttempt(key);
    return res.status(401).json({ error: "ID ou senha incorretos." });
  }

  clearAttempts(key);
  const token = createSessionToken(identifier);
  const secure = process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}; SameSite=Strict; ${secure ? "Secure;" : ""}`
  );

  return res.json({ ok: true });
});

app.post("/api/auth/logout", (_req, res) => {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; ${
      secure ? "Secure;" : ""
    }`
  );
  return res.json({ ok: true });
});

app.post("/api/analyze", requireAuth, async (req, res) => {
  const {
    readingAudioBase64,
    interpretationAudioBase64,
    mimeType,
    expectedText,
  } = req.body || {};

  if (!readingAudioBase64 || !mimeType) {
    return res.status(400).json({
      error: "Parâmetros inválidos. readingAudioBase64 e mimeType são obrigatórios.",
    });
  }

  const ai = getAiClient();
  const model = "gemini-3-pro-preview";

  const parts = [{ inlineData: { data: readingAudioBase64, mimeType } }];
  if (interpretationAudioBase64) {
    parts.push({ inlineData: { data: interpretationAudioBase64, mimeType } });
  }
  parts.push({ text: buildPrompt(expectedText) });

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
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

      return res.json(JSON.parse(resultText));
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  console.error("Falha ao analisar áudio:", lastError);
  return res.status(502).json({
    error: "Falha ao analisar áudio após múltiplas tentativas.",
  });
});

app.listen(port, () => {
  console.log(`API Node.js ativa em http://localhost:${port}`);
});
