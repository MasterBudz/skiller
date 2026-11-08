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

Altrimenti esegui UN solo comando Bash (timeout 600000: se mancano Node, GitHub CLI o l'accesso a GitHub li installa/collega da solo; se l'output chiede di inserire un codice, mostralo subito all'utente), poi rispondi copiando l'output così com'è come markdown (MAI in un blocco di codice) + al massimo una riga. Niente altro.

- `search` (eventuali parole extra = focus): ricava dal contesto della sessione 2-4 parole chiave inglesi del tema → `bash ~/.claude/skills/skiller/run.sh search "<parole>"`. Chiudi con: "/skiller install per installarla, /skiller next per un'altra".
- `next` → `bash ~/.claude/skills/skiller/run.sh next`
- `install` → `bash ~/.claude/skills/skiller/run.sh install`. Se l'output ha ⚠, avvisa l'utente di controllare quei file prima di usarla.
