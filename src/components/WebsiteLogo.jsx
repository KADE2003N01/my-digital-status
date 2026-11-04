import React from 'react';

/** Shared text wordmark for FolioSpace headers. */
export default function WebsiteLogo({ href = '/', className = '' }) {
  return <a className={`website-logo ${className}`.trim()} href={href} aria-label="FolioSpace home">
    <span className="website-logo-name"><span>Folio</span><span>Space</span></span>
    <span className="website-logo-tagline">Your Work. Your Space. Your Future.</span>
  </a>;
}
