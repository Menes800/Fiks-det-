# Hvor er den? 2.0

En iPhone-first hjemmeapp for par, familier og kollektiv som vil finne ting uten å lete.

## Dette fungerer

- konto med e-post og passord
- sikker skylagring i Supabase
- opprette og bytte mellom flere hjem
- invitere medlemmer med lenke
- roller for eier, medlem og lesetilgang
- synkronisering i sanntid mellom telefoner
- private ting som bare eieren kan se
- egne kategorier, rom, skap, skuffer, mapper, bager og kasser
- full plasseringssti: rom → beholder → detalj
- automatisk kode og QR-etikett for hver plassering
- flytting, endringshistorikk, tagger og favoritter
- bilder i privat skylagring
- lokal lagring og offline bruk når nettet er borte
- import av eksisterende data fra telefonen
- eksport og import av sikkerhetskopi
- installasjon på iPhone-hjemskjermen

## Backend

Supabase-prosjektet inneholder tabeller for profiler, hjem, medlemmer, invitasjoner, kategorier, rom, beholdere, ting, favoritter, bilder og aktivitet.

Alle tabeller som brukes av appen har Row Level Security. Brukeren får bare tilgang til hjem vedkommende er medlem av. Private ting og bildene deres er bare tilgjengelige for eieren.

## Innlogging

E-postinnlogging er aktiv i første skyversjon. Logg inn med Apple kommer senere, fordi det krever Apple Developer-oppsett og egne OAuth-nøkler.

Supabase må ha denne adressen som Site URL og tillatt Redirect URL:

```text
https://menes800.github.io/Fiks-det-/
```

Dette settes i **Authentication → URL Configuration** i Supabase.

## GitHub Pages

Appen publiseres automatisk fra `main` og kan åpnes på:

```text
https://menes800.github.io/Fiks-det-/
```
