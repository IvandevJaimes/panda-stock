import { useEffect, useState, useRef } from "react";
import Sound from "react-sound";
import {
  onAlertCreated,
  type StockAlertHistoryType,
} from "../../../stores/stockAlertHistoryStore";

const SOUND_FILES: Record<StockAlertHistoryType, string> = {
  "low-stock": "stock_low.mp3",
  "out-of-stock": "stock_out.mp3",
  expired: "stock_expired.mp3",
  "near-expiry": "stock_near_expiry.mp3",
};

function getSoundUrl(type: StockAlertHistoryType): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}/sounds/${SOUND_FILES[type]}`;
}

const INTERVALO_MINIMO_MS = 1000;

/**
 * Componente que reproduce sonidos de alerta usando react-sound.
 * Se monta una sola vez en App.tsx.
 */
export function StockAlertSound() {
  const [currentSound, setCurrentSound] = useState<{
    url: string;
    id: number;
  } | null>(null);
  const lastPlayTime = useRef(0);
  const soundIdRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onAlertCreated((entry) => {
      const now = Date.now();
      if (now - lastPlayTime.current < INTERVALO_MINIMO_MS) {
        return;
      }
      lastPlayTime.current = now;

      const url = getSoundUrl(entry.type);
      if (url) {
        soundIdRef.current += 1;
        setCurrentSound({ url, id: soundIdRef.current });
      }
    });

    return unsubscribe;
  }, []);

  if (!currentSound) return null;

  return (
    <Sound
      key={currentSound.id}
      url={currentSound.url}
      playStatus="PLAYING"
      onFinishedPlaying={() => setCurrentSound(null)}
      onError={(_code, description) => {
        console.warn("Error reproduciendo sonido de alerta:", description);
        setCurrentSound(null);
      }}
    />
  );
}
