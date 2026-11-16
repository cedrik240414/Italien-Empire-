# Italien Empire

Ein 3D-Open-World-Spiel im Browser, das in ganz Italien spielt – von den Alpen bis Sizilien.
Story: Jack Moretti, Marco Bellini und Sofia Romano steigen von kleinen Kriminellen zu den mächtigsten
Organisatoren Italiens auf und geraten zwischen La Corona, das FIB und eine geheime Verschwörung.

## Spielen
**Online spielen über GitHub Pages:** https://cedrik240414.github.io/Italien-Empire-/
(nachdem Pages wie unten eingeschaltet ist)

### GitHub Pages einschalten (einmalig)
1. Im Repository auf **Settings** → links **Pages**.
2. Bei **Build and deployment** → **Source**: „Deploy from a branch“.
3. Bei **Branch** den Branch mit dem Spiel wählen (z. B. `main` oder `claude/gallant-davinci-ykn0eh`) und Ordner **/ (root)** → **Save**.
4. Nach 1–2 Minuten ist das Spiel unter der Adresse oben erreichbar.

Hinweis: Auf GitHub Pages funktionieren Story, Shops, Fahrzeuge, Anmeldung (lokal im Browser gespeichert) und Cheats.
Online-Lobbys und die gemeinsame Rangliste brauchen einen Server und laufen nur in der claude.ai-Version.

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

## Cheat-Codes (Knöpfe schnell nacheinander)
E E ZIELEN SPRUNG RENNEN = Helikopter · ZIELEN ZIELEN E E SPRUNG = alle Waffen · WAFFE WAFFE E ZIELEN = Minigun ·
SPRUNG SPRUNG E RENNEN = Supersportwagen · RENNEN SPRUNG RENNEN SPRUNG E = Panzer · E ZIELEN E ZIELEN SPRUNG = Kampfjet ·
RENNEN RENNEN E E = Gesundheit · E SPRUNG E SPRUNG ZIELEN = Fahndung weg · ZIELEN SPRUNG ZIELEN SPRUNG RENNEN = 5 Sterne ·
SPRUNG ZIELEN RENNEN E SPRUNG = Geld. In der öffentlichen Lobby sind Cheats aus.

## Steuerung (Tastatur)
WASD laufen/fahren · Maus Kamera · Linksklick schießen · Rechtsklick zielen · Shift sprinten/Heli runter ·
Leertaste springen/Handbremse/Heli hoch · F ein-/aussteigen · E Shop/Mission · Q/1–6 Waffe · M Karte · C Charakter · V Sicht · Shift im Wasser abtauchen · Tab Waffenrad · Esc Menü

Flugzeug: Leertaste mehr Gas · Shift weniger Gas · W/S Nase hoch/runter · A/D Kurve
