# Hvor er den? 2.1

En iPhone-first hjemmeapp for par, familier og kollektiv som vil finne ting uten å lete.

## Dette fungerer

- konto med e-post og passord
- glemt passord, endre passord og slette konto
- sikker skylagring i Supabase
- opprette og bytte mellom flere hjem
- invitasjonslenker med iPhone-delingsmenyen
- status for aktive, brukte, utløpte og tilbakekalte invitasjoner
- roller for eier, medlem og lesetilgang
- endre rolle, fjerne medlem og overføre eierskap
- synkronisering i sanntid mellom telefoner
- synkstatus og kø for endringer uten nett
- private ting og private bilder
- egne kategorier, rom, skap, skuffer, mapper, bager og kasser
- full plasseringssti: rom → beholder → detalj
- automatisk kode og QR-etikett for hver plassering
- QR-skanning med kamera, bilde eller manuell kode
- flytting, endringshistorikk, tagger og favoritter
- import av eksisterende lokale ting uten å lage åpenbare duplikater
- eksport og import av sikkerhetskopi
- kort startveiledning
- installasjon på iPhone-hjemskjermen

## Backend og sikkerhet

Supabase-prosjektet inneholder profiler, hjem, medlemmer, invitasjoner, kategorier, rom, beholdere, ting, favoritter, bilder og aktivitet.

Alle eksponerte datatabeller bruker Row Level Security. Brukeren får bare tilgang til hjem vedkommende er medlem av. Private ting og tilhørende bilder er bare tilgjengelige for eieren. Administrative handlinger som medlemsroller, eierskap, invitasjoner og sletting kontrolleres på serveren.

## Invitasjoner

Eieren oppretter én invitasjonslenke og velger medlem eller lesetilgang. Lenken kan deles gjennom systemets delingsmeny. En invitasjon kan brukes én gang og kan tilbakekalles før den brukes.

## Supabase Auth

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

Ved større oppdateringer bør appen på hjemskjermen lukkes helt og åpnes på nytt, slik at ny service worker og cache aktiveres.
