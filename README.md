# Fiks det!

En liten drifts- og problemløsningssimulator laget med vanlig HTML, CSS og JavaScript.

Spilleren får tilfeldige driftssaker og må:

- vurdere alvorlighetsgrad
- velge første tiltak
- velge riktig leverandør
- skrive en kort arbeidsordre

Svarene gir poeng, streak-bonus og nivåene **Vaktmester**, **Driftsansvarlig**, **Driftsleder** og **Eiendomssjef**. Fremdriften lagres lokalt i nettleseren.

## Kjør lokalt

Åpne `index.html` direkte i nettleseren, eller start en enkel lokal server:

```bash
python -m http.server 8000
```

Åpne deretter `http://localhost:8000`.

## GitHub Pages

Repoet inneholder en workflow som publiserer nettsiden automatisk med GitHub Pages når det pushes til `main`.

Første gang må **Settings → Pages → Source** eventuelt settes til **GitHub Actions**.
