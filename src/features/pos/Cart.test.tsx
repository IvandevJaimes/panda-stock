import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Cart } from "./Cart";
import { CartItem } from "./CartItem";
import {
  VISTA_POR_DEFECTO,
  type LineaTicket,
  type MetodoPagoPOS,
  type ResumenTicket,
} from "./posQuery";

function linea(partial: Partial<LineaTicket> = {}): LineaTicket {
  return {
    productoId: 1,
    nombre: "Gaseosa Cola",
    precioVenta: 1000,
    costo: 600,
    cantidad: 1,
    imgPath: null,
    tipoTarifa: "minorista",
    precioUnitario: 1000,
    importeMinorista: 1000,
    ahorro: 0,
    importe: 1000,
    ...partial,
  };
}

function resumen(over: Partial<ResumenTicket> = {}): ResumenTicket {
  return {
    lineas: [],
    unidades: 0,
    subtotal: 0,
    descuento: 0,
    impuesto: 0,
    total: 0,
    ...over,
  };
}

function montarCart(over: { resumen?: ResumenTicket } = {}) {
  const props = {
    resumen: over.resumen ?? resumen(),
    metodoPago: "efectivo" as MetodoPagoPOS,
    onCambiarMetodoPago: vi.fn(),
    onCambiarCantidad: vi.fn(),
    onQuitar: vi.fn(),
    onVaciar: vi.fn(),
    onCobrar: vi.fn(),
  };
  const utils = render(<Cart {...props} />);
  return { container: utils.container, props, rerender: utils.rerender };
}

/** El aside del ticket, raíz del componente. */
function asideDe(container: HTMLElement): HTMLElement {
  const aside = container.querySelector("aside");
  if (!aside) throw new Error("no se encontró el aside del ticket");
  return aside as HTMLElement;
}

function zonaDeItems(container: HTMLElement): HTMLElement {
  const zona = asideDe(container).querySelector(".overscroll-contain");
  if (!zona) throw new Error("no se encontró la zona scrolleable de items");
  return zona as HTMLElement;
}

function clases(elemento: Element): string {
  return elemento.className;
}

describe("Cart: zona de items", () => {
  it("es la única zona scrolleable del panel", () => {
    const { container } = montarCart();

    expect(clases(zonaDeItems(container))).toContain("overflow-y-auto");
    expect(clases(zonaDeItems(container))).toContain("min-h-0");
    expect(clases(zonaDeItems(container))).toContain("flex-1");
  });

  it("el header y las secciones de abajo no se comprimen", () => {
    // Sin shrink-0, el algoritmo de flex les roba altura a los bloques fijos
    // cuando la lista scrollea, y "Cobrar" se aplasta o se solapa.
    const { container } = montarCart();
    const aside = asideDe(container);

    const fijos = Array.from(aside.children).filter(
      (hijo) => hijo !== zonaDeItems(container),
    );
    expect(fijos.length).toBeGreaterThan(0);
    for (const fijo of fijos) {
      expect(clases(fijo)).toContain("shrink-0");
    }
  });

  it("el borde superior del resumen separa la grilla del Subtotal", () => {
    const { container } = montarCart();
    const resumenBox = asideDe(container).querySelector(".border-t");

    expect(resumenBox).toBeTruthy();
    expect(clases(resumenBox!)).toContain("shrink-0");
    expect(clases(resumenBox!)).toContain("px-[22px]");
  });

  it("el separador lleva sombra y la apaga en dark mode", () => {
    const { container } = montarCart();
    const resumenBox = asideDe(container).querySelector(".border-t");
    const clasesResumen = clases(resumenBox!);

    // Sombra hacia arriba: es la lista scrolleable la que "proyecta" sobre el
    // resumen. Con offset negativo en Y, no hacia abajo.
    expect(clasesResumen).toContain("shadow-[0_-4px_6px_-4px_rgba(15,23,42,0.10)]");
    expect(clasesResumen).toContain("dark:shadow-none");
  });

  it("mantiene Total, método de pago y Cobrar en el DOM con muchos items", () => {
    const lineas = Array.from({ length: 40 }, (_, i) =>
      linea({ productoId: i + 1, nombre: `Producto ${i + 1}` }),
    );

    const { container } = montarCart({
      resumen: resumen({
        lineas,
        unidades: 40,
        subtotal: 40000,
        total: 40000,
      }),
    });

    expect(screen.getByText("Subtotal")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText("Método de pago")).toBeTruthy();
    expect(screen.getByRole("button", { name: /cobrar/i })).toBeTruthy();

    // Los 40 items viven dentro de la zona scrolleable, no en el bloque del
    // resumen: si se colaran, el resumen crecería y taparía lo de abajo.
    expect(zonaDeItems(container).children.length).toBe(40);
    // Timeout propio: 40 filas × 3 tooltips = 120 instancias de Tippy. Medido
    // en 6.99s contra 5.06s sin tooltips, y el default de 5000ms lo hace fallar
    // de forma intermitente cuando la suite corre en paralelo. El test verifica
    // layout, no velocidad: 5s no es un presupuesto meaningfully para 40 filas.
  }, 20000);
});

