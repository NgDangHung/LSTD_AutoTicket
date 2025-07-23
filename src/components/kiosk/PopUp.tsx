
import React, { useRef, useEffect } from 'react';

interface PopUpProps {
  url: string;
  open: boolean;
  timeoutMs?: number;
  onClose?: () => void;
}

const DEFAULT_TIMEOUT = 20000; // 20s

const PopUp: React.FC<PopUpProps> = ({ url, open, timeoutMs = DEFAULT_TIMEOUT, onClose }) => {
  const popupRef = useRef<Window | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open popup when 'open' becomes true, và polling phát hiện đóng popup thủ công
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (open && url) {
      // Nếu popupRef.current đã bị đóng thủ công, reset về null
      if (popupRef.current && popupRef.current.closed) {
        popupRef.current = null;
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = window.open(
        url,
        'popupChucNang',
        'width=1080,height=1920,top=0,left=0,toolbar=0,location=0,menubar=0,status=0,resizable=0,scrollbars=1'
      );
      startTimer();
      // Polling phát hiện đóng popup thủ công
      pollTimer = setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          popupRef.current = null;
          if (onClose) onClose();
          if (pollTimer) clearInterval(pollTimer);
        }
      }, 500);
    }
    // Cleanup on unmount
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url]);

  // Reset timer on user interaction
  useEffect(() => {
    if (!open) return;
    const resetTimer = () => {
      if (popupRef.current && !popupRef.current.closed) {
        startTimer();
      }
    };
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, resetTimer);
    });
    return () => {
      ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
        window.removeEventListener(evt, resetTimer);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function startTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
        if (onClose) onClose();
      }
    }, timeoutMs);
  }

  return null; // Headless
};

export default PopUp;
