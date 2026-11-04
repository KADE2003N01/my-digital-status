import React, { useState } from 'react';

export const messageReactions = [
  { emoji: '\u{1F44D}', label: 'Like', icon: 'fas fa-thumbs-up' },
  { emoji: '\u2764\uFE0F', label: 'Love', icon: 'fas fa-heart' },
  { emoji: '\u{1F602}', label: 'Laugh', icon: 'far fa-face-laugh' },
  { emoji: '\u{1F62E}', label: 'Surprised', icon: 'far fa-face-surprise' },
  { emoji: '\u{1F64F}', label: 'Thanks', icon: 'fas fa-hands-praying' },
  { emoji: '\u{1F622}', label: 'Sad', icon: 'far fa-face-sad-tear' },
  { emoji: '\u{1F621}', label: 'Angry', icon: 'far fa-face-angry' },
  { emoji: '\u{1F389}', label: 'Celebrate', icon: 'fas fa-star' },
  { emoji: '\u{1F525}', label: 'Fire', icon: 'fas fa-fire' },
  { emoji: '\u{1F44F}', label: 'Applause', icon: 'fas fa-hands-clapping' },
  { emoji: '\u{1F440}', label: 'Eyes', icon: 'fas fa-eye' },
  { emoji: '\u2705', label: 'Done', icon: 'fas fa-circle-check' }
];

export function getReactionDisplay(emoji) {
  return messageReactions.find((reaction) => reaction.emoji === emoji)
    || { label: 'Reaction', icon: 'fas fa-face-smile' };
}

export default function MessageReactionPicker({ onSelect }) {
  const [showMore, setShowMore] = useState(false);
  const visibleReactions = showMore ? messageReactions : messageReactions.slice(0, 4);

  return <div className={showMore ? 'message-reaction-picker is-expanded' : 'message-reaction-picker'} role="group" aria-label="Add reaction">
    {visibleReactions.map((reaction) => <button key={reaction.emoji} type="button" role="menuitem" aria-label={`React with ${reaction.label}`} onClick={(event) => onSelect(reaction.emoji, event)}><i className={reaction.icon} aria-hidden="true" /></button>)}
    <button type="button" className="message-reaction-more" aria-expanded={showMore} aria-label={showMore ? 'Show fewer reactions' : 'Show more reactions'} onClick={() => setShowMore((current) => !current)}><i className={showMore ? 'fas fa-arrow-left' : 'fas fa-plus'} aria-hidden="true" /></button>
  </div>;
}