describe("Cart: métodos de pago", () => {
  it("el hover vive en group, no en peer", () => {
    // El input es sr-only, así que peer-hover: nunca se dispararía al pasar el
    // mouse sobre el botón visible. group en el label es lo único que funciona.
    const { container } = montarCart();
    const etiquetas = container.querySelectorAll("label.group");

    expect(etiquetas.length).toBe(3);
    for (const etiqueta of etiquetas) {
      const visual = etiqueta.querySelector("span");
      expect(clases(visual!)).toContain("group-hover:");
    }
  });

  it("cambia el método de pago al hacer clic", async () => {
    const user = userEvent.setup();
    const { props } = montarCart();

    await user.click(screen.getByText("Transferencia"));

    expect(props.onCambiarMetodoPago).toHaveBeenCalledWith("transferencia");
  });

  it("marca el método activo como seleccionado", () => {
    const { container } = montarCart();
    const marcado = container.querySelector('input[value="efectivo"]');

    expect(marcado).toBeTruthy();
    expect((marcado as HTMLInputElement).checked).toBe(true);
  });
});

describe("Cart: totales", () => {
  it("muestra el descuento mayorista solo cuando aplica", () => {
    const { rerender } = montarCart();
    expect(screen.queryByText("Descuento mayorista")).toBeNull();

    const nuevoResumen = resumen({ descuento: 150, total: 850 });
    rerender(
      <Cart
        resumen={nuevoResumen}
        metodoPago="efectivo"
        onCambiarMetodoPago={vi.fn()}
        onCambiarCantidad={vi.fn()}
        onQuitar={vi.fn()}
        onVaciar={vi.fn()}
        onCobrar={vi.fn()}
      />,
    );

    expect(screen.getByText("Descuento mayorista")).toBeTruthy();
  });
});

