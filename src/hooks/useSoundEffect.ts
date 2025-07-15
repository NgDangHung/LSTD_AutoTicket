import { useState, useCallback, useRef, useEffect } from 'react';
import { AUDIO_FILES } from '@/libs/constants';

export interface SoundEffectOptions {
  volume?: number;
  loop?: boolean;
  preload?: boolean;
}

export const useSoundEffect = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check if audio is supported
    if (typeof window !== 'undefined' && window.Audio) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError('Audio is not supported in this browser');
    }
  }, []);

  const loadAudio = useCallback(async (src: string, options: SoundEffectOptions = {}): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (audioCache.current.has(src)) {
        const cachedAudio = audioCache.current.get(src)!;
        resolve(cachedAudio);
        return;
      }

      const audio = new Audio();
      audio.volume = options.volume ?? 1.0;
      audio.loop = options.loop ?? false;
      
      if (options.preload) {
        audio.preload = 'auto';
      }

      audio.oncanplaythrough = () => {
        audioCache.current.set(src, audio);
        resolve(audio);
      };

      audio.onerror = () => {
        reject(new Error(`Failed to load audio: ${src}`));
      };

      audio.src = src;
    });
  }, []);

  const playSound = useCallback(async (src: string, options: SoundEffectOptions = {}): Promise<void> => {
    if (!isSupported) {
      console.warn('Audio is not supported');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const audio = await loadAudio(src, options);
      
      // Stop current audio if playing
      if (currentAudio.current && !currentAudio.current.paused) {
        currentAudio.current.pause();
        currentAudio.current.currentTime = 0;
      }

      // Reset audio to beginning
      audio.currentTime = 0;
      
      currentAudio.current = audio;
      await audio.play();
      
    } catch (err: any) {
      setError(err.message);
      console.error('Sound effect error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, loadAudio]);

  const stopSound = useCallback(() => {
    if (currentAudio.current && !currentAudio.current.paused) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
    }
  }, []);

  const pauseSound = useCallback(() => {
    if (currentAudio.current && !currentAudio.current.paused) {
      currentAudio.current.pause();
    }
  }, []);

  const resumeSound = useCallback(() => {
    if (currentAudio.current && currentAudio.current.paused) {
      currentAudio.current.play().catch(err => {
        setError(err.message);
      });
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (currentAudio.current) {
      currentAudio.current.volume = clampedVolume;
    }
    
    // Update volume for all cached audio
    audioCache.current.forEach(audio => {
      audio.volume = clampedVolume;
    });
  }, []);

  const preloadSounds = useCallback(async (soundSources: string[]) => {
    const promises = soundSources.map(src => 
      loadAudio(src, { preload: true }).catch(err => {
        console.warn(`Failed to preload sound: ${src}`, err);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }, [loadAudio]);

  // Predefined sound effects for the queue system
  const playNotification = useCallback(() => {
    return playSound(AUDIO_FILES.NOTIFICATION);
  }, [playSound]);

  const playCallNumber = useCallback(() => {
    return playSound(AUDIO_FILES.CALL_NUMBER);
  }, [playSound]);

  const playSuccess = useCallback(() => {
    return playSound(AUDIO_FILES.SUCCESS);
  }, [playSound]);

  const playError = useCallback(() => {
    return playSound(AUDIO_FILES.ERROR);
  }, [playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop current audio
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
      
      // Clear cache
      audioCache.current.clear();
    };
  }, []);

  // Preload common sounds on mount
  useEffect(() => {
    if (isSupported) {
      const commonSounds = [
        AUDIO_FILES.NOTIFICATION,
        AUDIO_FILES.CALL_NUMBER,
        AUDIO_FILES.SUCCESS,
        AUDIO_FILES.ERROR,
      ];
      
      preloadSounds(commonSounds);
    }
  }, [isSupported, preloadSounds]);

  return {
    isSupported,
    isLoading,
    error,
    playSound,
    stopSound,
    pauseSound,
    resumeSound,
    setVolume,
    preloadSounds,
    // Predefined sounds
    playNotification,
    playCallNumber,
    playSuccess,
    playError,
  };
};
