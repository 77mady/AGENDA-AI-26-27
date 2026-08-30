// api/data.js
//
// Archiviazione condivisa dei dati dell'agenda (eventi, categorie, documenti),
// tramite Vercel Blob Storage. Un unico "file" JSON condiviso, raggiungibile
// allo stesso modo sia visitando il sito direttamente sia incorporandolo in
// un iframe su un altro dominio (es. Google Sites) — a differenza del
// localStorage del browser, che tratta questi due casi come memorie separate.
//
// Richiede che nel progetto Vercel sia collegato uno store "Blob"
// (Storage → Create Database → Blob → Connect to Project): questo imposta
// automaticamente le variabili BLOB_STORE_ID e l'autenticazione OIDC di cui
// l'SDK ha bisogno — non serve creare manualmente nessun token.
//
// Nota sulla privacy: questo endpoint non richiede autenticazione. Chiunque
// conosca l'indirizzo del sito può, in teoria, leggere o modificare i dati
// tramite l'API diretta (non solo tramite l'interfaccia). Per un'agenda
// personale scolastica è un compromesso ragionevole; se in futuro vuoi
// aggiungere una password, è un passo successivo possibile.

import { put, head } from "@vercel/blob";

const BLOB_PATH = "agenda-ai-data.json";

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (req.method === "GET") {
    try {
      const info = await head(BLOB_PATH).catch(() => null);
      if (!info) {
        return res.status(200).json({ events: [], categories: null, documents: [] });
      }
      // Lo store è "Private": la lettura del contenuto richiede il token
      // nell'header Authorization, non solo per le operazioni dell'SDK.
      const r = await fetch(info.url + (info.url.includes('?')?'&':'?') + 'v=' + Date.now(), {
        cache: "no-store",
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      if (!r.ok) return res.status(200).json({ events: [], categories: null, documents: [] });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: "Lettura dati non riuscita: " + err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      await put(BLOB_PATH, JSON.stringify(body), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Salvataggio dati non riuscito: " + err.message });
    }
  }

  return res.status(405).json({ error: "Metodo non consentito." });
}
