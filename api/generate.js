// api/generate.js
//
// Proxy sicuro verso i provider IA (Gemini come principale, Mistral come
// fallback per le richieste di solo testo). Le chiavi API restano sul
// server, impostate come variabili d'ambiente nel pannello Vercel:
//   GEMINI_API_KEY  -> https://aistudio.google.com/app/apikey
//   MISTRAL_API_KEY -> https://console.mistral.ai/api-keys/  (opzionale)
//
// Il client invia: { task: "extract" | "chat" | "search", parts: [...] }
// dove ogni parte è { type: "text", text } oppure
// { type: "inline_data", mime_type, data } (base64, per immagini/PDF).
//
// Risponde sempre con { text: "..." } oppure { error: "..." }.

const GEMINI_MODEL = "gemini-2.5-flash";
const MISTRAL_MODEL = "mistral-large-latest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const body = req.body || {};
  const parts = Array.isArray(body.parts) ? body.parts : [];
  if (parts.length === 0) {
    return res.status(400).json({ error: "Nessun contenuto da analizzare." });
  }

  const hasBinaryParts = parts.some((p) => p.type === "inline_data");
  const geminiKey = process.env.GEMINI_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;

  // 1) Prova prima con Gemini (supporta testo, immagini e PDF)
  if (geminiKey) {
    try {
      const text = await callGemini(parts, geminiKey);
      return res.status(200).json({ text, provider: "gemini" });
    } catch (err) {
      console.error("Errore Gemini:", err.message);
      if (hasBinaryParts || !mistralKey) {
        return res.status(502).json({ error: "Il servizio IA non è riuscito ad analizzare il contenuto (" + err.message + ")." });
      }
    }
  }

  // 2) Fallback su Mistral, solo per contenuti di solo testo
  if (mistralKey && !hasBinaryParts) {
    try {
      const text = await callMistral(parts, mistralKey);
      return res.status(200).json({ text, provider: "mistral" });
    } catch (err) {
      console.error("Errore Mistral:", err.message);
      return res.status(502).json({ error: "Il servizio IA non è riuscito a rispondere (" + err.message + ")." });
    }
  }

  return res.status(500).json({ error: "Nessuna chiave API configurata sul server (GEMINI_API_KEY / MISTRAL_API_KEY)." });
}

async function callGemini(parts, apiKey) {
  const geminiParts = parts.map((p) => {
    if (p.type === "text") return { text: p.text };
    return { inline_data: { mime_type: p.mime_type, data: p.data } };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: geminiParts }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error((data.error && data.error.message) || "risposta non valida da Gemini");
  }
  const candidate = data.candidates && data.candidates[0];
  const text = candidate && candidate.content && candidate.content.parts
    ? candidate.content.parts.map((p) => p.text || "").join("")
    : "";
  if (!text) {
    const reason = candidate && candidate.finishReason;
    throw new Error("nessun testo restituito" + (reason ? " (motivo: " + reason + ")" : ""));
  }
  return text;
}

async function callMistral(parts, apiKey) {
  const textContent = parts.filter((p) => p.type === "text").map((p) => p.text).join("\n\n");
  const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [{ role: "user", content: textContent }],
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error((data.error && data.error.message) || "risposta non valida da Mistral");
  }
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error("nessun testo restituito");
  return text;
}
