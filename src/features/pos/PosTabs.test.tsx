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

  it("se deshabilita en el quinto ticket y explica el límite", () => {
    montar({
      tickets: [1, 2, 3, 4, 5].map((n) => ticket(`t${n}`, n)),
    });

    const boton = screen.getByRole("button", {
      name: /No se pueden abrir más de 5 tickets/,
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });

  it("sigue habilitado con cuatro tickets", () => {
    montar({ tickets: [1, 2, 3, 4].map((n) => ticket(`t${n}`, n)) });

    const boton = screen.getByRole("button", {
      name: "Abrir un ticket nuevo",
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
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

  it("es una pestaña de altura completa, no un círculo pegado al piso", () => {
    // Con el `IconButton` de 26px quedaba 10px más bajo que las pestañas y con
    // un `pb-1` pegado al fondo: se leía como un bodo achizado glueado al final
    // de la tira, con un área de hover que parecía arbitraria.
    const pestanas = pestanasDe();
    const altoPestana = /h-(\S+)/.exec(pestanas[0].className);
    const boton = screen.getByRole("button", { name: "Abrir un ticket nuevo" });

    expect(altoPestana).toBeDefined();
    // La pestaña mide su alto con `py-2` + `text-sm`, no con una clase `h-*`.
    // El `+` sí es explícito, así que se compara contra el valor conocido.
    expect(boton.className).toContain("h-9");
    expect(boton.className).not.toMatch(/\bh-\[26px\]/);
  });

  it("comparte la curva y el piso con las pestañas", () => {
    // Misma clase de redondeo que las pestañas y mismo `-mb-px` en el
    // envoltorio, así que se leen como parte de la misma tira.
    const boton = screen.getByRole("button", { name: "Abrir un ticket nuevo" });
    const pestanas = pestanasDe();
    const redondeo = /rounded-t-(\S+)/.exec(boton.className)?.[1];

    expect(redondeo).toBe(/rounded-t-(\S+)/.exec(pestanas[0].className)?.[1]);
    expect(boton.parentElement?.parentElement?.className).toContain("-mb-px");
  });

  it("no aporta ningún borde, para no volver a dibujar la divisoria", () => {
    const boton = screen.getByRole("button", { name: "Abrir un ticket nuevo" });

    expect(boton.className).not.toMatch(/\bborder(-[trblxy])?\b/);
  });

  it("tampoco aporta fondo, ni en reposo ni en hover", () => {
    // Un `hover:bg-*` hacía que el `+` se leyera como un elemento aparte de la
    // tira. El hover solo tiene que cambiar el color del ícono.
    const boton = screen.getByRole("button", { name: "Abrir un ticket nuevo" });

    expect(boton.className).not.toMatch(/\bbg-/);
    expect(boton.className).toContain("hover:text-emerald-600");
  });

  it("no deja separación ni con la fila de pestañas ni con el +", () => {
    const { container } = montar({ tickets: [ticket("t1", 1), ticket("t2", 2)] });

    // La fila que contiene las pestañas y el `+` no puede tener `gap`: con dos
    // hijos, un `gap` ahí ES el separador entre la última pestaña y el botón.
    const raiz = container.querySelector("div")!;
    expect(raiz.className).not.toMatch(/\bgap-/);
  });

  it("la última pestaña se queda sin borde derecho, que caía sobre el +", () => {
    // El `+` no tiene borde propio: el `IconButton` en variante `ghost` no
    // define ni `border` ni fondo. La línea que se veía junto a él era el
    // borde derecho de la última pestaña.
    const pestanas = pestanasDe();
    const ultima = pestanas[pestanas.length - 1];
    const clases = ultima.className.split(/\s+/);

    expect(clases).toContain("border-r-0");
    // Y no puede quedar el atajo `border` en ningún lado: con el atajo, la
    // última pestaña vuelve a pintarle las cuatro esquinas a `border-r-0` y la
    // línea reaparece. `tailwind-merge` no lo evita porque los trata como
    // grupos distintos.
    expect(clases).not.toContain("border");
  });

  it("declara los bordes lado por lado, no con el atajo `border`", () => {
    // Guarda del mismo problema: `border` + `border-r-0` no se complementan,
    // se pisan. Cada lado que se usa va declarado explícitamente.
    for (const p of pestanasDe()) {
      const clases = p.className.split(/\s+/);
      expect(clases).toContain("border-t");
      expect(clases).toContain("border-l");
      expect(clases).not.toContain("border-b");
      expect(clases).not.toContain("border-b-0");
    }
  });

  it("las pestañas que NO son la última conservan su borde derecho", () => {
    // Si también se les sacara, se rompería la separación entre pestañas y el
    // grupo se leería como un bloque liso sin costuras.
    const pestanas = pestanasDe();

    for (const p of pestanas.slice(0, -1)) {
      const clases = p.className.split(/\s+/);
      expect(clases).toContain("border-r");
      expect(clases).not.toContain("border-r-0");
    }
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
});
