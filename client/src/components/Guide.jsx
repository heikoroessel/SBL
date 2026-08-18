import { useState } from 'react';
import { api } from '../lib/api.js';

const SECTIONS = [
  {
    id: 'einstieg',
    label: 'Einstieg',
    title: 'Worum geht es hier?',
    body: (
      <>
        <p>
          Der Systemische Kompass begleitet dich durch ein Programm aus mehreren Modulen. Zu jedem
          freigeschalteten Modul bearbeitest du Reflexionsfragen zu deinem Unternehmen — Schritt für
          Schritt entsteht daraus deine eigene <strong>Systemische Business Landkarte</strong>: eine
          Übersicht, die zeigt, wie dein Unternehmen aus unterschiedlichen Perspektiven funktioniert.
        </p>
      </>
    ),
  },
  {
    id: 'zugang',
    label: 'Rollen & Zugang',
    title: 'Wer hat Zugriff?',
    body: (
      <>
        <p>
          Dein Administrator legt für deine Organisation einen Zugang an — dafür braucht er deine
          E-Mail-Adresse. Danach vergibst du dir selbst ein Passwort und kannst dich anmelden.
        </p>
        <p className="mt-8">
          Mehrere Personen können Zugriff auf dieselbe Organisation bekommen — auch Kolleginnen und
          Kollegen, die nicht selbst am Programm teilnehmen, aber bei der Reflexion mitdiskutieren
          sollen. Alle mit Zugang sehen dieselbe Landkarte und können gemeinsam daran arbeiten.
        </p>
      </>
    ),
  },
  {
    id: 'hausaufgaben',
    label: 'Hausaufgaben',
    title: 'Wie fülle ich ein Modul aus?',
    body: (
      <>
        <p>
          Unter „Hausaufgaben" siehst du die Module, die dein Administrator freigegeben hat. Jedes
          Modul hat Pflichtfelder (die solltest du ausfüllen) und Wahlfelder (Fleißaufgaben, die
          zusätzliche Perspektiven eröffnen). Klick auf eine Kachel, um sie zu bearbeiten.
        </p>
      </>
    ),
  },
  {
    id: 'postit',
    label: 'Postit ausfüllen',
    title: 'Was passiert in einem Postit?',
    body: (
      <>
        <p>
          Jedes Postit hat eine feste Reflexionsfrage. Du trägst deine Antwort ein, gibst dem Postit
          einen sprechenden Titel und beschreibst, was du in deiner Organisation erreichen möchtest.
        </p>
        <p className="mt-8">
          <strong>Wichtig:</strong> Das Postit gilt bereits als erledigt, sobald du diese Felder
          ausgefüllt und gespeichert hast. Darunter kannst du optional konkrete <strong>Aufgaben</strong>{' '}
          anlegen — das ist eine Empfehlung, damit du dranbleibst und dein Vorhaben wirklich umsetzt,
          aber keine Voraussetzung, damit das Postit als erledigt zählt.
        </p>
      </>
    ),
  },
  {
    id: 'landkarte',
    label: 'Landkarte',
    title: 'Wie liest man die Landkarte?',
    body: (
      <>
        <p>
          Auf der Landkarte sammeln sich deine Postits nach den neun klassischen Feldern eines
          Geschäftsmodells. Die Farbe eines Postits zeigt, aus welcher Perspektive es entstanden ist —
          eine Legende mit Erklärung findest du direkt über der Landkarte.
        </p>
        <p className="mt-8">
          Ein kleiner Punkt am Postit zeigt den Status: grün = erledigt, grau = offen (es gibt noch
          unerledigte Aufgaben dazu), rot = überfällig. Über die Legende kannst du außerdem nach
          Perspektive filtern, um gezielt eine Ebene zu betrachten.
        </p>
      </>
    ),
  },
  {
    id: 'aufgaben',
    label: 'Aufgaben',
    title: 'Wie funktioniert die Aufgabenliste?',
    body: (
      <>
        <p>
          Alle Aufgaben, die du aus deinen Postits abgeleitet hast, findest du gesammelt unter
          „Aufgaben". Du kannst zwischen „nur meine Aufgaben" und allen Aufgaben deiner Organisation
          umschalten und dir die Liste als CSV-Datei exportieren.
        </p>
      </>
    ),
  },
  {
    id: 'fortschritt',
    label: 'Fortschritt',
    title: 'Was bedeuten die Punkte?',
    body: (
      <>
        <p>
          Für das Ausfüllen von Postits und das Abschließen von Aufgaben sammelst du Punkte — du
          siehst deinen aktuellen Stand oben in der Kopfzeile. Über das ⓘ neben deinem Punktekonto
          erfährst du genau, wofür es wie viele Punkte gibt.
        </p>
        <p className="mt-8">
          Unter „Fortschritt" siehst du außerdem, wie deine Organisation im Vergleich zu den anderen
          in deiner Lerngruppe steht, und eine Pinnwand mit geteilten Erfolgsgeschichten.
        </p>
      </>
    ),
  },
];

export default function Guide({ onClose }) {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  async function handleClose() {
    if (dontShowAgain) {
      try {
        await api.patch('/org/guide-status', { dismissed: true });
      } catch {
        // Nicht kritisch — im Zweifel erscheint der Guide beim nächsten Login einfach nochmal.
      }
    }
    onClose();
  }

  const section = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card guide-card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="modal-close" onClick={handleClose}>×</button>
        <div className="modal-title">Kurze Einführung</div>
        <p className="small muted mt-8">So funktioniert der Systemische Kompass.</p>

        <div className="guide-nav mt-16">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`guide-nav-item${s.id === activeSection ? ' active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="guide-content mt-16">
          <h3 style={{ fontSize: 17, marginBottom: 10 }}>{section.title}</h3>
          <div className="small" style={{ lineHeight: 1.65 }}>{section.body}</div>
        </div>

        <label className="styled-checkbox mt-24">
          <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
          <span className="styled-checkbox-text">
            Nicht mehr automatisch anzeigen — du findest diese Einführung jederzeit wieder über das
            „?"-Symbol in der Navigation.
          </span>
        </label>

        <button className="btn btn-primary mt-16" onClick={handleClose}>Schließen</button>
      </div>
    </div>
  );
}
