import { useEffect, useRef } from "react";
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
 * Componente que reproduce sonidos de alerta ante eventos del store.
 * Se monta una sola vez en App.tsx sin renderizar elementos DOM.
 */
export function StockAlertSound() {
  const lastPlayTime = useRef(0);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAlertCreated((entry) => {
      const now = Date.now();
      if (now - lastPlayTime.current < INTERVALO_MINIMO_MS) {
        return;
      }
      lastPlayTime.current = now;

      const url = getSoundUrl(entry.type);
      try {
        if (currentAudio.current) {
          currentAudio.current.pause();
          currentAudio.current.currentTime = 0;
        }
        const audio = new Audio(url);
        currentAudio.current = audio;
        audio.play().catch((err) => {
          // Si el navegador requiere interacción previa del usuario
          console.warn("No se pudo reproducir audio de alerta:", err);
        });
      } catch (err) {
        console.warn("Error creando audio de alerta:", err);
      }
    });

    return () => {
      unsubscribe();
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
    };
  }, []);

  return null;
}
