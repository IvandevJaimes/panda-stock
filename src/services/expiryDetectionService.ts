import { useStockAlertHistoryStore } from "../stores/stockAlertHistoryStore";
import type {
  StockAlertHistoryIngredient,
  StockAlertHistoryType,
} from "../stores/stockAlertHistoryStore";
import {
  showExpiredAlert,
  showNearExpiryAlert,
  type IngredientBadge,
} from "../components/ui/alerts/StockAlert";
import { productosService } from "./productos.service";
import { evaluateExpiry } from "../lib/dateUtils";
import { DIAS_POR_VENCER } from "../features/pos/posQuery";

/**
 * Filtra productos ya cubiertos por alertas activas + notifiedCache.
 * Retorna únicamente los productos que ingresan por primera vez al estado.
 */
function filterAlreadyNotified(
  detected: StockAlertHistoryIngredient[],
  alertType: StockAlertHistoryType,
): StockAlertHistoryIngredient[] {
  const store = useStockAlertHistoryStore.getState();
  const alreadyNotified = new Set<number>();

  // 1. Alertas activas del mismo tipo
  for (const alert of store.alerts) {
    if (alert.type === alertType && alert.status === "active") {
      for (const ing of alert.ingredients) {
        alreadyNotified.add(ing.id);
      }
    }
  }

  // 2. NotifiedCache (incluye productos de alertas descartadas)
  for (const id of store.notifiedCache[alertType]) {
    alreadyNotified.add(id);
  }

  return detected.filter((ing) => !alreadyNotified.has(ing.id));
}

/**
 * Limpia el notifiedCache: mantiene solo productos que siguen en el estado.
 * Los que abandonaron el estado podrán generarse como nueva alerta en el futuro.
 */
function cleanupNotifiedCache(
  currentExpiredIds: Set<number>,
  currentNearExpiryIds: Set<number>,
): void {
  const store = useStockAlertHistoryStore.getState();

  const expiredKeep = store.notifiedCache.expired.filter((id) =>
    currentExpiredIds.has(id),
  );
  const nearExpiryKeep = store.notifiedCache["near-expiry"].filter((id) =>
    currentNearExpiryIds.has(id),
  );

  store.cleanupNotified("expired", expiredKeep);
  store.cleanupNotified("near-expiry", nearExpiryKeep);
}

/**
 * Resuelve alertas activas de tipo expired/near-expiry
 * cuyos productos ya no están en los conjuntos afectados.
 */
function resolveStaleExpiryAlerts(
  currentExpiredIds: Set<number>,
  currentNearExpiryIds: Set<number>,
): void {
  const store = useStockAlertHistoryStore.getState();
  const activeExpiryAlerts = store.alerts.filter(
    (a) =>
      a.status === "active" &&
      (a.type === "expired" || a.type === "near-expiry"),
  );

  const toResolve: string[] = [];

  for (const alert of activeExpiryAlerts) {
    const shouldResolve = alert.ingredients.every((ing) => {
      if (alert.type === "expired") {
        return !currentExpiredIds.has(ing.id);
      }
      return !currentNearExpiryIds.has(ing.id);
    });

    if (shouldResolve) {
      toResolve.push(alert.id);
    }
  }

  if (toResolve.length > 0) {
    store.resolveAlerts(toResolve);
  }
}

let hasRun = false;

/**
 * Ejecuta la detección de vencidos y por vencer.
 * Se ejecuta UNA SOLA VEZ al iniciar la app.
 */
export async function detectExpiryAlerts(): Promise<void> {
  if (hasRun) return;
  hasRun = true;

  try {
    const productos = await productosService.getAll();
    const expired: StockAlertHistoryIngredient[] = [];
    const nearExpiry: StockAlertHistoryIngredient[] = [];

    for (const producto of productos) {
      if (!producto.activo || !producto.loteActivoVencimiento) continue;

      const evalVencimiento = evaluateExpiry(
        producto.loteActivoVencimiento,
        DIAS_POR_VENCER,
      );

      if (evalVencimiento?.status === "expired") {
        expired.push({
          id: producto.id,
          name: producto.nombre,
          remainingStock: producto.stockActual,
          unit: producto.unidadMedida,
          minimumStock: producto.stockMinimo,
          expiryDate: producto.loteActivoVencimiento,
        });
      } else if (evalVencimiento?.status === "expiring_soon") {
        nearExpiry.push({
          id: producto.id,
          name: producto.nombre,
          remainingStock: producto.stockActual,
          unit: producto.unidadMedida,
          minimumStock: producto.stockMinimo,
          expiryDate: producto.loteActivoVencimiento,
        });
      }
    }

    const expiredIds = new Set(expired.map((i) => i.id));
    const nearExpiryIds = new Set(nearExpiry.map((i) => i.id));

    // 1. Resolver alertas stale cuya condición ya no se cumple
    resolveStaleExpiryAlerts(expiredIds, nearExpiryIds);

    // 2. Limpiar cache: quitar productos que abandonaron el estado
    cleanupNotifiedCache(expiredIds, nearExpiryIds);

    if (expired.length === 0 && nearExpiry.length === 0) {
      return;
    }

    // 3. Crear alertas SOLO con productos nuevos (no ya notificados)
    if (expired.length > 0) {
      const newExpired = filterAlreadyNotified(expired, "expired");
      if (newExpired.length > 0) {
        const created = useStockAlertHistoryStore
          .getState()
          .addAlertIfNew("expired", "Productos vencidos", newExpired);
        if (created) {
          useStockAlertHistoryStore
            .getState()
            .addNotified("expired", newExpired.map((i) => i.id));
          const badges: IngredientBadge[] = newExpired.map((i) => ({
            name: i.name,
            expiryDate: i.expiryDate,
          }));
          showExpiredAlert("Vencidos", badges);
        }
      }
    }

    if (nearExpiry.length > 0) {
      const newNearExpiry = filterAlreadyNotified(nearExpiry, "near-expiry");
      if (newNearExpiry.length > 0) {
        const created = useStockAlertHistoryStore
          .getState()
          .addAlertIfNew("near-expiry", "Productos por vencer", newNearExpiry);
        if (created) {
          useStockAlertHistoryStore
            .getState()
            .addNotified("near-expiry", newNearExpiry.map((i) => i.id));
          const badges: IngredientBadge[] = newNearExpiry.map((i) => ({
            name: i.name,
            expiryDate: i.expiryDate,
          }));
          showNearExpiryAlert("Por vencer", badges);
        }
      }
    }
  } catch (error) {
    console.error("Error al detectar alertas de expiración:", error);
  }
}
