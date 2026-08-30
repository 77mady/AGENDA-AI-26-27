// api/data.js
//
// Archiviazione condivisa dei dati dell'agenda (eventi, categorie, documenti),
// tramite Vercel Blob Storage (store privato). Un unico "file" JSON
// condiviso, raggiungibile allo stesso modo sia visitando il sito
// direttamente sia incorporandolo in un iframe su un altro dominio (es.
// Google Sites) — a differenza del localStorage del browser, che tratta
// questi due casi come memorie separate.
//
// Richiede che nel progetto Vercel sia collegato uno store "Blob" di tipo
// Private (Storage → Create Database → Blob → Connect to Project) e che
// sia presente la variabile d'ambiente BLOB_READ_WRITE_TOKEN (visibile
// nella scheda ".env.local" dello store, da copiare manualmente nelle
// Environment Variables del progetto se non compare da sola).
//
// Nota sulla privacy: questo endpoint non richiede una password propria
// dell'applicazione. Chiunque conosca l'indirizzo del sito può, in teoria,
// leggere o modificare i dati tramite l'API diretta (non solo tramite
// l'interfaccia). Per un'agenda personale scolastica è un compromesso
// ragionevole; se in futuro vuoi aggiungere una password, è un passo
// successivo possibile.

import { put, get } from "@vercel/blob";

const BLOB_PATH = "agenda-ai-data.json";
const EMPTY_STATE = { events: [], categories: null, documents: [] };

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      let response;
      try {
        // useCache:false evita il ritardo di propagazione della cache
        // (fino a 60 secondi) dopo un salvataggio recente.
        response = await get(BLOB_PATH, { access: "private", useCache: false });
      } catch (e) {
        // Nessun dato ancora salvato: agenda vuota, non è un errore.
        return res.status(200).json(EMPTY_STATE);
      }
      const text = await new Response(response.stream).text();
      const data = text ? JSON.parse(text) : EMPTY_STATE;
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
