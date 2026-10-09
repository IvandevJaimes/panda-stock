import { useEffect, useRef } from "react";
import {
  onAlertCreated,
  type StockAlertHistoryType,
  classifyAlert,
} from "../../../stores/stockAlertHistoryStore";

const SOUND_FILES: Record<StockAlertHistoryType, string> = {
  expired: "stock_expired.mp3",
  "out-of-stock": "stock_out.mp3",
  "near-expiry": "stock_near_expiry.mp3",
  "low-stock": "stock_low.mp3",
};

/**
 * Jerarquía de prioridad por gravedad:
 * Las alertas rojas (críticas) están en el nivel superior y tienen
 * prioridad absoluta sobre las ámbar (revisión).
 *
 * 4: expired (roja / crítica)
 * 3: out-of-stock (roja / crítica)
 * 2: near-expiry (ámbar / revisión)
 * 1: low-stock (ámbar / revisión)
 */
const ALERT_PRIORITY: Record<StockAlertHistoryType, number> = {
  expired: 4,
  "out-of-stock": 3,
  "near-expiry": 2,
  "low-stock": 1,
};

function getSoundUrl(type: StockAlertHistoryType): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}/sounds/${SOUND_FILES[type]}`;
}

const BATCH_WINDOW_MS = 60;
const SUPPRESSION_WINDOW_MS = 2500;

/**
 * Componente que reproduce sonidos de alerta ante eventos del store,
 * aplicando prioridad estricta por gravedad:
 * - Si hay alertas críticas (rojas), su sonido suena por encima de todo.
 * - Los sonidos de menor gravedad (ámbar) no se reproducen si hay una alerta roja
 *   en el mismo lote o si recientemente sonó una crítica.
 * - Una alerta roja interrumpe inmediatamente cualquier sonido ámbar en curso.
 */
export function StockAlertSound() {
  const pendingBatchRef = useRef<StockAlertHistoryType[]>([]);
  const batchTimerRef = useRef<number | null>(null);
  const activePriorityRef = useRef<number>(0);
  const activeIsPlayingRef = useRef<boolean>(false);
  const lastCriticalPlayTimeRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const processBatch = () => {
      const types = pendingBatchRef.current;
      pendingBatchRef.current = [];
      if (types.length === 0) return;

      // Determinar la alerta de mayor gravedad en el lote recibido
      let highestType: StockAlertHistoryType = types[0];
      let highestPriority = ALERT_PRIORITY[highestType];

      for (const type of types) {
        const priority = ALERT_PRIORITY[type];
        if (priority > highestPriority) {
          highestPriority = priority;
          highestType = type;
        }
      }

      const isCritical = classifyAlert(highestType) === "critical";
      const now = Date.now();

      // Si la alerta seleccionada es ámbar y recientemente sonó una roja,
      // la descartamos para no reproducir sonidos de menor gravedad.
      if (
        !isCritical &&
        now - lastCriticalPlayTimeRef.current < SUPPRESSION_WINDOW_MS
      ) {
        return;
      }

      // Si hay un audio actualmente reproduciéndose:
      if (activeIsPlayingRef.current && currentAudioRef.current) {
        // Si el sonido activo tiene mayor o igual prioridad, no lo interrumpimos
        if (activePriorityRef.current >= highestPriority) {
          return;
        }
        // Si el nuevo sonido tiene mayor prioridad (ej: roja interrumpiendo a ámbar),
        // detenemos el audio en curso inmediatamente.
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      if (isCritical) {
        lastCriticalPlayTimeRef.current = now;
      }

      activePriorityRef.current = highestPriority;
      activeIsPlayingRef.current = true;

      const url = getSoundUrl(highestType);
      try {
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onended = () => {
          activeIsPlayingRef.current = false;
          activePriorityRef.current = 0;
        };

        audio.onerror = () => {
          activeIsPlayingRef.current = false;
          activePriorityRef.current = 0;
        };

        audio.play().catch((err) => {
          activeIsPlayingRef.current = false;
          activePriorityRef.current = 0;
          console.warn("No se pudo reproducir audio de alerta:", err);
        });
      } catch (err) {
        activeIsPlayingRef.current = false;
        activePriorityRef.current = 0;
        console.warn("Error creando audio de alerta:", err);
      }
    };

    const unsubscribe = onAlertCreated((entry) => {
      pendingBatchRef.current.push(entry.type);

      // Si ya hay una alerta roja en el lote acumulado y la que llega es ámbar,
      // la roja ya tiene garantizada la prioridad.
      if (batchTimerRef.current === null) {
        batchTimerRef.current = window.setTimeout(() => {
          batchTimerRef.current = null;
          processBatch();
        }, BATCH_WINDOW_MS);
      }
    });

    return () => {
      unsubscribe();
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  return null;
}
