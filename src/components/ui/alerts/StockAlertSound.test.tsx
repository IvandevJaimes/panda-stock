import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { StockAlertSound } from "./StockAlertSound";
import { useStockAlertHistoryStore } from "../../../stores/stockAlertHistoryStore";
import { hayAlertaStockActiva } from "../../../lib/prioridadSonidos";
import { useSettingsStore } from "../../../stores/settings.store";

describe("StockAlertSound", () => {
  let playMock: ReturnType<typeof vi.fn>;
  let pauseMock: ReturnType<typeof vi.fn>;
  let audioInstances: { url: string; onended: (() => void) | null }[];

  beforeEach(() => {
    vi.useFakeTimers();
    useStockAlertHistoryStore.getState().clearAll();
    useSettingsStore.setState({ sonidoAlertas: true });

    playMock = vi.fn().mockResolvedValue(undefined);
    pauseMock = vi.fn();
    audioInstances = [];

    class MockAudio {
      url: string;
      play = playMock;
      pause = pauseMock;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(url: string) {
        this.url = url;
        audioInstances.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);
  });

  afterEach(() => {
    vi.useRealTimers();
    useSettingsStore.setState({ sonidoAlertas: true });
    vi.restoreAllMocks();
  });

  it("reproduce solo el sonido crítico (rojo) cuando se emiten alertas roja y ámbar juntas", async () => {
    render(<StockAlertSound />);

    // Emitir roja (out-of-stock) y ámbar (low-stock)
    useStockAlertHistoryStore.getState().addAlert("out-of-stock", "Sin stock", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 0,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    useStockAlertHistoryStore.getState().addAlert("low-stock", "Stock bajo", [
      {
        id: 2,
        name: "Prod 2",
        remainingStock: 3,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    // Avanzar la ventana de loteo (60ms)
    vi.advanceTimersByTime(100);

    // Audio debió ser instanciado solo 1 vez con el sonido de out-of-stock
    expect(audioInstances.length).toBe(1);
    expect(audioInstances[0].url).toContain("stock_out.mp3");
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it("prioriza expired (rojo) por encima de near-expiry (ámbar)", async () => {
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("near-expiry", "Por vencer", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 10,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    useStockAlertHistoryStore.getState().addAlert("expired", "Vencido", [
      {
        id: 2,
        name: "Prod 2",
        remainingStock: 5,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);

    expect(audioInstances.length).toBe(1);
    expect(audioInstances[0].url).toContain("stock_out.mp3");
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it("descarta alertas ámbar si recientemente sonó una alerta roja", async () => {
    render(<StockAlertSound />);

    // 1. Suena alerta roja
    useStockAlertHistoryStore.getState().addAlert("out-of-stock", "Sin stock", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 0,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);
    expect(audioInstances.length).toBe(1);
    expect(audioInstances[0].url).toContain("stock_out.mp3");

    // 2. 500ms después entra una alerta ámbar
    vi.advanceTimersByTime(500);

    useStockAlertHistoryStore.getState().addAlert("low-stock", "Stock bajo", [
      {
        id: 2,
        name: "Prod 2",
        remainingStock: 2,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);

    // No debe haber reproducido la alerta ámbar
    expect(audioInstances.length).toBe(1);
  });

  it("marca la alerta como activa mientras suena y la libera al terminar", async () => {
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("expired", "Vencido", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 5,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);
    expect(audioInstances.length).toBe(1);
    expect(hayAlertaStockActiva()).toBe(true);

    audioInstances[0].onended?.();
    expect(hayAlertaStockActiva()).toBe(false);
  });

  it("no queda marcada la alerta si la reproducción falla", async () => {
    playMock.mockRejectedValueOnce(new Error("bloqueado"));
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("out-of-stock", "Sin stock", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 0,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);
    await vi.waitFor(() => {
      expect(hayAlertaStockActiva()).toBe(false);
    });
  });

  it("una alerta ámbar (stock bajo) también marca prioridad para callar la venta", async () => {
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("low-stock", "Stock bajo", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 2,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);
    expect(audioInstances.length).toBe(1);
    expect(hayAlertaStockActiva()).toBe(true);

    audioInstances[0].onended?.();
    expect(hayAlertaStockActiva()).toBe(false);
  });

  it("no suena ni reclama prioridad si los sonidos están desactivados", async () => {
    useSettingsStore.setState({ sonidoAlertas: false });
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("out-of-stock", "Sin stock", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 0,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);

    expect(audioInstances.length).toBe(0);
    expect(playMock).not.toHaveBeenCalled();
    expect(pauseMock).not.toHaveBeenCalled();
    expect(hayAlertaStockActiva()).toBe(false);
  });

  it("corta en seco la alerta sonando cuando se desactivan los sonidos", async () => {
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("expired", "Vencido", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 5,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);
    expect(audioInstances.length).toBe(1);
    expect(hayAlertaStockActiva()).toBe(true);

    act(() => {
      useSettingsStore.setState({ sonidoAlertas: false });
    });

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(hayAlertaStockActiva()).toBe(false);
  });

  it("reserva la prioridad en cuanto llega la alerta, aunque el audio no haya arrancado", async () => {
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("out-of-stock", "Sin stock", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 0,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    // Sin avanzar el loteo (60ms) todavía: la venta ya no debe poder sonar.
    expect(hayAlertaStockActiva()).toBe(true);
    expect(audioInstances.length).toBe(0);

    vi.advanceTimersByTime(100);
    expect(audioInstances.length).toBe(1);
    expect(hayAlertaStockActiva()).toBe(true);

    audioInstances[0].onended?.();
    expect(hayAlertaStockActiva()).toBe(false);
  });

  it("una roja interrumpe la ámbar y el contador de prioridad queda balanceado", async () => {
    render(<StockAlertSound />);

    useStockAlertHistoryStore.getState().addAlert("low-stock", "Stock bajo", [
      {
        id: 1,
        name: "Prod 1",
        remainingStock: 2,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);
    expect(audioInstances.length).toBe(1);
    expect(hayAlertaStockActiva()).toBe(true);

    useStockAlertHistoryStore.getState().addAlert("out-of-stock", "Sin stock", [
      {
        id: 2,
        name: "Prod 2",
        remainingStock: 0,
        unit: "u",
        minimumStock: 5,
      },
    ]);

    vi.advanceTimersByTime(100);

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(audioInstances.length).toBe(2);
    expect(audioInstances[1].url).toContain("stock_out.mp3");
    expect(hayAlertaStockActiva()).toBe(true);

    audioInstances[1].onended?.();
    expect(hayAlertaStockActiva()).toBe(false);
  });
});
