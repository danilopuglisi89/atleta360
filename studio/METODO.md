# Studio Atleta360 — come si leggono le autovalutazioni

Metodo di lettura, valido per qualsiasi squadra seguita. **Questo file non
contiene mai nomi né punteggi di singole persone**: il repository è pubblico
(`danilopuglisi89/atleta360`). I dati veri stanno in Supabase; i dossier con i
nomi si rigenerano quando servono e non si archiviano da nessuna parte.

## Le sette aree

`focus` · `gestione-dello-stress` · `reset` (resilienza all'errore) ·
`comunicazione` · `body` (autostima) · `coachability` (adattabilità) ·
`tattica` (lavoro di squadra). I titoli veri stanno nella tabella `skills`:
leggerli da lì, non riscriverli a mano — un committente può rinominarli.

Tre riguardano il **gruppo** (comunicazione, lavoro di squadra, adattabilità),
tre la **singola** (autostima, stress, resilienza all'errore), una sta in mezzo
(focus). Il confronto fra le due famiglie è la prima cosa da guardare.

## Soglie usate nei dossier

| Valore | Lettura | Colore |
|---|---|---|
| ≤ 3 | da guardare subito, quasi mai un dato tecnico | rosso |
| 4–5 | sotto la sufficienza percepita | arancio |
| 6–7 | normale, nessun segnale | neutro |
| ≥ 8 | punto di forza dichiarato | verde |

Media di squadra sotto **6,0** su un'area = tema collettivo da allenare.

## Regole di lettura imparate sul campo

1. **Un 1 isolato non è una misura, è un messaggio.** Più voti minimi nella
   stessa persona, concentrati sulle voci di relazione, indicano quasi sempre
   un problema di appartenenza al gruppo, non di tecnica. Prima si parla con
   la persona, poi si legge il dato.
2. **La resilienza all'errore tira le altre due.** Chi non archivia l'errore
   accumula tensione e si stima meno: se stress e autostima sono basse insieme
   alla resilienza, si lavora sulla resilienza, non su tre fronti.
3. **Severità contro sopravvalutazione.** Un voto basso di una ragazza severa
   con sé dice il contrario dello stesso voto dato da una che si sopravvaluta.
   Senza la valutazione del mister il dato non è interpretabile: è per questo
   che il primo rilevamento va sollecitato subito.
4. **Il mister valuta PRIMA di leggere il dossier.** L'informazione utile è lo
   scarto fra i due sguardi, e si perde se il mister viene influenzato a priori.
   Va scritto esplicitamente in ogni dossier.
5. **Chi ricompila spontaneamente è ingaggiato.** Il numero di compilazioni non
   dice nulla sulla prestazione, molto sull'interesse: sono le persone a cui un
   riscontro arriva dritto.
6. **Chi non compila al primo giro tende a non compilare mai più.** Va
   recuperata di persona, non con un sollecito nell'app.
7. **Mai per scelte di formazione.** Sono autovalutazioni, non misure di valore
   tecnico. Servono a decidere con chi parlare e di cosa.

## Come si rigenera un dossier

I numeri si leggono con la chiave di servizio dal VPS, calcolando gli aggregati
**sul server** (vedi `.env.coach` in `/opt/atleta360`, mai in locale, mai in
chat). Lo schema è: ultima autovalutazione per atleta, media per area,
mediana, minimo, massimo, quante sotto 6, quante da 8 in su, più il conteggio
delle compilazioni per persona.

Serve sempre anche il controllo incrociato con `assessments`: **zero
valutazioni del mister** è di per sé il dato più importante da segnalare.

Il dossier è un HTML stampato in PDF con Chrome headless, due pagine A4, stessa
identità del sito (navy `#0A1650`/`#17297A`, arancio `#FF7A18`, Inter + Space
Grotesk, logo bianco su fondo navy).

## Privacy — regole fisse

- Nomi e punteggi individuali: solo nel PDF consegnato a mano, marcato
  RISERVATO, destinato a staff, mister e dirigenza.
- Mai nel repository, mai su un sito pubblico, mai in un'area riservata
  costruita ad hoc.
- Il **diario personale** non entra in nessun documento: lo vede solo l'atleta.
- Per la dirigenza, se serve, si produce la sola parte aggregata senza nomi.
- Le atlete sono minorenni: in caso di dubbio, meno dati, non più.
