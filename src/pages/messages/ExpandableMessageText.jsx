import React, { useLayoutEffect, useRef, useState } from 'react';
import './ExpandableMessageText.css';

export default function ExpandableMessageText({ children }) {
  const textRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;

    const measure = () => {
      if (expanded) {
        setIsLong(true);
        return;
      }
      setIsLong(element.scrollHeight > element.clientHeight + 1);
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children, expanded]);

  return <div className="chat-expandable-message">
    <p ref={textRef} className={`chat-expandable-message-text${expanded ? ' is-expanded' : ''}`}>{children}</p>
    {isLong && <button className="chat-expandable-message-toggle" type="button" onClick={() => setExpanded((value) => !value)}>
      {expanded ? 'Hide' : 'Read more'}
    </button>}
  </div>;
}
