import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type * as PrioridadSonidos from "../../lib/prioridadSonidos";

interface MockGainNode {
  gain: {
    value: number;
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    cancelScheduledValues: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

interface MockOscillator {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

let oscillators: MockOscillator[] = [];
let gains: MockGainNode[] = [];

function createMockGain(): MockGainNode {
  const node: MockGainNode = {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
  };
  node.connect.mockReturnValue(node);
  gains.push(node);
  return node;
}

class MockAudioContext {
  currentTime = 0;
  state: "running" | "suspended" = "running";
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createGain = vi.fn(createMockGain);
  createOscillator = vi.fn((): MockOscillator => {
    const osc: MockOscillator = {
      type: "sine",
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    osc.connect.mockReturnValue(osc);
    oscillators.push(osc);
    return osc;
  });
}

// sonidoVenta y prioridadSonidos deben compartir la misma instancia de módulo,
// por eso se importan dinámicamente después de resetModules.
async function importar() {
  vi.resetModules();
  const [sonidoVenta, prioridad] = await Promise.all([
    import("./sonidoVenta"),
    import("../../lib/prioridadSonidos"),
  ]);
  return { ...sonidoVenta, prioridad: prioridad as typeof PrioridadSonidos };
}

describe("sonidoVenta vs alertas de stock", () => {
  beforeEach(() => {
    oscillators = [];
    gains = [];
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reproduce normalmente cuando no hay alerta de stock", async () => {
    const { reproducirSonidoVentaExitosa } = await importar();
    reproducirSonidoVentaExitosa();

    expect(oscillators.length).toBeGreaterThan(0);
    expect(oscillators[0].start).toHaveBeenCalled();
  });

  it("no reproduce si ya hay una alerta crítica sonando", async () => {
    const { reproducirSonidoVentaExitosa, prioridad } = await importar();
    prioridad.marcarAlertaStockIniciada();

    reproducirSonidoVentaExitosa();

    expect(oscillators.length).toBe(0);
  });

  it("no reproduce si está sonando una alerta de stock bajo (ámbar)", async () => {
    const { reproducirSonidoVentaExitosa, prioridad } = await importar();
    prioridad.marcarAlertaStockIniciada();

    reproducirSonidoVentaExitosa();

    expect(oscillators.length).toBe(0);
  });

  it("se corta cuando empieza a sonar una alerta en plena reproducción", async () => {
    const { reproducirSonidoVentaExitosa, prioridad } = await importar();
    reproducirSonidoVentaExitosa();
    expect(oscillators.length).toBeGreaterThan(0);
    const master = gains[0];

    prioridad.marcarAlertaStockIniciada();

    expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      expect.any(Number),
    );
    expect(oscillators[0].stop).toHaveBeenCalled();
    expect(prioridad.hayAlertaStockActiva()).toBe(true);
  });

  it("puede volver a sonar tras finalizar la alerta", async () => {
    const { reproducirSonidoVentaExitosa, prioridad } = await importar();
    prioridad.marcarAlertaStockIniciada();
    reproducirSonidoVentaExitosa();
    expect(oscillators.length).toBe(0);

    prioridad.marcarAlertaStockFinalizada();
    vi.spyOn(Date, "now").mockReturnValue(1_001_000);
    reproducirSonidoVentaExitosa();

    expect(oscillators.length).toBeGreaterThan(0);
  });
});
