# Crimi Life Organiser

PWA responsive per gestire spese, scontrini, mezzi, scadenze, ore lavorate, paga stimata e buoni pasto.

## Caratteristiche

- dashboard finanziaria con grafici dinamici e consigli smart;
- registro acquisti con foto facoltativa e associazione automatica ai mezzi;
- schede Macchina e Moto con costi e scadenze;
- registro ore e calcolo in tempo reale di paga e buoni pasto;
- accesso opzionale con Firebase Authentication (email/password, registrazione e reset password);
- pagina di accesso obbligatoria e sincronizzazione dei dati per account tramite Cloud Firestore;
- dati salvati localmente sul dispositivo;
- manifest, Service Worker, uso offline e notifiche locali;
- deployment automatico su GitHub Pages.

## Sviluppo locale

Richiede Node.js 22 o successivo e pnpm.

```bash
pnpm install
pnpm dev
```

## Collegamento Firebase Authentication e Firestore

L'app mostra la pagina di accesso prima della dashboard, mantiene la sessione anche dopo la chiusura del browser e salva spese, ore, scadenze, impostazioni e temi nel documento privato dell'account tramite Cloud Firestore. Per abilitarlo devi collegare un tuo progetto Firebase (non inserire mai credenziali nel codice):

1. In [Firebase Console](https://console.firebase.google.com/) crea/seleziona un progetto e vai in **Authentication → Sign-in method**.
2. Attiva il provider **Email/Password** e salva.
3. In **Project settings → Your apps** registra un'app Web e copia i sei valori della configurazione.
4. Per lo sviluppo locale copia `.env.example` in `.env.local` e compila le variabili `VITE_FIREBASE_*`.
5. Per il sito pubblicato apri **GitHub → Settings → Secrets and variables → Actions** e crea questi repository secrets: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`. Il workflow Pages li usa automaticamente durante la build.
6. In **Authentication → Settings → Authorized domains** verifica/aggiungi `radynx.github.io` (e il tuo dominio personalizzato, se ne userai uno). `localhost` è già autorizzato per lo sviluppo.
7. In **Firestore Database** crea un database (modalità produzione) e pubblica le regole contenute in [`firestore.rules`](./firestore.rules). In alternativa, copia quel contenuto nella scheda **Rules** della console e premi **Pubblica**. Le regole consentono a ogni utente di leggere e scrivere solo `users/{uid}/organiser/*` quando il suo UID coincide con quello autenticato.

La configurazione Firebase Web viene inserita nel bundle statico perché identifica l'app, non è una password. Le regole di sicurezza restano nel progetto Firebase; limita comunque l'API key alle API e ai referrer necessari dalla Google Cloud Console.

Quando un account viene usato per la prima volta, l'app crea automaticamente il suo documento Firestore. Se avevi dati nella versione precedente, vengono migrati una sola volta al primo account che accede su quel dispositivo; gli account successivi partono dal proprio spazio isolato.

## Note sulle notifiche

Il Service Worker gestisce notifiche locali e payload Web Push. L'invio di vere notifiche push remote quando l'app è chiusa richiede un servizio applicativo con chiavi VAPID, che GitHub Pages non può eseguire perché offre hosting statico.

## Privacy

Spese, scontrini, scadenze, ore, preferenze e temi vengono sincronizzati nel documento Firestore dell'account autenticato; una copia locale per account permette di ripartire anche con connessione temporaneamente assente. Email e stato di autenticazione vengono gestiti da Firebase Authentication secondo le impostazioni del tuo progetto.
