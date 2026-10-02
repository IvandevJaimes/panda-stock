import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAutoScrollHover } from "./useAutoScrollHover";

/**
 * jsdom no implementa layout: `scrollWidth`, `clientWidth`, `scrollLeft` y
 * `getBoundingClientRect` devuelven ceros o no existen, así que sin este stub el
 * hook no tiene nada que scrollear y todos los tests pasarían sin probar nada.
 *
 * El `scrollLeft` se intercepta con un setter propio porque el de jsdom ignora
 * lo que se le escribe: sin esto el assert vería siempre 0.
 */
function fingirLayout(
  el: HTMLElement,
  { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number },
) {
  let scrollLeft = 0;

  Object.defineProperties(el, {
    scrollWidth: { value: scrollWidth, configurable: true },
    clientWidth: { value: clientWidth, configurable: true },
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (valor: number) => {
        scrollLeft = valor;
      },
    },
  });

  el.getBoundingClientRect = () =>
    ({ left: 0, right: clientWidth, width: clientWidth, height: 0, top: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

  return {
    get scrollLeft() {
      return scrollLeft;
    },
  };
}

function Tira() {
  const { ref, alMover, alSalir } = useAutoScrollHover<HTMLDivElement>();

  return (
    <div
      ref={ref}
      role="group"
      aria-label="tira"
      onMouseMove={alMover}
      onMouseLeave={alSalir}
    >
      <button type="button">uno</button>
      <button type="button">dos</button>
    </div>
  );
}

function mover(clientX: number) {
  fireEvent.mouseMove(screen.getByRole("group", { name: "tira" }), { clientX });
}

describe("useAutoScrollHover", () => {
  it("corre hacia la derecha cuando el cursor se acerca al borde derecho", async () => {
    render(<Tira />);
    const tira = screen.getByRole("group", { name: "tira" });
    const layout = fingirLayout(tira, { scrollWidth: 900, clientWidth: 300 });

    // 290 con `right` en 300: a 10px del borde, dentro de la banda.
    mover(290);

    await waitFor(() => expect(layout.scrollLeft).toBeGreaterThan(0));
  });

  it("corre hacia la izquierda cuando el cursor se acerca al borde izquierdo", async () => {
    render(<Tira />);
    const tira = screen.getByRole("group", { name: "tira" });
    const layout = fingirLayout(tira, { scrollWidth: 900, clientWidth: 300 });

    // Primero se deja scrollear a la derecha, para que el cero sea un valor real.
    mover(290);
    await waitFor(() => expect(layout.scrollLeft).toBeGreaterThan(0));
    const antes = layout.scrollLeft;

    mover(5);
    await waitFor(() => expect(layout.scrollLeft).toBeLessThan(antes));
  });

  it("frena en el medio: el scroll solo pasa en las bandas de los bordes", async () => {
    render(<Tira />);
    const tira = screen.getByRole("group", { name: "tira" });
    const layout = fingirLayout(tira, { scrollWidth: 900, clientWidth: 300 });

    // 150 en un elemento de 300: justo al centro, fuera de las dos bandas.
    mover(150);
    await new Promise((resolver) => setTimeout(resolver, 60));

    expect(layout.scrollLeft).toBe(0);
  });

  it("no hace nada si la tira no tiene nada que scrollear", async () => {
    render(<Tira />);
    const tira = screen.getByRole("group", { name: "tira" });
    const layout = fingirLayout(tira, { scrollWidth: 300, clientWidth: 300 });

    mover(290);
    await new Promise((resolver) => setTimeout(resolver, 60));

    expect(layout.scrollLeft).toBe(0);
  });

  it("corta el loop al salir de la tira, aunque el cursor siga en el borde", async () => {
    render(<Tira />);
    const tira = screen.getByRole("group", { name: "tira" });
    const layout = fingirLayout(tira, { scrollWidth: 900, clientWidth: 300 });

    mover(290);
    await waitFor(() => expect(layout.scrollLeft).toBeGreaterThan(0));

    fireEvent.mouseLeave(tira);
    const alSalir = layout.scrollLeft;
    await new Promise((resolver) => setTimeout(resolver, 60));

    expect(layout.scrollLeft).toBe(alSalir);
  });
});
