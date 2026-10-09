import { describe, it, expect, beforeEach, vi } from "vitest";
import { evaluateStockAlerts, type StockImpact } from "./stockAlertService";
import { useStockAlertHistoryStore } from "../stores/stockAlertHistoryStore";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("stockAlertService", () => {
  beforeEach(() => {
    useStockAlertHistoryStore.getState().clearAll();
  });

  it("no dispara alerta si el stock se mantiene en estado normal", () => {
    const impacts: StockImpact[] = [
      {
        productId: 1,
        name: "Producto A",
        preStock: 20,
        deductedQty: 2,
        stockMin: 5,
        unit: "unidad",
      },
    ];

    const result = evaluateStockAlerts(impacts);
    expect(result.lowStock).toBe(false);
    expect(result.stockout).toBe(false);

    const store = useStockAlertHistoryStore.getState();
    expect(store.alerts.length).toBe(0);
  });

  it("dispara alerta de stock bajo al transicionar de normal a bajo", () => {
    const impacts: StockImpact[] = [
      {
        productId: 1,
        name: "Producto A",
        preStock: 6,
        deductedQty: 2, // postStock = 4 < stockMin (5)
        stockMin: 5,
        unit: "unidad",
      },
    ];

    const result = evaluateStockAlerts(impacts);
    expect(result.lowStock).toBe(true);
    expect(result.stockout).toBe(false);

    const store = useStockAlertHistoryStore.getState();
    expect(store.alerts.length).toBe(1);
    expect(store.alerts[0].type).toBe("low-stock");
    expect(store.alerts[0].ingredients[0].remainingStock).toBe(4);
  });

  it("dispara alerta de sin stock al cruzar a stock <= 0", () => {
    const impacts: StockImpact[] = [
      {
        productId: 2,
        name: "Producto B",
        preStock: 2,
        deductedQty: 2, // postStock = 0
        stockMin: 5,
        unit: "unidad",
      },
    ];

    const result = evaluateStockAlerts(impacts);
    expect(result.lowStock).toBe(false);
    expect(result.stockout).toBe(true);

    const store = useStockAlertHistoryStore.getState();
    expect(store.alerts.length).toBe(1);
    expect(store.alerts[0].type).toBe("out-of-stock");
    expect(store.alerts[0].ingredients[0].remainingStock).toBe(0);
  });

  it("no dispara alerta repetida si ya estaba en stock bajo antes de la venta", () => {
    const impacts: StockImpact[] = [
      {
        productId: 1,
        name: "Producto A",
        preStock: 4, // Ya estaba bajo (< 5)
        deductedQty: 1, // Sigue estando bajo (3)
        stockMin: 5,
        unit: "unidad",
      },
    ];

    const result = evaluateStockAlerts(impacts);
    expect(result.lowStock).toBe(false);
    expect(result.stockout).toBe(false);
    expect(useStockAlertHistoryStore.getState().alerts.length).toBe(0);
  });
});
