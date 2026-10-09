import {
  showStockAlert,
  showStockoutAlert,
  type IngredientBadge,
} from "../components/ui/alerts/StockAlert";
import {
  useStockAlertHistoryStore,
  type StockAlertHistoryIngredient,
} from "../stores/stockAlertHistoryStore";

export interface StockImpact {
  productId: number;
  name: string;
  preStock: number;
  deductedQty: number;
  stockMin: number;
  unit?: string;
}

type StockState = "normal" | "bajo" | "sin_stock";

function getState(qty: number, stockMin: number): StockState {
  if (qty <= 0) return "sin_stock";
  if (stockMin > 0 && qty < stockMin) return "bajo";
  return "normal";
}

export interface StockAlertResult {
  /** Hubo al menos un producto que cruzó a stock bajo */
  lowStock: boolean;
  /** Hubo al menos un producto que se quedó sin stock */
  stockout: boolean;
}

/**
 * Evalúa los productos impactados por una venta y muestra
 * alertas si se detectaron transiciones de estado de empeoramiento.
 *
 * Lógica pura de transición:
 * - Si preState === postState → no hay alerta
 * - Si empeoró (→ bajo o → sin_stock) → alerta
 * - Si mejoró o igual → no se muestra alerta
 */
export function evaluateStockAlerts(impacts: StockImpact[]): StockAlertResult {
  const lowStockAlerts: IngredientBadge[] = [];
  const stockoutAlerts: IngredientBadge[] = [];

  for (const impact of impacts) {
    const { name, preStock, deductedQty, stockMin, unit } = impact;
    const postStock = preStock - deductedQty;

    const preState = getState(preStock, stockMin);
    const postState = getState(postStock, stockMin);

    // Sin transición → no hay alerta
    if (preState === postState) continue;

    if (postState === "bajo") {
      lowStockAlerts.push({ name, remaining: postStock, unit });
    } else if (postState === "sin_stock") {
      stockoutAlerts.push({ name, remaining: postStock, unit });
    }
  }

  if (lowStockAlerts.length > 0) {
    showStockAlert("Stock bajo", lowStockAlerts);
  }
  if (stockoutAlerts.length > 0) {
    showStockoutAlert("Sin stock", stockoutAlerts);
  }

  // Guardar en historial persistente: primero la crítica (sin stock)
  const addAlert = useStockAlertHistoryStore.getState().addAlert;

  if (stockoutAlerts.length > 0) {
    const historyIngredients: StockAlertHistoryIngredient[] = stockoutAlerts.map(
      (badge) => {
        const impact = impacts.find((i) => i.name === badge.name);
        return {
          id: impact?.productId ?? 0,
          name: badge.name,
          remainingStock: badge.remaining ?? 0,
          unit: badge.unit ?? impact?.unit ?? "",
          minimumStock: impact?.stockMin ?? 0,
        };
      },
    );
    addAlert("out-of-stock", "Sin stock", historyIngredients);
  }

  if (lowStockAlerts.length > 0) {
    const historyIngredients: StockAlertHistoryIngredient[] = lowStockAlerts.map(
      (badge) => {
        const impact = impacts.find((i) => i.name === badge.name);
        return {
          id: impact?.productId ?? 0,
          name: badge.name,
          remainingStock: badge.remaining ?? 0,
          unit: badge.unit ?? impact?.unit ?? "",
          minimumStock: impact?.stockMin ?? 0,
        };
      },
    );
    addAlert("low-stock", "Stock bajo", historyIngredients);
  }

  return {
    lowStock: lowStockAlerts.length > 0,
    stockout: stockoutAlerts.length > 0,
  };
}
