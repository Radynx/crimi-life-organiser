# Crimi Life Organiser

PWA responsive per gestire spese, scontrini, mezzi, scadenze, ore lavorate, paga stimata e buoni pasto.

## Caratteristiche

- dashboard finanziaria con grafici dinamici e consigli smart;
- registro acquisti con foto facoltativa e associazione automatica ai mezzi;
- schede Macchina e Moto con costi e scadenze;
- registro ore e calcolo in tempo reale di paga e buoni pasto;
- dati salvati localmente sul dispositivo;
- manifest, Service Worker, uso offline e notifiche locali;
- deployment automatico su GitHub Pages.

## Sviluppo locale

Richiede Node.js 22 o successivo e pnpm.

```bash
pnpm install
pnpm dev
```

## Note sulle notifiche

Il Service Worker gestisce notifiche locali e payload Web Push. L'invio di vere notifiche push remote quando l'app è chiusa richiede un servizio applicativo con chiavi VAPID, che GitHub Pages non può eseguire perché offre hosting statico.

## Privacy

I dati rimangono nel `localStorage` del browser. Non vengono inviati a server esterni.
