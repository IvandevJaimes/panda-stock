import { describe, it, expect, vi } from "vitest";
import {
  alIniciarAlertaStock,
  hayAlertaStockActiva,
  marcarAlertaStockIniciada,
  marcarAlertaStockFinalizada,
} from "./prioridadSonidos";

describe("prioridadSonidos", () => {
  it("refleja cuando hay una alerta de stock en curso", () => {
    expect(hayAlertaStockActiva()).toBe(false);
    marcarAlertaStockIniciada();
    expect(hayAlertaStockActiva()).toBe(true);
    marcarAlertaStockFinalizada();
    expect(hayAlertaStockActiva()).toBe(false);
  });

  it("solo notifica el inicio cuando el contador pasa de 0 a 1", () => {
    const listener = vi.fn();
    const off = alIniciarAlertaStock(listener);

    marcarAlertaStockIniciada();
    marcarAlertaStockIniciada();
    expect(listener).toHaveBeenCalledTimes(1);

    marcarAlertaStockFinalizada();
    expect(hayAlertaStockActiva()).toBe(true);
    marcarAlertaStockFinalizada();
    expect(hayAlertaStockActiva()).toBe(false);
    off();
  });

  it("el listener desuscrito ya no se ejecuta", () => {
    const listener = vi.fn();
    const off = alIniciarAlertaStock(listener);
    off();

    marcarAlertaStockIniciada();
    expect(listener).not.toHaveBeenCalled();
    marcarAlertaStockFinalizada();
  });

  it("no baja de cero si se finaliza de más", () => {
    marcarAlertaStockFinalizada();
    expect(hayAlertaStockActiva()).toBe(false);
  });
});
