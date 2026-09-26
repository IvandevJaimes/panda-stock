import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Cart } from "./Cart";
import { PosTabs } from "./PosTabs";
import { crearTicket, type ItemTicket, type TicketSession } from "./posQuery";

function item(productoId: number, cantidad: number): ItemTicket {
  return {
    productoId,
    nombre: `Producto ${productoId}`,
    precioVenta: 1000,
    costo: 700,
    cantidad,
    imgPath: null,
  };
}

function ticket(id: string, numero: number, items: ItemTicket[] = []): TicketSession {
  return { ...crearTicket(id, numero), items };
}

type Over = Partial<React.ComponentProps<typeof PosTabs>>;

function montar(over: Over = {}) {
  const props = {
    tickets: [ticket("t1", 1)],
    activeTicketId: "t1",
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  const utils = render(<PosTabs {...props} />);
  return { ...utils, props };
}

/**
 * Los <button> que son una pestaña, por su texto "Ticket N".
 *
 * El nombre accesible no incluye el "1" del aria-pressed, así que el patrón
 * `^Ticket \d+$` también sirve para excluir a la ✕ de cerrar, que se llama
 * "Cerrar el ticket 2". Se consulta por `screen` y no por `container` para no
 * atar el helper al árbol de un render en particular.
 */
function pestanasDe(): HTMLElement[] {
  return screen
    .getAllByRole("button", { name: /^Ticket \d+$/ })
    .filter((el) => el instanceof HTMLElement) as HTMLElement[];
}

describe("PosTabs: pestañas", () => {
  it("lista un botón por ticket, en orden", () => {
    montar({ tickets: [ticket("t1", 1), ticket("t2", 2), ticket("t3", 3)], activeTicketId: "t2" });

    const pestanas = pestanasDe();
    expect(pestanas.map((p) => p.textContent)).toEqual([
      "Ticket 1",
      "Ticket 2",
      "Ticket 3",
    ]);
  });

  it("marca con aria-pressed la activa, no con una clase", () => {
    montar({ tickets: [ticket("t1", 1), ticket("t2", 2)], activeTicketId: "t2" });

    const [t1, t2] = pestanasDe();
    expect(t1.getAttribute("aria-pressed")).toBe("false");
    expect(t2.getAttribute("aria-pressed")).toBe("true");
  });

  it("avisa el cambio de pestaña al tocar la que no está activa", async () => {
    const user = userEvent.setup();
    const { props } = montar({
      tickets: [ticket("t1", 1), ticket("t2", 2)],
      activeTicketId: "t1",
    });

    await user.click(pestanasDe()[1]);

    expect(props.onSelect).toHaveBeenCalledWith("t2");
  });
});

describe("PosTabs: cierre", () => {
  it("la primera pestaña NO se puede cerrar", () => {
    montar({ tickets: [ticket("t1", 1), ticket("t2", 2)], activeTicketId: "t1" });

    expect(screen.queryByRole("button", { name: "Cerrar el ticket 1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cerrar el ticket 2" })).toBeTruthy();
  });

  it("con un solo ticket no hay ninguna ✕", () => {
    montar({ tickets: [ticket("t1", 1)] });

    expect(screen.queryByRole("button", { name: /Cerrar el ticket/ })).toBeNull();
  });

  it("la pestaña activa también se puede cerrar", () => {
    montar({ tickets: [ticket("t1", 1), ticket("t2", 2)], activeTicketId: "t2" });

    expect(screen.getByRole("button", { name: "Cerrar el ticket 2" })).toBeTruthy();
  });

  it("un ticket vacío se cierra sin preguntar", async () => {
    const user = userEvent.setup();
    const { props } = montar({ tickets: [ticket("t1", 1), ticket("t2", 2)] });

    await user.click(screen.getByRole("button", { name: "Cerrar el ticket 2" }));

    expect(props.onClose).toHaveBeenCalledWith("t2");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("un ticket con productos pide confirmación antes de perderlos", async () => {
    const user = userEvent.setup();
    const { props } = montar({
      tickets: [ticket("t1", 1), ticket("t2", 2, [item(1, 3)])],
    });

    await user.click(screen.getByRole("button", { name: "Cerrar el ticket 2" }));

    // Todavía no se cerró nada: sigue abierto el diálogo de confirmación.
    expect(props.onClose).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/Cerrar el ticket 2/)).toBeTruthy();

    await user.click(within(dialogo).getByRole("button", { name: /^cerrar$/i }));
    expect(props.onClose).toHaveBeenCalledWith("t2");
  });

  it("cancelar la confirmación no cierra el ticket", async () => {
    const user = userEvent.setup();
    const { props } = montar({
      tickets: [ticket("t1", 1), ticket("t2", 2, [item(1, 1)])],
    });

    await user.click(screen.getByRole("button", { name: "Cerrar el ticket 2" }));
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: /cancelar/i }));

    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe("PosTabs: botón de sumar", () => {
  it("abre un ticket nuevo", async () => {
    const user = userEvent.setup();
    const { props } = montar();

    await user.click(screen.getByRole("button", { name: "Abrir un ticket nuevo" }));

    expect(props.onNew).toHaveBeenCalledTimes(1);
  });

  it("desaparece en el quinto ticket, en vez de quedar deshabilitado", () => {
    montar({
      tickets: [1, 2, 3, 4, 5].map((n) => ticket(`t${n}`, n)),
    });

    // No hay un sexto ticket: un botón apagado sería una promesa que el sistema
    // no puede cumplir. La ausencia del botón ES el aviso.
    expect(screen.queryByRole("button", { name: /ticket nuevo/i })).toBeNull();
  });

  it("sigue estando con cuatro tickets", () => {
    montar({ tickets: [1, 2, 3, 4].map((n) => ticket(`t${n}`, n)) });

    const boton = screen.getByRole("button", {
      name: "Abrir un ticket nuevo",
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
  });

  it("la última pestaña cierra la tira con borde derecho cuando no hay +", () => {
    // El `+` no tiene borde propio, así que con él al lado el borde derecho de
    // la última se leía como una línea de más. Al desaparecer el `+` en el tope,
    // la última queda con el flanco abierto y la tira se ve rota.
    montar({ tickets: [1, 2, 3, 4, 5].map((n) => ticket(`t${n}`, n)) });
    const pestanas = pestanasDe();

    expect(pestanas[pestanas.length - 1].className.split(/\s+/)).toContain(
      "border-r",
    );
  });

  it("la última NO lleva borde derecho mientras el + esté al lado", () => {
    montar({ tickets: [1, 2, 3].map((n) => ticket(`t${n}`, n)) });
    const pestanas = pestanasDe();

    expect(
      pestanas[pestanas.length - 1].className.split(/\s+/),
    ).not.toContain("border-r");
  });

  it("va pegado a la última pestaña, no al borde del panel", () => {
    // El grupo de pestañas no lleva `flex-1`: si lo llevara, el botón se
    // separaría del último ticket y quedaría flotando contra el borde.
    const { container } = montar({
      tickets: [ticket("t1", 1), ticket("t2", 2)],
    });

    const grupo = screen.getByRole("group", { name: /Tickets de venta/ });
    expect(grupo.className).not.toContain("flex-1");
    expect(container.querySelector(".flex-1")).toBeNull();
  });

  it("no deja separación ni con la fila de pestañas ni con el +", () => {
    const { container } = montar({ tickets: [ticket("t1", 1), ticket("t2", 2)] });

    // La fila que contiene las pestañas y el `+` no puede tener `gap`: con dos
    // hijos, un `gap` ahí ES el separador entre la última pestaña y el botón.
    const raiz = container.querySelector("div")!;
    expect(raiz.className).not.toMatch(/\bgap-/);
  });
});

describe("PosTabs: encaje con el panel", () => {
  it("todas las pestañas tienen el mismo redondeo, y es el del panel", () => {
    // El radio está escrito literal en los dos archivos porque Tailwind escanea
    // el fuente: no se puede componer con una variable. Este test es lo único
    // que avisa si uno se mueve y el otro no.
    const { container } = render(
      <div>
        <PosTabs
          tickets={[1, 2, 3, 4].map((n) => ticket(`t${n}`, n))}
          activeTicketId="t1"
          onSelect={vi.fn()}
          onNew={vi.fn()}
          onClose={vi.fn()}
        />
        <Cart
          resumen={{
            lineas: [],
            unidades: 0,
            subtotal: 0,
            descuento: 0,
            impuesto: 0,
            total: 0,
          }}
          metodoPago="efectivo"
          activeTicketId="t1"
          numeroTicket={1}
          onCambiarMetodoPago={vi.fn()}
          onCambiarCantidad={vi.fn()}
          onQuitar={vi.fn()}
          onVaciar={vi.fn()}
          onCobrar={vi.fn()}
        />
      </div>,
    );

    // Se compara el token de Tailwind (`2xl`, `xl`, `[26px]`...) y no el
    // número: así el guard sigue valiendo aunque el radio pase de un valor
    // arbitrario a uno de la escala.
    const radioPanel = /rounded-(\S+)/.exec(
      container.querySelector("aside")!.className,
    )?.[1];
    expect(radioPanel).toBeDefined();

    // Todas iguales entre sí...
    const radios = pestanasDe().map(
      (p) => /rounded-t-(\S+)/.exec(p.className)?.[1],
    );
    expect(radios).toHaveLength(4);
    expect(new Set(radios).size).toBe(1);

    // ...y todas iguales al panel.
    for (const radio of radios) {
      expect(radio).toBe(radioPanel);
    }
  });

  it("la primera pestaña no lleva padding a la izquierda: va al borde", () => {
    // `px` en el contenedor la haría sobresalir por arriba de la curva del
    // panel. El aire va del lado derecho, que es donde está el botón de sumar.
    const { container } = montar();
    const raiz = container.querySelector("div")!;

    expect(raiz.className).not.toMatch(/\bpl-/);
    expect(raiz.className).toMatch(/\bpr-/);
  });

  it("el grupo oculta la barra de scroll, que le dejaba un hueco abajo", () => {
    // El grupo scrollea cuando las pestañas no entran, y la barra horizontal se
    // dibujaba DENTRO de su caja: le quitaba alto al grupo, la fila de afuera
    // alineaba con `items-end` y las pestañas quedaban flotando arriba del
    // `Cart`, con un vacío entre la tira y el panel. `scrollbar-none` saca esa
    // altura sin tocar el scroll.
    montar();
    const grupo = screen.getByRole("group", { name: /Tickets de venta/ });

    expect(grupo.className).toContain("scrollbar-none");
    // Y el scroll tiene que seguir ahí: sin `overflow-x-auto` las pestañas
    // que no entran no tienen a dónde moverse.
    expect(grupo.className).toContain("overflow-x-auto");
  });
});
