---
name: skiller
description: Trova su GitHub la skill più votata adatta alla sessione e la installa. Uso: /skiller search | next | install
disable-model-invocation: true
---
Arg = `$ARGUMENTS`. Se vuoto o sconosciuto: NON eseguire nulla, rispondi solo:
"**Comandi skiller**
- `/skiller search`: trova la skill migliore per il tema di questa chat (puoi aggiungere parole, es. `/skiller search stripe`)
- `/skiller next`: mostra la successiva
- `/skiller install`: installa quella mostrata"

Altrimenti esegui UN solo comando Bash, poi rispondi copiando l'output così com'è come markdown (MAI in un blocco di codice) + al massimo una riga. Niente altro.

- `search` (eventuali parole extra = focus): ricava dal contesto della sessione 2-4 parole chiave inglesi del tema → `node ~/.claude/skills/skiller/skiller.mjs search "<parole>"`. Chiudi con: "/skiller install per installarla, /skiller next per un'altra".
- `next` → `node ~/.claude/skills/skiller/skiller.mjs next`
- `install` → `node ~/.claude/skills/skiller/skiller.mjs install`. Se l'output ha ⚠, avvisa l'utente di controllare quei file prima di usarla.
