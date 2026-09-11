# Hextech Jeopardy

Ein LoL-Jeopardy-Board mit Live-Buzzer für Spieler und einer Steuerkonsole für den
Gamemaster. Läuft als eigener kleiner Server – **niemand braucht einen Claude-Account**,
auch nicht du. Spieler öffnen einfach einen Link im Browser.

## Was ist das hier?

- `server.js` – der Server (Node.js + Express + Socket.IO), hält das Spiel im Speicher
  und synchronisiert alle Geräte live.
- `game-logic.js` – die eigentliche Spiellogik (Fragen, Buzzer, Punkte). Komplett ohne
  externe Abhängigkeiten, deshalb mit `node test-logic.js` testbar.
- `public/index.html` – die Seite, die im Browser läuft (Gamemaster-Konsole *und*
  Spieler-App in einem, je nachdem wer sich wie anmeldet).
- `data.json` – wird beim ersten Start automatisch angelegt und enthält deine
  Fragen/Kategorien. Bleibt erhalten, solange der Server läuft bzw. neu startet
  (siehe Hinweis zu Render weiter unten).

Die alten 25 Fragen aus deinem bisherigen Board sind schon eingetragen. Fragen, bei
denen im alten Board ein Bild dabei war, sind im Editor mit einem „Bild fehlt“-Hinweis
markiert – die Bilddateien selbst hatte ich nicht, die musst du einmalig neu hochladen.

## 1. Einmalig einrichten

Voraussetzung: [Node.js](https://nodejs.org) (Version 18 oder neuer) ist auf deinem
Rechner installiert.

```bash
cd lol-jeopardy
npm install
```

Optional gleich prüfen, ob die Spiellogik sauber durchläuft:

```bash
node test-logic.js
```

## 2. Lokal starten (Quiz-Abend im selben Raum/WLAN)

```bash
GM_PIN=deinPIN npm start
```

(Unter Windows in PowerShell: `$env:GM_PIN="deinPIN"; npm start`)

Der Server läuft dann auf Port 3000. Öffne `http://localhost:3000` selbst – dort
wählst du „Ich bin Gamemaster“ und gibst die PIN ein.

Deine Mitspieler, die im selben WLAN sind, öffnen stattdessen deine **lokale IP-Adresse**,
z. B. `http://192.168.1.23:3000` (deine IP findest du unter Windows mit `ipconfig`,
unter macOS/Linux mit `ifconfig` bzw. `ip a`). Dort wählen sie „Ich bin Spieler“, geben
ihren Namen ein und können sofort buzzern.

Wenn `deinPIN` weggelassen wird, gilt die Standard-PIN `lolquiz` – bitte für echte
Spielabende unbedingt eine eigene PIN setzen, sonst kann jeder, der den Link kennt,
als Gamemaster mitmischen.

## 3. Übers Internet spielen (auch wenn nicht alle im selben Raum sind)

Dafür muss der Server irgendwo im Internet laufen statt nur auf deinem PC. Render.com
bietet dafür eine **kostenlose Stufe ohne Kreditkarte**, die für einen Quiz-Abend gut
ausreicht (der Dienst „schläft“ nach 15 Minuten Inaktivität ein und braucht beim
nächsten Aufruf ca. 30–60 Sekunden zum Aufwachen – starte ihn also ein paar Minuten
vor dem Quiz).

1. Lade den Ordner `lol-jeopardy` als neues Repository auf [GitHub](https://github.com)
   hoch (kostenloser Account genügt; geht auch komplett über die GitHub-Weboberfläche
   per Drag & Drop, ohne Kommandozeile).
2. Erstelle ein kostenloses Konto auf [render.com](https://render.com).
3. „New +“ → „Web Service“ → dein GitHub-Repository auswählen.
4. Einstellungen:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Unter „Environment“ eine Variable `GM_PIN` mit deiner eigenen PIN anlegen.
6. „Create Web Service“ – nach ein paar Minuten bekommst du eine öffentliche URL wie
   `https://hextech-jeopardy.onrender.com`.
7. Diesen Link teilst du mit deinen Mitspielern – die öffnen ihn einfach im Browser und
   wählen „Ich bin Spieler“. Kein Konto, keine Installation nötig.

**Wichtig:** Der kostenlose Render-Speicher wird bei jedem neuen Deploy zurückgesetzt.
Deine Fragen-Bank (`data.json`) geht dadurch verloren, wenn du den Code später
aktualisierst. Nutze deshalb im Gamemaster-Bereich unter „Einstellungen“ den Button
„Fragen-Bank exportieren“, um vor größeren Änderungen eine Sicherung herunterzuladen,
und „Fragen-Bank importieren“, um sie wiederherzustellen.

## 4. Spielablauf

- **Gamemaster:** PIN eingeben → Board sehen → Feld anklicken, um eine Frage zu öffnen.
  Tipps nacheinander freigeben, die Antwort ist dir privat schon sichtbar (kleiner
  Hinweis-Kasten), bevor du sie mit „Antwort zeigen“ auch für alle Spieler freigibst.
  Sobald jemand buzzert, siehst du live wer – „Richtig“ vergibt automatisch die
  passenden Punkte (inkl. Doppelpunkte-Regel in der Endphase) und gibt die Wahl der
  nächsten Frage an die gewinnende Person weiter; „Falsch“ schließt die Person für
  diese Frage aus und gibt den Buzzer für die anderen wieder frei.
- **Spieler:** Namen eingeben, beitreten, bei geöffneter Frage auf den großen BUZZ-Knopf
  drücken. Wer zuerst buzzert, wird für alle anderen sofort gesperrt.
- **Fragen verwalten:** Kategorien und Fragen komplett ohne Code anlegen/bearbeiten,
  inklusive Bild-Upload (wird automatisch komprimiert) oder Bild-URL – genau für den
  „Was ist hier falsch?“-Fragentyp aus deinem alten Board.
- **Einstellungen:** Doppelpunkte-Endphase an/aus, Fragen zurücksetzen, Punkte
  zurücksetzen, komplett neues Spiel, Fragen-Bank exportieren/importieren.

Viel Spaß beim Quizzen!
