import React from 'react';

export default function WhatsAppContact() {
  return <div className="pl-contact-widget">
    <a
      className="pl-whatsapp-float"
      href="https://wa.me/250788950833"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with me on WhatsApp"
      title="Chat with me on WhatsApp"
    >
      <i className="fa-brands fa-whatsapp" aria-hidden="true" />
    </a>
    <span className="pl-widget-credit">Powered By <a href="https://my-digital-status.onrender.com/" target="_blank" rel="noreferrer">KadeTech</a></span>
  </div>;
}
