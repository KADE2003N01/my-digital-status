import React, { useEffect, useRef, useState } from 'react';

export default function ExpandableCell({ children, className = '', buttonClassName = '' }) {
  const contentRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || expanded) return undefined;
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, expanded]);

  return <span className={`expandable-cell${expanded ? ' is-expanded' : ''}${className ? ` ${className}` : ''}`}>
    <span ref={contentRef} className="expandable-cell-content">{children}</span>
    {overflows && <button type="button" className={`expandable-cell-toggle${buttonClassName ? ` ${buttonClassName}` : ''}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide' : 'Read more'}</button>}
  </span>;
}
