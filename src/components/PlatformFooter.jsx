import React from 'react';

export default function PlatformFooter() {
  return <footer className="pl-footer">
    <div className="pl-footer-inner">
      <div className="pl-footer-grid">
        <div className="pl-footer-column pl-footer-column-side">
          <h3>Services</h3>
          <ul className="pl-footer-links">
            <li><a href="/platform/templates">Portfolio setup</a></li>
            <li><a href="/platform/login">Account access</a></li>
            <li><a href="/platform/signup?template=standard">Business portfolio</a></li>
          </ul>
        </div>
        <div className="pl-footer-column pl-footer-column-center">
          <h3>Connect</h3>
          <div className="pl-footer-connect">
            <div className="pl-socials">
              <a className="pl-social" href="https://wa.me/250788950833" target="_blank" rel="noreferrer" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp" /></a>
              <a className="pl-social" href="https://x.com" target="_blank" rel="noreferrer" aria-label="Twitter"><i className="fa-brands fa-x-twitter" /></a>
              <a className="pl-social" href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in" /></a>
              <a className="pl-social" href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fa-brands fa-facebook-f" /></a>
              <a className="pl-social" href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fa-brands fa-instagram" /></a>
            </div>
            <ul className="pl-contact-list">
              <li><a href="mailto:kadecomputerscience@gmail.com"><span className="mail-icon"><i className="fa-solid fa-envelope" /></span>kadecomputerscience@gmail.com</a></li>
              <li><a href="tel:+250788950833"><span className="phone-icon"><i className="fa-solid fa-phone" /></span>+250 788 950 833</a></li>
            </ul>
          </div>
        </div>
        <div className="pl-footer-column pl-footer-column-side">
          <h3>Support</h3>
          <ul className="pl-footer-links">
            <li><a href="/platform/templates">Get started</a></li>
          <li><a href="/platform/help">FAQs &amp; Documentation</a></li>
          <li><a href="/platform/system-issues">System Based Issues</a></li>
          </ul>
        </div>
      </div>
      <div className="pl-footer-bottom">
        <span>© {new Date().getFullYear()} FolioSpace. All rights reserved.</span>
      </div>
    </div>
  </footer>;
}
