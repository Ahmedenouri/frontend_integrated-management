import { useState } from 'react';

export const emitNotification = (type, message) => {
  if (!message) return;
  window.dispatchEvent(new CustomEvent('app-notification', {
    detail: { type, message },
  }));
};

export const useGlobalMessage = (type) => {
  const [message, setMessage] = useState('');

  const updateMessage = (nextMessage) => {
    setMessage(nextMessage);
    const messageType = /unable|impossible|error|failed|échec|erreur/i.test(String(nextMessage)) ? 'error' : type;
    emitNotification(messageType, nextMessage);
  };

  return [message, updateMessage];
};
