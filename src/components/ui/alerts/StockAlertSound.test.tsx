import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { StockAlertSound } from "./StockAlertSound";
import { useStockAlertHistoryStore } from "../../../stores/stockAlertHistoryStore";

describe("StockAlertSound", () => {
  let playMock: ReturnType<typeof vi.fn>;
  let pauseMock: ReturnType<typeof vi.fn>;
  let audioInstances: { url: string }[];

  beforeEach(() => {
    vi.useFakeTimers();
    useStockAlertHistoryStore.getState().clearAll();

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
    expect(audioInstances[0].url).toContain("stock_expired.mp3");
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
});
