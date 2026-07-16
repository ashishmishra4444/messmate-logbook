import { useCallback, useEffect, useRef } from 'react';

export function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize lazily to respect browser autoplay policies
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, volume = 0.5) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playSuccess = useCallback(() => {
    playTone(880, 'sine', 0.1, 0.5); // A5
    setTimeout(() => playTone(1108.73, 'sine', 0.2, 0.5), 100); // C#6
  }, [playTone]);

  const playError = useCallback(() => {
    playTone(250, 'square', 0.3, 0.3); // Deep buzz
    setTimeout(() => playTone(200, 'square', 0.4, 0.3), 150); // Lower buzz
  }, [playTone]);

  const playChime = useCallback(() => {
    playTone(523.25, 'triangle', 0.4, 0.3); // C5
  }, [playTone]);

  return { playSuccess, playError, playChime };
}
