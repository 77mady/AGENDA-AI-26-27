[README.md](https://github.com/user-attachments/files/31605407/README.md)
# Agenda AI — versione da pubblicare sul tuo sito (Vercel + GitHub)

Questa cartella è pronta per essere pubblicata con la stessa modalità che
usi già per EduPlan: un `index.html` statico più una funzione serverless
in `api/generate.js` che tiene al sicuro la chiave API. Vercel, nel piano
gratuito (Hobby), non richiede crediti a pagamento per un progetto
personale come questo.

## Cosa contiene

- `index.html` — l'app completa (interfaccia, calendario, import documenti).
- `api/generate.js` — la funzione serverless che riceve le richieste dal
  browser e le inoltra a Gemini (o a Mistral come riserva, solo per le
  richieste di solo testo — non supporta immagini/PDF).
- `package.json` — minimo, serve solo perché Vercel riconosca il progetto.

Il browser **non contiene mai** la chiave API: la usa solo la funzione,
lato server.

## Passi per pubblicarla (come hai già fatto per EduPlan)

1. **Crea un nuovo repository su GitHub** (es. `agenda-ai`) e carica dentro
   tutto il contenuto di questa cartella.

2. **Vai su vercel.com** → "Add New..." → "Project" → importa il
   repository appena creato. Non serve impostare comandi di build: Vercel
   riconosce da solo `index.html` come sito statico e `api/*.js` come
   funzioni serverless, e installa da solo la dipendenza `@vercel/blob`
   elencata in `package.json`.

3. **Attiva l'archiviazione condivisa (Vercel Blob):**
   Nel progetto su Vercel vai su "Storage" → "Create Database" → scegli
   "Blob" → dagli un nome e crealo, poi collegalo a questo progetto quando
   richiesto ("Connect Project"). Questo passaggio imposta da solo la
   variabile d'ambiente `BLOB_READ_WRITE_TOKEN`, necessaria perché l'agenda
   funzioni. È gratuito nel piano Hobby entro una soglia di utilizzo ampia
   per un uso personale.

4. **Imposta la chiave API come variabile d'ambiente:**
   Nelle impostazioni del progetto su Vercel vai su
   `Settings → Environment Variables` e aggiungi:
   - `GEMINI_API_KEY` = la tua chiave da https://aistudio.google.com/app/apikey
   - (facoltativo) `MISTRAL_API_KEY` = la tua chiave da
     https://console.mistral.ai/api-keys/ — usata solo come riserva per le
     richieste che non contengono immagini o PDF (ricerca, assistente,
     testo incollato), nel caso Gemini non risponda.

5. **Fai un nuovo deploy** (dopo aver collegato lo storage Blob e salvato le
   variabili d'ambiente, serve rifare il deploy perché vengano applicate —
   dalla scheda "Deployments" scegli l'ultimo e clicca "Redeploy").

6. **Apri l'indirizzo che Vercel ti assegna** (o collega il tuo dominio
   personalizzato, come per EduPlan) — l'app è pronta. Puoi aprirla
   direttamente dal browser oppure incorporarla in un iframe su un altro
   sito (es. Google Sites): in entrambi i casi vedrai sempre gli stessi
   dati, perché ora sono salvati in modo condiviso lato server e non più
   nel browser.

## Nota su dove sono salvati i dati

I tuoi eventi, categorie e documenti sono ora salvati in un unico archivio
condiviso su Vercel Blob Storage, raggiunto dall'app tramite la funzione
`api/data.js`. Questo garantisce che i dati siano identici sia aprendo il
sito direttamente sia incorporandolo in un iframe su un altro dominio (i
browser moderni, per motivi di privacy, tratterebbero altrimenti queste due
situazioni come memorie separate se si fosse usato il `localStorage` del
browser, come nella prima versione).

**Nota sulla privacy:** questo endpoint di salvataggio non richiede una
password: chiunque conoscesse l'indirizzo esatto dell'API potrebbe in teoria
leggere o modificare i dati. Per un'agenda personale ad uso scolastico è un
compromesso ragionevole vista la semplicità, ma se in futuro vuoi aggiungere
una protezione con password è un passo successivo possibile.

**Migrazione automatica:** la prima volta che apri la nuova versione dal
browser in cui avevi già inserito appuntamenti, l'app li troverà ancora
salvati localmente e li trasferirà da sola nell'archivio condiviso — non
li perderai.

## Limiti di Gemini/Mistral da tenere presenti

- Gemini legge PDF e immagini (anche scansioni) direttamente, quindi
  l'estrazione automatica funziona come nella versione di prova.
- Mistral (usato solo come riserva) legge solo testo: se Gemini non
  risponde e il documento è un'immagine o un PDF, l'app ti chiederà di
  usare l'opzione "Incolla testo" invece di ricaricare il file.

## Cosa ho corretto in questa versione

- I documenti lunghi (Word, Excel, testo) non venivano più tagliati a
  9000 caratteri prima dell'analisi: ora il limite è molto più alto, così
  gli appuntamenti che stavano più avanti nel documento non vengono più
  persi.
- Le istruzioni date all'IA ora insistono esplicitamente su orario e
  sede/luogo, con esempi delle forme in cui possono comparire nei testi
  scolastici italiani, e sul non tralasciare eventi quando sono numerosi.
- La risposta dell'IA può essere più lunga (fino a 8192 token), per
  evitare che un elenco con molti eventi venga interrotto a metà.
