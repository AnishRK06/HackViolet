import { useState, useCallback } from 'react';

export const useModal = (initialState = false) => {
  const [visible, setVisible] = useState(initialState);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible(v => !v), []);

  return { visible, open, close, toggle, setVisible };
};

export const useJoinAction = (onComplete, duration = 1500) => {
  const [joined, setJoined] = useState(false);
  const modal = useModal();

  const handleJoin = useCallback(() => {
    setJoined(true);
    setTimeout(() => {
      modal.close();
      setJoined(false);
      onComplete?.();
    }, duration);
  }, [modal, onComplete, duration]);

  return { joined, handleJoin, ...modal };
};