describe("Cart: animación de salida de un item", () => {
  // `fireEvent` y no `userEvent` a propósito: los timers falsos +
  // `userEvent.setup({ advanceTimers })` se deadlockan, porque `user.click`
  // espera un `setTimeout(delay)` interno que nadie llega a avanzar.
  // `fireEvent` es sincrónico y el estado de React ya sale flusheado.

  function filaMontada() {
    const props = {
      linea: linea(),
      onCambiarCantidad: vi.fn(),
      onQuitar: vi.fn(),
    };
    const { container, unmount } = render(<CartItem {...props} />);
    return { container, props, unmount };
  }

  function botonQuitar() {
    return screen.getByRole("button", {
      name: /quitar gaseosa cola del ticket/i,
    }) as HTMLButtonElement;
  }

  it("sale con la animación de salida, no con la de entrada", () => {
    const { container } = filaMontada();
    const fila = container.firstElementChild as HTMLElement;

    expect(fila.className).toContain("animate-entry-up");
    expect(fila.className).not.toContain("animate-exit-up");

    fireEvent.click(botonQuitar());

    // El cambio de animation-name es lo que dispara la salida.
    expect(fila.className).toContain("animate-exit-up");
    expect(fila.className).not.toContain("animate-entry-up");
  });

  it("no avisa que se fue hasta que termina la animación", () => {
    vi.useFakeTimers();
    try {
      const { props } = filaMontada();

      fireEvent.click(botonQuitar());
      expect(props.onQuitar).not.toHaveBeenCalled();

      vi.advanceTimersByTime(179);
      expect(props.onQuitar).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(props.onQuitar).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("un segundo clic no dispara un segundo onQuitar", () => {
    vi.useFakeTimers();
    try {
      const { props } = filaMontada();

      fireEvent.click(botonQuitar());
      fireEvent.click(botonQuitar());
      fireEvent.click(botonQuitar());
      vi.advanceTimersByTime(200);

      expect(props.onQuitar).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deshabilita el botón mientras sale, para que no se pueda re-disparar", () => {
    filaMontada();

    expect(botonQuitar().disabled).toBe(false);
    fireEvent.click(botonQuitar());
    expect(botonQuitar().disabled).toBe(true);
  });

  it("los timers pendientes no disparan onQuitar tras desmontar", () => {
    // Vaciar el ticket o recargar el catálogo desmonta la fila con la salida en
    // vuelo; el callback pendiente solo ensuciaría el estado.
    vi.useFakeTimers();
    try {
      const { props, unmount } = filaMontada();

      fireEvent.click(botonQuitar());
      unmount();
      vi.advanceTimersByTime(500);

      expect(props.onQuitar).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Cart: vaciar el ticket", () => {
  // `unidades` es lo que decide si el botón está habilitado: sin esto el
  // ticket cuenta como vacío y el click no dispara nada.
  const resumenConItems = () =>
    resumen({
      lineas: [linea({ productoId: 1, nombre: "Gaseosa Cola" })],
      unidades: 1,
      subtotal: 1000,
      total: 1000,
    });

  it("pide confirmación y no vacía al primer click", async () => {
    const user = userEvent.setup();
    const { props } = montarCart({ resumen: resumenConItems() });

    await user.click(screen.getByRole("button", { name: /^vaciar$/i }));

    // Abrir el modal no es vaciar: el click solo pide permiso.
    expect(props.onVaciar).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: /vaciar ticket/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(/se van a quitar todos los productos del ticket/i),
    ).toBeTruthy();
  });

  it("vacía recién cuando se confirma", async () => {
    const user = userEvent.setup();
    const { props } = montarCart({ resumen: resumenConItems() });

    await user.click(screen.getByRole("button", { name: /^vaciar$/i }));

    // Con el modal abierto hay dos botones "Vaciar": el del ticket y el de
    // confirmar. Hay que preguntar adentro del diálogo.
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: /^vaciar$/i }));

    expect(props.onVaciar).toHaveBeenCalledTimes(1);
  });

  it("cancelar no vacía", async () => {
    const user = userEvent.setup();
    const { props } = montarCart({ resumen: resumenConItems() });

    await user.click(screen.getByRole("button", { name: /^vaciar$/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(props.onVaciar).not.toHaveBeenCalled();
  });

  it("el botón de vaciar avisa en rojo al hover", () => {
    const { container } = montarCart({ resumen: resumenConItems() });

    // Buscarlo por rol y no con querySelector: el primer <button> del aside es
    // el "−" del stepper del item, no el de Vaciar.
    const boton = within(asideDe(container)).getByRole("button", {
      name: /^vaciar$/i,
    });

    // Vaciar tira trabajo de armado: el hover tiene que anticiparlo.
    expect(clases(boton)).toMatch(/hover:text-red-/);
  });

  it("no hay nada que vaciar con el ticket vacío", () => {
    montarCart();
    const boton = screen.getByRole("button", { name: /^vaciar$/i });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("VISTA_POR_DEFECTO importado", () => {
  it("sigue siendo el orden por defecto del POS", () => {
    expect(VISTA_POR_DEFECTO).toEqual({ orden: "nuevos", filtro: "all" });
  });
});
