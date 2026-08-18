// Bitte die tatsächliche Website-URL hier eintragen, falls sie von diesem Platzhalter abweicht.
const WEBSITE_URL = 'https://www.heikoroessel.de';

export default function Footer() {
  return (
    <footer className="app-footer">
      <a href={WEBSITE_URL} target="_blank" rel="noreferrer" className="app-footer-link">
        Heiko Rössel — Systemische Unternehmensberatung
      </a>
    </footer>
  );
}
