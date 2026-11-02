import React, { useState } from 'react';

const reactions = [
  '\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F64F}', '\u{1F622}', '\u{1F621}', '\u{1F389}',
  '\u{1F525}', '\u{1F44F}', '\u{1F440}', '\u2705', '\u{1F970}', '\u{1F60D}', '\u{1F618}', '\u{1F60A}',
  '\u{1F601}', '\u{1F923}', '\u{1F914}', '\u{1F917}', '\u{1F973}', '\u{1F60E}', '\u{1F62D}', '\u{1F634}',
  '\u{1F92F}', '\u{1F631}', '\u{1F64C}', '\u{1FAF6}', '\u{1F91D}', '\u{1F4AF}', '\u2728', '\u{1F490}',
  '\u{1F339}', '\u{1F494}', '\u{1F4AA}', '\u{1F44C}', '\u270C\uFE0F', '\u{1F91E}', '\u{1F44B}', '\u{1F926}',
  '\u{1F937}', '\u{1F4A1}', '\u2615', '\u{1F382}', '\u{1F381}', '\u{1F680}', '\u{1F308}', '\u2B50',
  '\u2600\uFE0F', '\u{1F431}', '\u{1F436}', '\u{1F340}', '\u{1F355}', '\u26BD', '\u{1F3C6}', '\u{1F483}', '\u{1F57A}'
];

export default function MessageReactionPicker({ onSelect }) {
  const [showMore, setShowMore] = useState(false);
  const visibleReactions = showMore ? reactions : reactions.slice(0, 4);

  return <div className={showMore ? 'message-reaction-picker is-expanded' : 'message-reaction-picker'} role="group" aria-label="Add reaction">
    {visibleReactions.map((emoji) => <button key={emoji} type="button" role="menuitem" aria-label={'React with ' + emoji} onClick={(event) => onSelect(emoji, event)}>{emoji}</button>)}
    <button type="button" className="message-reaction-more" aria-expanded={showMore} aria-label={showMore ? 'Back to common reactions' : 'Show more reactions'} onClick={() => setShowMore((current) => !current)}><i className={showMore ? 'fas fa-arrow-left' : 'fas fa-plus'} aria-hidden="true" /></button>
  </div>;
}
