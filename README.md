# Hvor er den? 2.1

En iPhone-first hjemmeapp for par, familier og kollektiv som vil finne ting uten å lete.

## Dette fungerer

- konto med e-post og passord
- sikker skylagring i Supabase
- opprette og se flere hjem
- invitere med iPhone-delingsmenyen eller kopiert lenke
- aktive, brukte, utløpte og tilbakekalte invitasjoner
- roller for eier, medlem og lesetilgang
- endre rolle, fjerne medlem og overføre eierskap
- synkronisering i sanntid mellom telefoner
- synlig synkstatus og offline bruk
- private ting som bare eieren kan se
- egne kategorier, rom, skap, skuffer, mapper, bager og kasser
- full plasseringssti: rom → beholder → detalj
- automatisk kode og QR-etikett for hver plassering
- QR-skanning med kamera, bilde eller manuell kode
- flytting, endringshistorikk, tagger og favoritter
- bilder i privat skylagring
- import av eksisterende data fra telefonen
- eksport og import av sikkerhetskopi
- installasjon på iPhone-hjemskjermen
- profil, passordtilbakestilling, utlogging og kontosletting

## Teknisk løsning

Den stabile sky- og synkroniseringskjernen fra 2.0 beholdes. 2.1-funksjonene ligger i små, separate moduler for konto, medlemmer, invitasjoner, QR-skanning og grensesnitt. Dette gjør løsningen enklere å teste og reduserer risikoen for at én feil stopper hele appen.

Supabase-prosjektet inneholder tabeller for profiler, hjem, medlemmer, invitasjoner, kategorier, rom, beholdere, ting, favoritter, bilder og aktivitet. Alle tabeller som brukes av appen har Row Level Security.

## Innlogging

E-postinnlogging er aktiv. Supabase må ha denne adressen som Site URL og tillatt Redirect URL:

```text
https://menes800.github.io/Fiks-det-/
```

Dette settes i **Authentication → URL Configuration** i Supabase.

## GitHub Pages

Appen publiseres automatisk fra `main` etter at valideringen er bestått:

```text
https://menes800.github.io/Fiks-det-/
```
