import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Tipos ───────────────────────────────────────────────────

export type StockAlertHistoryType =
  | "low-stock"
  | "out-of-stock"
  | "expired"
  | "near-expiry";

export type StockAlertCategory = "critical" | "review";
export type StockAlertStatus = "active" | "resolved";

export interface StockAlertHistoryIngredient {
  id: number;
  name: string;
  remainingStock: number;
  unit: string;
  minimumStock: number;
  /** Fecha de vencimiento (solo para alertas de expiry) */
  expiryDate?: string;
}

export interface StockAlertHistoryEntry {
  id: string;
  type: StockAlertHistoryType;
  title: string;
  ingredients: StockAlertHistoryIngredient[];
  createdAt: string; // ISO 8601
  status: StockAlertStatus;
  resolvedAt?: string; // ISO 8601
}

// ─── Clasificación (única fuente de verdad) ──────────────────

/** Deriva la categoría de una alerta a partir de su type real. */
export function classifyAlert(type: StockAlertHistoryType): StockAlertCategory {
  switch (type) {
    case "out-of-stock":
    case "expired":
      return "critical";
    case "low-stock":
    case "near-expiry":
      return "review";
  }
}

interface StockAlertHistoryState {
  alerts: StockAlertHistoryEntry[];
  /** IDs de ingredientes ya notificados por tipo. Persiste aunque la alerta se descarte.
   *  Se limpia cuando el ingrediente abandona el estado (resolución). */
  notifiedCache: Record<StockAlertHistoryType, number[]>;
}

interface StockAlertHistoryActions {
  /** Registrar una nueva alerta (generada por una venta o por expiry detection) */
  addAlert: (
    type: StockAlertHistoryType,
    title: string,
    ingredients: StockAlertHistoryIngredient[],
  ) => void;
  /** Registrar una alerta solo si no existe una activa del mismo tipo con los mismos ingredientes. Retorna true si se creó. */
  addAlertIfNew: (
    type: StockAlertHistoryType,
    title: string,
    ingredients: StockAlertHistoryIngredient[],
  ) => boolean;
  /** Eliminar una alerta (descartar) */
  removeAlert: (id: string) => void;
  /** Limpiar todo el historial */
  clearAll: () => void;
  /** Resolver una alerta (condición ya no se cumple) */
  resolveAlert: (id: string) => void;
  /** Resolver múltiples alertas por sus IDs */
  resolveAlerts: (ids: string[]) => void;
  /** Marcar ingredientes como notificados para un tipo de alerta */
  addNotified: (type: StockAlertHistoryType, ingredientIds: number[]) => void;
  /** Limpiar cache: mantener solo los IDs que siguen en el estado */
  cleanupNotified: (type: StockAlertHistoryType, keepIds: number[]) => void;
}

// ─── Config ──────────────────────────────────────────────────

const MAX_ALERTS = 300;

// ─── Helpers ─────────────────────────────────────────────────

let counter = 0;

function generateId(): string {
  const now = Date.now();
  counter = (counter + 1) % 1000;
  return `${now}-${counter}`;
}

/** IDs de ingredientes ordenados → string para comparación */
function ingredientKey(ingredients: StockAlertHistoryIngredient[]): string {
  return ingredients
    .map((i) => i.id)
    .sort((a, b) => a - b)
    .join(",");
}

// ─── Event emitter (fuente única de eventos de alerta) ──────
// Emite cuando nace una nueva StockAlert. Desacoplado de UI y sonido.

type AlertCreatedListener = (entry: StockAlertHistoryEntry) => void;

const alertListeners: AlertCreatedListener[] = [];

/** Suscribirse a nuevas alertas. Retorna función para desuscribirse. */
export function onAlertCreated(listener: AlertCreatedListener): () => void {
  alertListeners.push(listener);
  return () => {
    const idx = alertListeners.indexOf(listener);
    if (idx !== -1) alertListeners.splice(idx, 1);
  };
}

function emitAlertCreated(entry: StockAlertHistoryEntry): void {
  for (const listener of alertListeners) {
    listener(entry);
  }
}

// ─── Store ───────────────────────────────────────────────────

const EMPTY_CACHE: Record<StockAlertHistoryType, number[]> = {
  "low-stock": [],
  "out-of-stock": [],
  expired: [],
  "near-expiry": [],
};

