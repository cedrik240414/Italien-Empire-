# Italien Empire

Ein 3D-Open-World-Spiel im Browser, das in ganz Italien spielt – von den Alpen bis Sizilien.
Story: Jack Moretti, Marco Bellini und Sofia Romano steigen von kleinen Kriminellen zu den mächtigsten
Organisatoren Italiens auf und geraten zwischen La Corona, das FIB und eine geheime Verschwörung.

## Spielen
**Online spielen über GitHub Pages:** https://cedrik240414.github.io/Italien-Empire-/
(nachdem Pages wie unten eingeschaltet ist)

### GitHub Pages einschalten (einmalig)
1. Im Repository auf **Settings** → links **Pages** → **Source: GitHub Actions**.
2. Der Workflow „Website veröffentlichen“ läuft bei jedem Hochladen und stellt das Spiel online
   (oder unter **Actions** → „Website veröffentlichen“ → **Run workflow**).

### Online-Server bei Cloudflare (für Lobbys und Rangliste auf GitHub Pages)
1. Bei Cloudflare einen API-Token mit der Berechtigung **Workers Scripts: Edit** erstellen
   (Vorlage „Edit Cloudflare Workers“). Einmal im Cloudflare-Dashboard **Workers & Pages** öffnen, damit die workers.dev-Adresse angelegt ist.
2. Im Repository: **Settings → Secrets and variables → Actions → New repository secret**
   Name `CLOUDFLARE_API_TOKEN`, Wert = der Token. (Optional `CLOUDFLARE_ACCOUNT_ID`, falls es mehrere Konten gibt.)
3. **Actions → „Website veröffentlichen“ → Run workflow**.
   Der Workflow lädt `worker/` zu Cloudflare hoch und trägt die Server-Adresse automatisch ins Spiel ein.
4. Danach haben Lobbys, PvP, Crew-Aufträge und Rangliste auch auf GitHub Pages funktioniert.

Den Token niemals in Dateien, Issues oder Chats schreiben – nur als Secret.

`index.html` über einen Webserver öffnen (z. B. `python3 -m http.server` und dann http://localhost:8000).
Funktioniert mit Maus/Tastatur und mit Touch (iPad/Handy).

## Inhalt
- Italien mit echter Form und Lage: Küsten, Alpen, Apennin, Ätna, Vesuv, Sizilien, Sardinien
- 18 Städte (Rom, Neapel, Mailand, Florenz, Venedig, Palermo, Bari, Genua, Turin …) mit Wahrzeichen
- Autobahnen zwischen den Städten inkl. Brücke über die Straße von Messina
- Waffenläden (Armeria), Autohäuser (Autosalone), Helikopterplätze (Eliporto) zum Spawnen von Helikoptern
- 22 Story-Missionen in 5 Kapiteln, Fahndungssystem mit Polizei, Verkehr, Passanten
- Bootsläden (Nautica) mit Hafen und Steg in 8 Küstenstädten – gekaufte Boote liegen automatisch im Hafen
- Tauchen mit Sauerstoffanzeige, 14 Schiffswracks mit Schatztruhen auf dem Meeresgrund
- Militärbasis auf Sardinien (Sperrgebiet) mit Soldaten, Panzern, Militärjeeps und Kampfhubschrauber
- 15 Autos (Kleinwagen, Lieferwagen, Kombi, Pickup, Oldtimer, Cabrio, Sportwagen, Supersportwagen …)
- Ego-Sicht oder normale Sicht (Taste V / Knopf SICHT / Menü)
- Karte mit Zoom, Verschieben und Wegpunkten (Taste M)
- Waffenrad (Kreis links / Tab) und Minigun
- 5-Sterne-Fahndung: Schießen in der Stadt bringt Sterne; ab 4 Sternen Polizeihubschrauber, ab 5 Sternen Armee mit Jeeps und Panzer
- Begehbare Innenräume: Waffenläden, Autohäuser, Bootsläden und Story-Orte (Werkstatt, Büro, Galerie, Bank, Villa, Casino)
- Story startet am Flughafen von Neapel mit eigenem Hangar: Propellerflugzeug, Kunstflugzeug, Wasserflugzeug, Privatjet; Kampfjet auf der Militärbasis
- Charakterwechsel zwischen Jack, Marco und Sofia, automatisches Speichern

## Anmeldung
Beim Start meldet man sich mit Spielername und Passwort an (oder erstellt ein Konto). Das Passwort wird nur als PBKDF2-Hash im privaten Bereich des eigenen Claude-Kontos gespeichert, ohne claude.ai lokal im Browser. Jedes Konto hat eigene Spielstände; der Spielername erscheint online und in der Rangliste.

## Online-Modus
- Öffentliche Lobby oder private Lobby mit Code (über claude.ai, angemeldet)
- Andere Spieler mit Namensschild, gegenseitiges Abschießen (Passivmodus abschaltbar), gemeinsame Crew-Aufträge
- Rangliste (Abschüsse, Geld, Aufträge), mehr Häuser (Vororte und Dörfer)
- Mitspieler brauchen das geteilte Spiel mit der Rolle „Mitwirkende“, damit Treffer, Aufträge und Ranglisten-Einträge zählen

## Admin (GitHub-Pages-Version mit Online-Server)
- Der Spieler **Crim Hotdog24** ist Haupt-Admin (kann nicht entfernt oder gebannt werden).
- Admin-Panel (Startbildschirm oder Menü): Spielern (oder sich selbst) Geld schenken, Admin geben/entfernen, bannen/entbannen.
- Flugmodus mit einstellbarem Tempo (bis über 2000 km/h) und die begehbare **Flug-Yacht Imperatore** (64 m, mit Deck, Pool und Kommandobrücke).
- Konten liegen auf dem Server: Spielernamen sind eindeutig, Passwörter nur als Hash gespeichert.

## Skins
Kleiderschrank im Menü mit 40 Skins (Typ im Anzug, FIB-Mitarbeiter, maskierter Verbrecher, Mafia-Boss, Ninja, Astronaut, König, …). Viele gratis, andere für Spielgeld, ein Admin-Skin nur für Admins. Online sehen alle anderen Spieler deinen Skin.

## Upgrades
Im Menü unter „Upgrades“ unendlich oft kaufbar: Geld-Multiplikator, Lebensenergie, Waffenschaden, Lauftempo, Panzerung.
Besiegte Figuren lassen Geld fallen.

## Cheat-Codes
Es gibt geheime Cheat-Codes (Knopf-Kombinationen). Admins sehen die Liste im Menü.

## Steuerung (Tastatur)
WASD laufen/fahren · Maus Kamera · Linksklick schießen · Rechtsklick zielen · Shift sprinten/Heli runter ·
Leertaste springen/Handbremse/Heli hoch · F ein-/aussteigen · E Shop/Mission · Q/1–6 Waffe · M Karte · C Charakter · V Sicht · Shift im Wasser abtauchen · Tab Waffenrad · Esc Menü

Flugzeug: Leertaste mehr Gas · Shift weniger Gas · W/S Nase hoch/runter · A/D Kurve
