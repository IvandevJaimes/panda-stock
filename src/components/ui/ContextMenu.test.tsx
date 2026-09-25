import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";

const viewportOriginal = {
  width: window.innerWidth,
  height: window.innerHeight,
};

afterEach(() => {
  vi.restoreAllMocks();
  window.innerWidth = viewportOriginal.width;
  window.innerHeight = viewportOriginal.height;
});

function fijarViewport(ancho: number, alto: number) {
  window.innerWidth = ancho;
  window.innerHeight = alto;
}

/** jsdom no calcula layout: se simula el tamaño del panel para poder verificar
 *  el clamp contra los bordes de la ventana y el auto-flip. */
function fingirTamanoPanel(ancho: number, alto: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: ancho,
    height: alto,
    top: 0,
    left: 0,
    right: ancho,
    bottom: alto,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

/** Harness mínimo: emula el estado controlado de la página. */
function MenuHarness({
  x = 100,
  y = 100,
  onAccion,
}: {
  x?: number;
  y?: number;
  onAccion?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        abrir
      </button>
      <ContextMenu
        open={abierto}
        x={x}
        y={y}
        onClose={() => setAbierto(false)}
      >
        <ContextMenuItem icon={<span />} onClick={onAccion}>
          Desactivar producto
        </ContextMenuItem>
        <ContextMenuItem variant="danger" icon={<span />}>
          Eliminar producto
        </ContextMenuItem>
      </ContextMenu>
    </>
  );
}

/** Abre el menú y deja correr el requestAnimationFrame de la animación de
 *  entrada: recién ahí el panel pasa a `visible`. */
async function abrir() {
  fireEvent.click(screen.getByText("abrir"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

const paneles = () => document.querySelectorAll<HTMLElement>('[role="menu"]');
const items = () => screen.getAllByRole("menuitem");
const panelAbierto = () => paneles()[0]!;

describe("ContextMenu", () => {
  it("no renderiza nada mientras está cerrado", () => {
    render(<MenuHarness />);
    expect(paneles()).toHaveLength(0);
  });

  it("monta el panel en el body con los items al abrir", async () => {
    render(<MenuHarness />);
    await abrir();
    expect(paneles()).toHaveLength(1);
    expect(items().map((item) => item.textContent)).toEqual([
      "Desactivar producto",
      "Eliminar producto",
    ]);
  });

  it("posiciona el panel junto al cursor con un margen de 4px", async () => {
    fijarViewport(1200, 900);
    fingirTamanoPanel(200, 80);
    render(<MenuHarness x={300} y={220} />);
    await abrir();
    expect(panelAbierto().style.left).toBe("304px");
    expect(panelAbierto().style.top).toBe("224px");
  });

  it("da la vuelta al panel cuando no cabe abajo ni a la derecha", async () => {
    fijarViewport(800, 600);
    fingirTamanoPanel(200, 80);
    render(<MenuHarness x={790} y={590} />);
    await abrir();
    // 790 - 200 - 4 = 586 · 590 - 80 - 4 = 506
    expect(panelAbierto().style.left).toBe("586px");
    expect(panelAbierto().style.top).toBe("506px");
  });

  it("respeta el margen mínimo contra el borde de la ventana", async () => {
    fijarViewport(800, 600);
    fingirTamanoPanel(900, 500);
    render(<MenuHarness x={0} y={0} />);
    await abrir();
    expect(panelAbierto().style.left).toBe("8px");
    expect(panelAbierto().style.top).toBe("8px");
  });

  it("ejecuta la acción y se cierra al elegir un item", async () => {
    const onAccion = vi.fn();
    render(<MenuHarness onAccion={onAccion} />);
    await abrir();
    fireEvent.click(screen.getByText("Desactivar producto"));
    expect(onAccion).toHaveBeenCalledTimes(1);
    expect(panelAbierto().className).toContain("opacity-0");
  });

  it("cierra con Escape, con click fuera y con scroll", async () => {
    for (const cerrar of [
      () => fireEvent.keyDown(document, { key: "Escape" }),
      () => fireEvent.pointerDown(document.body),
      () => fireEvent.scroll(window),
    ]) {
      const { unmount } = render(<MenuHarness />);
      await abrir();
      expect(panelAbierto().className).toContain("opacity-100");
      act(() => cerrar());
      expect(panelAbierto().className).toContain("opacity-0");
      unmount();
    }
  });

  it("no cierra al hacer click dentro del panel", async () => {
    render(<MenuHarness />);
    await abrir();
    fireEvent.pointerDown(panelAbierto());
    expect(panelAbierto().className).toContain("opacity-100");
  });

  it("enfoca el primer item y cicla con las flechas", async () => {
    render(<MenuHarness />);
    await abrir();
    const [primero, segundo] = items();
    expect(document.activeElement).toBe(primero);

    act(() => {
      fireEvent.keyDown(primero!, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(segundo);

    act(() => {
      fireEvent.keyDown(segundo!, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(primero);

    act(() => {
      fireEvent.keyDown(primero!, { key: "End" });
    });
    expect(document.activeElement).toBe(segundo);
  });
});