export const useStockAlertHistoryStore = create<
  StockAlertHistoryState & StockAlertHistoryActions
>()(
  persist(
    (set) => ({
      alerts: [],
      notifiedCache: { ...EMPTY_CACHE },

      addAlert: (type, title, ingredients) => {
        const entry: StockAlertHistoryEntry = {
          id: generateId(),
          type,
          title,
          ingredients,
          createdAt: new Date().toISOString(),
          status: "active",
        };

        set((state) => {
          const next = [entry, ...state.alerts];
          if (next.length > MAX_ALERTS) {
            return { alerts: next.slice(0, MAX_ALERTS) };
          }
          return { alerts: next };
        });

        emitAlertCreated(entry);
      },

      addAlertIfNew: (type, title, ingredients) => {
        const key = ingredientKey(ingredients);
        let created: StockAlertHistoryEntry | null = null;

        set((state) => {
          const duplicate = state.alerts.some(
            (a) =>
              a.type === type &&
              a.status === "active" &&
              ingredientKey(a.ingredients) === key,
          );
          if (duplicate) return state;

          const entry: StockAlertHistoryEntry = {
            id: generateId(),
            type,
            title,
            ingredients,
            createdAt: new Date().toISOString(),
            status: "active",
          };

          created = entry;
          const next = [entry, ...state.alerts];
          if (next.length > MAX_ALERTS) {
            return { alerts: next.slice(0, MAX_ALERTS) };
          }
          return { alerts: next };
        });

        if (created) emitAlertCreated(created);
        return created !== null;
      },

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      clearAll: () => set({ alerts: [] }),

      resolveAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id && a.status === "active"
              ? {
                  ...a,
                  status: "resolved" as const,
                  resolvedAt: new Date().toISOString(),
                }
              : a,
          ),
        })),

      resolveAlerts: (ids) => {
        const idSet = new Set(ids);
        const now = new Date().toISOString();
        set((state) => ({
          alerts: state.alerts.map((a) =>
            idSet.has(a.id) && a.status === "active"
              ? { ...a, status: "resolved" as const, resolvedAt: now }
              : a,
          ),
        }));
      },

      addNotified: (type, ingredientIds) =>
        set((state) => {
          const existing = state.notifiedCache[type];
          const merged = [...new Set([...existing, ...ingredientIds])];
          return { notifiedCache: { ...state.notifiedCache, [type]: merged } };
        }),

      cleanupNotified: (type, keepIds) =>
        set((state) => ({
          notifiedCache: { ...state.notifiedCache, [type]: keepIds },
        })),
    }),
    {
      name: "panda-stock-alert-history",
      version: 6,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object")
          return persistedState as StockAlertHistoryState;
        try {
          const state = persistedState as Record<string, unknown>;
          const rawAlerts = Array.isArray(state.alerts) ? state.alerts : [];

          const alerts = rawAlerts.map((a: Record<string, unknown>) => ({
            id: typeof a.id === "string" ? a.id : String(a.id ?? generateId()),
            type: [
              "low-stock",
              "out-of-stock",
              "expired",
              "near-expiry",
            ].includes(a.type as string)
              ? (a.type as StockAlertHistoryType)
              : "low-stock",
            title:
              typeof a.title === "string"
                ? a.title
                : String(a.title ?? "Alerta"),
            ingredients: Array.isArray(a.ingredients) ? a.ingredients : [],
            createdAt:
              typeof a.createdAt === "string"
                ? a.createdAt
                : new Date().toISOString(),
            status:
              a.status === "active" || a.status === "resolved"
                ? (a.status as StockAlertStatus)
                : "active",
            resolvedAt:
              typeof a.resolvedAt === "string" ? a.resolvedAt : undefined,
          }));

          const notifiedCache =
            state.notifiedCache && typeof state.notifiedCache === "object"
              ? {
                  ...EMPTY_CACHE,
                  ...(state.notifiedCache as Record<string, number[]>),
                }
              : { ...EMPTY_CACHE };

          return { ...state, alerts, notifiedCache } as StockAlertHistoryState;
        } catch {
          return persistedState as StockAlertHistoryState;
        }
      },
    },
  ),
);
