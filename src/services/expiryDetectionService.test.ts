import { describe, it, expect, beforeEach, vi } from "vitest";
import { detectExpiryAlerts } from "./expiryDetectionService";
import { useStockAlertHistoryStore } from "../stores/stockAlertHistoryStore";
import { productosService } from "./productos.service";
import type { ProductoConLoteActivo } from "../../electron/db/types";

vi.mock("sonner", () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("./productos.service", () => ({
  productosService: {
    getAll: vi.fn(),
  },
}));

describe("expiryDetectionService", () => {
  beforeEach(() => {
    useStockAlertHistoryStore.getState().clearAll();
    vi.clearAllMocks();
  });

  it("detecta productos vencidos y por vencer correctamente", async () => {
    const today = new Date();
    const expiredDate = new Date(today);
    expiredDate.setDate(today.getDate() - 2);

    const nearExpiryDate = new Date(today);
    nearExpiryDate.setDate(today.getDate() + 3);

    const format = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    vi.mocked(productosService.getAll).mockResolvedValue([
      {
        id: 1,
        nombre: "Leche",
        stockActual: 10,
        stockMinimo: 2,
        unidadMedida: "unidad",
        loteActivoVencimiento: format(expiredDate),
        activo: true,
      } as unknown as ProductoConLoteActivo,
      {
        id: 2,
        nombre: "Yogur",
        stockActual: 5,
        stockMinimo: 1,
        unidadMedida: "unidad",
        loteActivoVencimiento: format(nearExpiryDate),
        activo: true,
      } as unknown as ProductoConLoteActivo,
    ]);

    await detectExpiryAlerts();

    const store = useStockAlertHistoryStore.getState();
    const expiredAlert = store.alerts.find((a) => a.type === "expired");
    const nearExpiryAlert = store.alerts.find((a) => a.type === "near-expiry");

    expect(expiredAlert).toBeDefined();
    expect(nearExpiryAlert).toBeDefined();
    expect(expiredAlert?.ingredients[0].id).toBe(1);
    expect(nearExpiryAlert?.ingredients[0].id).toBe(2);
  });
});
