# AURA iOS — Integrationsplan

## Ziel
Native iPhone-App (SwiftUI) als langfristiger Ersatz für die GitHub-Pages-Web-App. Bestehendes JARVIS-Design, deutsche Sprachinteraktion und die bestehende Aura-API bleiben zunächst erhalten. Keine privaten Berechtigungen beim ersten Start anfordern.

## Gewählte Anforderungen
- Plattform: iPhone, Zielvertrieb App Store; zuerst lokaler Build/Test, danach TestFlight.
- E-Mail: mehrere Anbieter (iCloud Mail, Gmail, Outlook).
- WhatsApp: privates Konto; keine inoffizielle Auslese privater Chats.
- Kalender, Kontakte und Erinnerungen: native iOS-APIs mit minimalen Berechtigungen.
- Sprache: deutsche weibliche Stimme; Spracherkennung und Sprachausgabe getrennt testen.

## Architektur
1. **SwiftUI-App**: Oberfläche, Reaktor-Animation, Chat, Sprachstatus und Einstellungen.
2. **Permission Center**: einzelne Schalter für Kontakte, Kalender und Erinnerungen; Status und Widerruf erklären. Erst bei einer konkreten Aktion nach Berechtigung fragen.
3. **Apple Frameworks**:
   - Contacts framework: Kontakte suchen; standardmäßig nur gezielte Suche bzw. eingeschränkten Zugriff bevorzugen.
   - EventKit: Kalenderereignisse und Erinnerungen lesen/schreiben; nur benötigte Berechtigungen anfordern.
   - App Intents / Shortcuts: Aura-Aktionen über Siri und Kurzbefehle anbieten.
4. **Mail-Adapter**: getrennte OAuth-Verbindungen für Gmail und Microsoft; iCloud-Mail nur über eine unterstützte, sichere Provider-Anbindung. Tokens im iOS Keychain; keine Mail-Passwörter speichern.
5. **WhatsApp privat**: keine API zum freien Lesen persönlicher Chatverläufe. V1 bietet Teilen-Menü/Share Sheet und öffnet WhatsApp mit vorbereitetem Text, soweit iOS/WhatsApp dies zulassen. Nutzer prüft und sendet selbst. Keine Automatisierung der privaten App-Oberfläche.
6. **Backend**: Aura-KI-Aufrufe über den Worker. Provider-Tokens nicht im Frontend oder Git-Repository speichern. Nur notwendige Daten an KI-Dienste senden und vorher transparent anzeigen.

## Sicherheitsregeln
- Least privilege: Berechtigungen erst im passenden Nutzungsmoment erfragen.
- Jede Integration einzeln aktivierbar und jederzeit widerrufbar.
- Versand, Terminänderung und Löschung benötigen eine ausdrückliche Bestätigung.
- OAuth mit minimalen Scopes; Tokens im Keychain bzw. sicherem Backend-Speicher.
- Keine Kontaktlisten, Mailboxen oder Chatverläufe pauschal hochladen.
- Datenschutzerklärung, Datenfluss-/Löschkonzept und App-Store-Datenschutzangaben vor Einreichung erstellen.
- Keine Zugangsdaten oder privaten Inhalte in Logs.

## Umsetzungsreihenfolge
### Schritt 1 — iOS-Grundgerüst
- Neues Xcode-Projekt „Aura“ mit SwiftUI, Bundle ID, Deployment Target und App-Icon.
- Reaktor-/Galaxy-Startbildschirm, Chat-Ansicht, Einstellungen und Permission Center.
- Bestehenden Worker über eine typisierte API-Schicht anbinden; keine API-Schlüssel im App-Bundle.
- Fehlerzustände und Audio-Wiedergabe/Spracherkennung getrennt testen.

### Schritt 2 — Apple-Daten
- Kontakte: gezielte Suche.
- Kalender: Tagesübersicht und Termin anlegen/ändern nach Bestätigung.
- Erinnerungen: Aufgaben erstellen und abhaken.

### Schritt 3 — Mail
- Zuerst einen Provider als Pilot (Gmail oder Outlook), dann weitere Provider.
- Nur Leseberechtigung zuerst; Senden erst nach expliziter Freigabe und Bestätigung.
- iCloud-Anbindung separat prüfen; keine iCloud-Passwörter in Aura eingeben.

### Schritt 4 — WhatsApp
- Share Sheet / URL-Schema zum Öffnen und Vorbereiten einer Nachricht testen.
- Nutzer wählt Empfänger und bestätigt den Versand in WhatsApp.
- Kein Zugriff auf private Chat-Historie versprechen.

### Schritt 5 — TestFlight und App Store
- Datenschutztexte, Zweckbeschreibungen, Datenlöschung, Supportseite, Screenshots und Review Notes.
- Geräte-/Sprachtests, Berechtigungstests und Sicherheitsprüfung.
- TestFlight-Beta, anschließend App-Store-Einreichung.

## Voraussetzungen und Grenzen
- Xcode und ein Mac werden für das Bauen, Signieren und Einreichen der nativen iOS-App benötigt. Ein kostenloser Apple-Account reicht für lokale Tests auf eigenen Geräten; App-Store-Vertrieb erfordert die kostenpflichtige Apple-Developer-Program-Mitgliedschaft (Preis wird von Apple regional angezeigt).
- App-Store-Freigabe ist eine Apple-Entscheidung und kann nicht garantiert werden.
- Private WhatsApp-Chats sind nicht über eine allgemeine iOS-API für Aura verfügbar.
- Bestehende Web-App bleibt während der nativen Entwicklung als getrennte, funktionierende Übergangsversion erhalten.
