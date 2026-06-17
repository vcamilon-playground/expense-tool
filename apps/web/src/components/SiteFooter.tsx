'use client';

import { useState } from 'react';
import FormModal from './FormModal';

const CONTACT_EMAIL = 'camilonvegil@gmail.com';
const CONTACT_PHONE = '+639178020429';

export default function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const year = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <>
      <footer className="site-footer">
        <button type="button" className="footer-link" onClick={() => setAboutOpen(true)}>
          About
        </button>
        <span className="footer-sep" aria-hidden="true">·</span>
        <button type="button" className="footer-link" onClick={() => setContactOpen(true)}>
          Contact
        </button>
        <span className="footer-sep" aria-hidden="true">·</span>
        <span>© {year} Vegil Camilon</span>
      </footer>

      <FormModal open={aboutOpen} title="About Expense Tool" onClose={() => setAboutOpen(false)}>
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
          A personal, multi-user expense tracker. Record expenses, set budgets, track recurring
          charges and income sources, and review your spending through reports and charts.
          Installable as a PWA and built with Next.js and Supabase.
        </p>
        <p style={{ marginBottom: 0, color: 'var(--text)' }}>
          Created by Vegil Camilon &amp; Claude Code
        </p>
        {version && <p className="footer-version" style={{ marginTop: 4, marginBottom: 0 }}>v{version}</p>}
      </FormModal>

      <FormModal open={contactOpen} title="Contact" onClose={() => setContactOpen(false)}>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
          Questions or feedback? Reach out anytime.
        </p>
        <p style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true">📧</span>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true">📱</span>
          <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>
        </p>
      </FormModal>
    </>
  );
}
