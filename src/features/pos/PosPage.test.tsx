import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Categoria,
  Marca,
  MasVendido,
  ProductoConLoteActivo,
} from "../../../electron/db/types";
import { PosPage } from "./PosPage";
import { usePosTicketsStore } from "../../stores/pos-tickets.store";
import { useScannerStore } from "../../stores/scanner.store";
import { useUIStore } from "../../stores/ui.store";

const categorias: Categoria[] = [{ id: 1, nombre: "Bebidas", activo: true }];

const marcas: Marca[] = [{ id: 1, nombre: "Coca-Cola", activo: true }];

function producto(
  partial: Partial<ProductoConLoteActivo> = {},
): ProductoConLoteActivo {
  return {
    id: 1,
    categoriaId: 1,
    marcaId: null,
    nombre: "Gaseosa Cola",
    codigoInterno: "111",
    codigosBarras: "779001",
    variante: null,
    tipoVenta: "unidad",
    unidadMedida: "unidad",
    costo: 100,
    porcentajeGanancia: 100,
    precioVenta: 200,
    stockActual: 10,
    stockMinimo: 5,
    vencimiento: null,
    imgPath: null,
    activo: true,
    creadoEn: "2026-01-10",
    actualizadoEn: null,
    loteActivoVencimiento: null,
    ...partial,
  };
}

beforeEach(() => {
  window.electronAPI = {
    productos: {
      getAll: vi.fn().mockResolvedValue([producto()]),
      scan: vi.fn(async (codigo: string) =>
        codigo === producto().codigosBarras ? producto() : null,
      ),
    },
    categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
    marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
  } as unknown as Window["electronAPI"];
});

afterEach(() => {
  cleanup();
});

async function esperarCatalogo() {
  return screen.findByRole("button", { name: /agregar gaseosa cola/i });
}

describe("PosPage", () => {
  it("renderiza el catálogo y el ticket vacío", async () => {
    render(<PosPage />);

    expect(await esperarCatalogo()).toBeTruthy();
    // El empty nombra el ticket: con varios abiertos, un texto genérico no
    // decía cuál de los tickets vacíos estabas mirando.
    expect(screen.getByText("El ticket 1 está vacío")).toBeTruthy();
    expect(
      screen.getByText("Elegí del catálogo para armar la venta"),
    ).toBeTruthy();
    expect(screen.getByText("Efectivo")).toBeTruthy();
  });

  it("agrega un producto al ticket y calcula el total", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(await esperarCatalogo());

    await waitFor(() => {
      expect(screen.getByText("1 ítem")).toBeTruthy();
    });
    expect(screen.getAllByText("$200.00").length).toBeGreaterThan(0);
  });

  it("aplica el descuento mayorista desde 3 unidades", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(await esperarCatalogo());
    const mas = screen.getByRole("button", { name: /agregar una unidad/i });
    await user.click(mas);
    await user.click(mas);

    await waitFor(() => {
      expect(screen.getByText("3 ítems")).toBeTruthy();
    });
    expect(screen.getByText("Descuento mayorista")).toBeTruthy();
    expect(screen.getByText("−$60.00")).toBeTruthy();
  });

  it("filtra el catálogo por código de barras y descarta lo que no coincide", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    const buscador = await screen.findByLabelText("Buscar producto");

    await user.type(buscador, "779001");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeTruthy();
    });

    await user.clear(buscador);
    await user.type(buscador, "inexistente");
    await waitFor(() => {
      expect(
        screen.getByText(/no hay productos que coincidan/i),
      ).toBeTruthy();
    });
  });

  it("no renderiza cards de productos no vendibles y avisa que están sin stock", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi
          .fn()
          .mockResolvedValue([
            producto({ id: 1, nombre: "Gaseosa Cola" }),
            producto({ id: 2, nombre: "Yerba", stockActual: 0 }),
            producto({
              id: 3,
              nombre: "Vencido",
              loteActivoVencimiento: "01/01/2020",
            }),
          ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    expect(
      screen.queryByRole("button", { name: /agregar yerba/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /agregar vencido/i }),
    ).toBeNull();

    const buscador = await screen.findByLabelText("Buscar producto");
    await user.type(buscador, "yerba");

    await waitFor(() => {
      expect(screen.getByText("Sin stock")).toBeTruthy();
    });
  });

  it("las categorías cuentan solo vendibles y ofrecen limpiar filtros", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola", categoriaId: 1 }),
          producto({ id: 2, nombre: "Agua", categoriaId: 1, stockActual: 0 }),
          producto({ id: 3, nombre: "Fideos", categoriaId: 2, stockActual: 4 }),
          producto({
            id: 4,
            nombre: "Arroz",
            categoriaId: 2,
            loteActivoVencimiento: "01/01/2020",
          }),
        ]),
      },
      categorias: {
        getAll: vi
          .fn()
          .mockResolvedValue([
            { id: 1, nombre: "Bebidas", activo: true },
            { id: 2, nombre: "Almacén", activo: true },
          ]),
      },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    const todas = screen.getByRole("button", { name: /^todas/i });
    const bebidas = screen.getByRole("button", { name: /bebidas/i });

    expect(todas.textContent).toContain("2");
    expect(bebidas.textContent).toContain("1");

    await user.type(screen.getByLabelText("Buscar producto"), "gaseosa");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^todas/i }).textContent).toContain(
        "1",
      );
    });

    await user.click(
      screen.getByRole("button", { name: /limpiar todos los filtros/i }),
    );
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Buscar producto") as HTMLInputElement).value,
      ).toBe("");
    });
  });

  it("pinta el contorno ámbar y muestra el triángulo solo cuando hay aviso", async () => {
    function enDias(dias: number): string {
      const d = new Date();
      d.setDate(d.getDate() + dias);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    }

    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Leche", stockActual: 2, stockMinimo: 5 }),
          producto({ id: 3, nombre: "Yogur", loteActivoVencimiento: enDias(2) }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await screen.findByRole("button", { name: /agregar yogur/i });

    const normal = screen.getByRole("button", { name: /agregar gaseosa cola/i });
    const stockBajo = screen.getByRole("button", { name: /agregar leche/i });
    const porVencer = screen.getByRole("button", { name: /agregar yogur/i });

    expect(normal.dataset.aviso).toBeUndefined();
    expect(normal.className).toContain("border-slate-200");
    expect(normal.className).not.toContain("border-amber-300");
    expect(normal.querySelector("[data-estado]")).toBeNull();

    for (const conAviso of [stockBajo, porVencer]) {
      expect(conAviso.dataset.aviso).toBe("true");
      expect(conAviso.className).toContain("border-amber-300");
      expect(conAviso.className).not.toContain("border-slate-200");

      const badge = conAviso.querySelector("[data-estado]") as HTMLElement;
      const clases = badge.className.split(" ");
      expect(badge).toBeTruthy();
      expect(clases).toContain("h-7");
      expect(clases).toContain("w-7");
      expect(clases).toContain("bg-amber-500");
      expect(badge.querySelector("svg")).toBeTruthy();
      expect(badge.dataset.cantidad).toBe("1");
      expect(badge.querySelector("[data-contador]")).toBeNull();
    }

    const badgeBajo = stockBajo.querySelector("[data-estado]");
    const badgeVence = porVencer.querySelector("[data-estado]");
    expect(badgeBajo?.getAttribute("data-estado")).toBe("stock-bajo");
    expect(badgeVence?.getAttribute("data-estado")).toBe("por-vencer");
  });

  it("el select de la barra filtra por avisos", async () => {
    const user = userEvent.setup();
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");

    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Leche", stockActual: 2, stockMinimo: 5 }),
          producto({
            id: 3,
            nombre: "Yogur",
            loteActivoVencimiento: `${dd}/${mm}/${d.getFullYear()}`,
          }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.click(
      screen.getByRole("button", { name: /más nuevos primero/i }),
    );
    await user.click(screen.getByRole("option", { name: /^solo con stock bajo$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeNull();
    });
    expect(screen.getByRole("button", { name: /agregar leche/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^solo con stock bajo$/i }));
    await user.click(screen.getByRole("option", { name: /^solo por vencer$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /agregar leche/i }),
      ).toBeNull();
    });
    expect(screen.getByRole("button", { name: /agregar yogur/i })).toBeTruthy();
  });

  it("cambiar el orden no borra el filtro activo, y el botón lo declara", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Leche", stockActual: 2, stockMinimo: 5 }),
          producto({ id: 3, nombre: "Agua", stockActual: 1, stockMinimo: 5 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.click(
      screen.getByRole("button", { name: /más nuevos primero/i }),
    );
    await user.click(screen.getByRole("option", { name: /^solo con stock bajo$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeNull();
    });

    // Cambiar solo el orden: el filtro tiene que sobrevivir.
    await user.click(screen.getByRole("button", { name: /^solo con stock bajo$/i }));
    await user.click(screen.getByRole("option", { name: /^alfabético: a a z$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /solo con stock bajo · alfabético: a a z/i }),
      ).toBeTruthy();
    });
    expect(
      screen.queryByRole("button", { name: /agregar gaseosa cola/i }),
    ).toBeNull();

    const ordenadas = screen
      .getAllByRole("button", { name: /agregar/i })
      .map((b) => b.getAttribute("aria-label")?.split(" al ticket")[0]);
    expect(ordenadas).toEqual(["Agregar Agua", "Agregar Leche"]);
  });

  it("limpiar filtros también resetea el select a su vista por defecto", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Leche", stockActual: 2, stockMinimo: 5 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.click(
      screen.getByRole("button", { name: /más nuevos primero/i }),
    );
    await user.click(screen.getByRole("option", { name: /^solo con stock bajo$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeNull();
    });

    await user.click(
      screen.getByRole("button", { name: /limpiar todos los filtros/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: /más nuevos primero/i }),
    ).toBeTruthy();
  });

  it("usa EmptyState con acción para limpiar cuando no hay coincidencias", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.type(screen.getByLabelText("Buscar producto"), "zzzz");

    await waitFor(() => {
      expect(
        screen.getByText("No hay productos que coincidan con la búsqueda"),
      ).toBeTruthy();
    });
    expect(
      screen.getByText("Probá con otro término o limpiá los filtros para ver todo el catálogo."),
    ).toBeTruthy();

    const limpiar = screen.getByRole("button", { name: /limpiar filtros/i });
    expect(limpiar).toBeTruthy();

    await user.click(limpiar);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeTruthy();
    });
  });

  it("usa EmptyState de sin stock cuando lo único que coincide está agotado", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Yerba", stockActual: 0 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.type(screen.getByLabelText("Buscar producto"), "yerba");

    await waitFor(() => {
      expect(screen.getByText("Sin stock")).toBeTruthy();
    });
    expect(
      screen.getByText(
        "Los productos de esta marca no están disponibles para vender.",
      ),
    ).toBeTruthy();
    // El mensaje no puede nombrar productos: si la búsqueda viene de elegir una
    // marca, nadie buscó un producto puntual.
    expect(screen.queryByText(/yerba/i)).toBeNull();
  });

  it("el EmptyState de sin stock ofrece limpiar los filtros", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Yerba", stockActual: 0 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.type(screen.getByLabelText("Buscar producto"), "yerba");
    await waitFor(() => {
      expect(screen.getByText("Sin stock")).toBeTruthy();
    });

    // Hay filtros activos, así que el botón existe y tiene que limpiar.
    await user.click(
      screen.getByRole("button", { name: /limpiar filtros/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeTruthy();
    });
  });

  it("el EmptyState de sin stock no ofrece limpiar si no hay filtros", async () => {
    // Catálogo entero bloqueado y sin búsqueda: no hay nada que limpiar, así
    // que el botón no debe aparecer.
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola", stockActual: 0 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await waitFor(() => {
      expect(screen.getByText("Sin stock")).toBeTruthy();
    });

    expect(
      screen.queryByRole("button", { name: /limpiar filtros/i }),
    ).toBeNull();
  });

  it("el loading reemplaza la página entera, no solo la grilla", async () => {
    let resolver: (value: unknown) => void = () => {};
    const pendiente = new Promise((resolve) => {
      resolver = resolve;
    });

    window.electronAPI = {
      productos: { getAll: vi.fn().mockReturnValue(pendiente) },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    const { container } = render(<PosPage />);

    const estado = await screen.findByRole("status");
    expect(estado.textContent).toBe("Cargando punto de venta...");
    expect(estado.parentElement?.parentElement?.querySelector("svg")).toBeTruthy();

    // Ni el buscador, ni el título "Vender", ni el carrito deben existir: si se
    // renderizan vacíos se leen como una app rota, no como una carga.
    expect(screen.queryByLabelText("Buscar producto")).toBeNull();
    expect(screen.queryByText("Vender")).toBeNull();
    expect(container.textContent).not.toContain("Ticket");

    await act(async () => {
      resolver([]);
      await pendiente;
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Buscar producto")).toBeTruthy();
    });
  });

  it("el indicador flotante muestra el ! en rojo y el desglose en el tooltip", async () => {
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Yerba", stockActual: 0 }),
          producto({ id: 3, nombre: "Arroz", stockActual: 0 }),
          producto({
            id: 4,
            nombre: "Leche",
            loteActivoVencimiento: "01/01/2020",
          }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    const indicador = screen.getByRole("button", {
      name: /ver productos no vendibles/i,
    });

    expect(indicador.getAttribute("aria-label")).toContain(
      "2 agotados y 1 vencido",
    );

    const icono = indicador.querySelector("svg");
    expect(icono).toBeTruthy();
    expect(icono?.getAttribute("class")).toContain("text-red-500");
    expect(indicador.querySelector("[data-total]")?.textContent).toBe("3");
  });

  it("el indicador flotante cuenta todo el catálogo, no solo la búsqueda", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Yerba", stockActual: 0 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.type(screen.getByLabelText("Buscar producto"), "gaseosa");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /ver productos no vendibles/i }),
      ).toBeTruthy();
    });
    expect(
      screen
        .getByRole("button", { name: /ver productos no vendibles/i })
        .getAttribute("aria-label"),
    ).toContain("1 agotado");
  });

  it("no muestra el indicador flotante cuando no hay productos no vendibles", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    expect(
      screen.queryByRole("button", { name: /ver productos no vendibles/i }),
    ).toBeNull();
  });

  it("muestra 2 en el badge cuando se cumplen los dos avisos", async () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const enDosDias = `${dd}/${mm}/${d.getFullYear()}`;

    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({
            id: 1,
            nombre: "Leche",
            stockActual: 2,
            stockMinimo: 5,
            loteActivoVencimiento: enDosDias,
          }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    const card = await screen.findByRole("button", { name: /agregar leche/i });
    const badge = card.querySelector("[data-estado]") as HTMLElement;

    expect(badge.dataset.cantidad).toBe("2");
    expect(badge.className.split(" ")).toContain("min-w-7");
    expect(badge.className.split(" ")).not.toContain("w-7");

    const contador = badge.querySelector("[data-contador]") as HTMLElement;
    expect(contador.textContent).toBe("2");

    expect(card.getAttribute("aria-label")).toContain("Vence en 2 días");
    expect(card.getAttribute("aria-label")).toContain("Stock bajo: 2 de mínimo 5");
  });

  it("el aria-label de la card incluye el motivo del aviso", async () => {
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Leche", stockActual: 2, stockMinimo: 5 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    const card = await screen.findByRole("button", { name: /agregar leche/i });

    expect(card.getAttribute("aria-label")).toBe(
      "Agregar Leche al ticket. Stock bajo: 2 de mínimo 5",
    );
  });

  it("muestra marca y variante en la card y ancla el precio al fondo", async () => {
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola", marcaId: 1 }),
          producto({ id: 2, nombre: "Agua Mineral", variante: "500 ml" }),
          producto({ id: 3, nombre: "Arroz" }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await screen.findByRole("button", { name: /agregar arroz/i });

    expect(screen.getByText("Coca-Cola")).toBeTruthy();
    expect(screen.getByText("500 ml")).toBeTruthy();

    const cards = [
      screen.getByRole("button", { name: /agregar gaseosa cola/i }),
      screen.getByRole("button", { name: /agregar agua mineral/i }),
      screen.getByRole("button", { name: /agregar arroz/i }),
    ];

    cards.forEach((card) => {
      const precio = card.querySelector(".tabular-nums");
      expect(precio?.className).toContain("mt-auto");
    });

    cards.forEach((card) => {
      expect(card.querySelector("[title]")).toBeNull();
    });

    const arroz = cards[2];
    expect(arroz.textContent).not.toContain("·");
  });

  it("resalta en vivo el término de búsqueda en nombre, marca y variante", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Café con Leche", marcaId: 1 }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await screen.findByRole("button", { name: /agregar café/i });

    const card = () => screen.getByRole("button", { name: /agregar café/i });
    const buscador = screen.getByLabelText("Buscar producto");
    expect(card().querySelectorAll("mark")).toHaveLength(0);

    await user.type(buscador, "cafe");

    await waitFor(() => {
      expect(card().querySelectorAll("mark").length).toBeGreaterThan(0);
    });
    expect(
      Array.from(card().querySelectorAll("mark")).map((m) => m.textContent),
    ).toEqual(["Café"]);
    expect(card().textContent).toContain("Café con Leche");

    await user.clear(buscador);
    await user.type(buscador, "coca");

    await waitFor(() => {
      expect(
        Array.from(card().querySelectorAll("mark")).map((m) => m.textContent),
      ).toEqual(["Coca"]);
    });
    expect(card().textContent).toContain("Coca-Cola");
  });

  it("filtra el catálogo por marca y variante desde la página", async () => {
    const user = userEvent.setup();
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola", marcaId: 1 }),
          producto({
            id: 2,
            nombre: "Agua Mineral",
            marcaId: null,
            variante: "500 ml",
          }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    await user.type(screen.getByLabelText("Buscar producto"), "coca");
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /agregar agua mineral/i }),
      ).toBeNull();
    });
    expect(screen.getByRole("button", { name: /agregar gaseosa cola/i })).toBeTruthy();

    await user.clear(screen.getByLabelText("Buscar producto"));
    await user.type(screen.getByLabelText("Buscar producto"), "500");
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /agregar gaseosa cola/i }),
      ).toBeNull();
    });
    expect(screen.getByRole("button", { name: /agregar agua mineral/i })).toBeTruthy();
  });

  it("el botón limpiar se habilita con filtros activos y resetea búsqueda y categoría", async () => {
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    const limpiar = screen.getByRole("button", {
      name: /limpiar todos los filtros/i,
    });
    expect((limpiar as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: /bebidas/i }));
    expect((limpiar as HTMLButtonElement).disabled).toBe(false);

    await user.type(screen.getByLabelText("Buscar producto"), "gaseosa");
    await user.click(limpiar);

    await waitFor(() => {
      expect(
        (limpiar as HTMLButtonElement).disabled,
      ).toBe(true);
    });
    expect(
      (screen.getByLabelText("Buscar producto") as HTMLInputElement).value,
    ).toBe("");
    expect(
      screen.getByRole("button", { name: /^todas/i }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("muestra un único badge flotante con el desglose de no vendibles", async () => {
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([
          producto({ id: 1, nombre: "Gaseosa Cola" }),
          producto({ id: 2, nombre: "Yerba", stockActual: 0 }),
          producto({
            id: 3,
            nombre: "Vencido",
            loteActivoVencimiento: "01/01/2020",
          }),
        ]),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await esperarCatalogo();

    const badge = screen.getByRole("button", {
      name: /ver productos no vendibles: 1 agotado y 1 vencido\./i,
    });
    expect(badge.querySelector("[data-total]")?.textContent).toBe("2");
  });

  it("no muestra el badge cuando no hay nada bloqueado", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    expect(
      screen.queryByRole("button", { name: /productos no vendibles/i }),
    ).toBeNull();
  });

  it("quita el producto del ticket y vuelve al estado vacío", async () => {
    const user = userEvent.setup();
    render(<PosPage />);

    await user.click(await esperarCatalogo());
    await waitFor(() => {
      expect(screen.getByText("1 ítem")).toBeTruthy();
    });

    await user.click(
      screen.getByRole("button", { name: /quitar gaseosa cola del ticket/i }),
    );
    await waitFor(() => {
      expect(screen.getByText("El ticket 1 está vacío")).toBeTruthy();
    });
  });

  describe("búsqueda por marca", () => {
    const dosMarcas: Marca[] = [
      { id: 1, nombre: "Coca-Cola", activo: true },
      { id: 2, nombre: "Pepsi", activo: true },
      { id: 3, nombre: "Marca Retirada", activo: false },
    ];

    beforeEach(() => {
      window.electronAPI = {
        productos: {
          getAll: vi.fn().mockResolvedValue([
            producto({ id: 1, nombre: "Gaseosa Cola", marcaId: 1 }),
            producto({ id: 2, nombre: "Gaseosa Naranja", marcaId: 2 }),
          ]),
        },
        categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
        marcas: { getAll: vi.fn().mockResolvedValue(dosMarcas) },
      } as unknown as Window["electronAPI"];
    });

    it("el botón muestra el conteo de marcas activas, no el total", async () => {
      render(<PosPage />);
      await esperarCatalogo();

      // 3 marcas en total pero solo 2 activas: contar todas mentiría.
      const boton = screen.getByRole("button", { name: /marcas/i });
      expect(boton.textContent).toContain("2");
      expect(boton.textContent).not.toContain("3");
    });

    it("elegir una marca la escribe en el buscador y filtra el catálogo", async () => {
      const user = userEvent.setup();
      render(<PosPage />);
      await esperarCatalogo();

      await user.click(screen.getByRole("button", { name: /marcas/i }));

      const cardMarca = await screen.findByRole("button", {
        name: /coca-cola/i,
      });
      await user.click(cardMarca);

      // La marca va al buscador, no a un filtro paralelo: coincideBusquedaPOS
      // ya matchea por marca.
      await waitFor(() => {
        expect(
          (screen.getByLabelText("Buscar producto") as HTMLInputElement).value,
        ).toBe("Coca-Cola");
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /agregar gaseosa cola/i }),
        ).toBeTruthy();
        expect(
          screen.queryByRole("button", { name: /agregar gaseosa naranja/i }),
        ).toBeNull();
      });
    });

    describe("ayuda de atajos", () => {
      it("el botón de info al lado del título abre el modal de atajos", async () => {
        const user = userEvent.setup();
        render(<PosPage />);
        await esperarCatalogo();

        // Icono solo, así que el nombre accesible es lo único que lo identifica.
        const info = screen.getByRole("button", { name: /ver los atajos/i });
        const titulo = screen.getByRole("heading", { name: /^vender$/i });

        // Va pegado al título, no en el grupo de botones de la derecha.
        expect(info.parentElement).toBe(titulo.parentElement);

        await user.click(info);
        expect(
          await screen.findByRole("heading", { name: /atajos de teclado/i }),
        ).toBeTruthy();
      });

      it("el atajo F1 y el botón comparten el mismo estado", async () => {
        const user = userEvent.setup();
        render(<PosPage />);
        await esperarCatalogo();

        await user.click(
          screen.getByRole("button", { name: /ver los atajos/i }),
        );
        await screen.findByRole("heading", { name: /atajos de teclado/i });

        // Con dos fuentes de verdad el botón podía quedar abierto mientras F1
        // lo cerraba.
        await user.keyboard("{F1}");
        await waitFor(() =>
          expect(
            screen.queryByRole("heading", { name: /atajos de teclado/i }),
          ).toBeNull(),
        );
      });
    });

    it("el botón está en la fila del título, sobre el buscador", async () => {
      render(<PosPage />);
      await esperarCatalogo();

      const boton = screen.getByRole("button", { name: /marcas/i });
      const titulo = screen.getByRole("heading", { name: /vender/i });
      const buscador = screen.getByLabelText("Buscar producto");

      // `Tooltip` no mete wrapper (clona el hijo), así que el padre directo del
      // botón ES el grupo de la fila del título.
      const grupo = boton.parentElement!;
      // El título vive en un grupo propio (título + botón Volver) que debe
      // seguir siendo hermano del grupo de botones, no su padre.
      expect(titulo.parentElement!.parentElement).toBe(grupo.parentElement);

      // Y esa fila está por encima del buscador en el documento.
      expect(
        grupo.compareDocumentPosition(buscador) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    describe("modo más vendidos", () => {
      const naranja = producto({
        id: 2,
        nombre: "Gaseosa Naranja",
        codigoInterno: "222",
      });
      const agua = producto({ id: 3, nombre: "Agua Mineral", codigoInterno: "333" });

      /**
       * Ranking a mano, no el de `beforeEach`: el orden lo define la lista que
       * devuelve la base y el producto más caro en unidades tiene que ser el
       * primero, para que un orden alfabético accidental se note.
       */
      function montar(ranking: MasVendido[]) {
        window.electronAPI = {
          productos: {
            getAll: vi.fn().mockResolvedValue([producto(), naranja, agua]),
            getMasVendidos: vi.fn().mockResolvedValue(ranking),
            scan: vi.fn().mockResolvedValue(null),
          },
          categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
          marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
        } as unknown as Window["electronAPI"];
      }

      it("no consulta el ranking al montar, solo al apretar el botón", async () => {
        montar([{ productoId: 2, unidades: 20 }]);
        render(<PosPage />);
        await esperarCatalogo();

        // Agregar la consulta al arranque le cobraría latencia a toda sesión de
        // caja que nunca abre el modo.
        expect(window.electronAPI.productos.getMasVendidos).not.toHaveBeenCalled();
      });

      it("cambia la grilla a los más vendidos y los deja agregar al ticket", async () => {
        const user = userEvent.setup();
        montar([
          { productoId: 2, unidades: 20 },
          { productoId: 1, unidades: 5 },
        ]);
        render(<PosPage />);
        await esperarCatalogo();

        await user.click(
          screen.getByRole("button", { name: /ver los productos más vendidos/i }),
        );

        // El título dice que cambió de vista, y el catálogo entero se fue.
        expect(
          await screen.findByRole("heading", { name: /más vendidos/i }),
        ).toBeTruthy();
        await waitFor(() =>
          expect(
            screen.queryByRole("button", { name: /agregar agua mineral/i }),
          ).toBeNull(),
        );

        // Los que sí vendieron quedan, y se pueden agregar.
        const agregar = await screen.findByRole("button", {
          name: /agregar gaseosa naranja/i,
        });
        await user.click(agregar);
        await waitFor(() => {
          expect(screen.getByText("1 ítem")).toBeTruthy();
        });
      });

      it("el botón Volver devuelve el catálogo", async () => {
        const user = userEvent.setup();
        montar([{ productoId: 2, unidades: 20 }]);
        render(<PosPage />);
        await esperarCatalogo();

        await user.click(
          screen.getByRole("button", { name: /ver los productos más vendidos/i }),
        );
        await screen.findByRole("heading", { name: /más vendidos/i });

        await user.click(screen.getByRole("button", { name: /volver/i }));

        expect(
          await screen.findByRole("heading", { name: /^vender$/i }),
        ).toBeTruthy();
        expect(
          await screen.findByRole("button", { name: /agregar agua mineral/i }),
        ).toBeTruthy();
      });

      it("sin ventas explica que el modo necesita historial", async () => {
        const user = userEvent.setup();
        montar([]);
        render(<PosPage />);
        await esperarCatalogo();

        await user.click(
          screen.getByRole("button", { name: /ver los productos más vendidos/i }),
        );

        // El mensaje de ProductGrid ("no coincide con la búsqueda") sería falso:
        // no se buscó nada.
        expect(await screen.findByText(/todavía no hay ventas/i)).toBeTruthy();
        expect(
          screen.queryByRole("button", { name: /agregar gaseosa cola/i }),
        ).toBeNull();
      });

      it("si la consulta falla, sale del modo en vez de mostrar el catálogo mudo", async () => {
        const user = userEvent.setup();
        montar([]);
        window.electronAPI.productos.getMasVendidos = vi
          .fn()
          .mockRejectedValue(new Error("base caída"));
        render(<PosPage />);
        await esperarCatalogo();

        await user.click(
          screen.getByRole("button", { name: /ver los productos más vendidos/i }),
        );

        // Dejarlo activo mostrando el catálogo entero es indistinguible de que
        // el botón no funciona.
        expect(
          await screen.findByRole("heading", { name: /^vender$/i }),
        ).toBeTruthy();
        expect(
          screen
            .getByRole("button", { name: /ver los productos más vendidos/i })
            .getAttribute("aria-pressed"),
        ).toBe("false");
      });
    });

    it("Ctrl+M abre el modal de marcas", async () => {
      const user = userEvent.setup();
      render(<PosPage />);
      await esperarCatalogo();

      expect(screen.queryByRole("button", { name: /coca-cola/i })).toBeNull();

      await user.keyboard("{Control>}m{/Control}");

      expect(
        await screen.findByRole("button", { name: /coca-cola/i }),
      ).toBeTruthy();
    });

    it("el modal es de solo consulta: no se puede crear, renombrar ni eliminar", async () => {
      const user = userEvent.setup();
      render(<PosPage />);
      await esperarCatalogo();

      await user.click(screen.getByRole("button", { name: /marcas/i }));
      await screen.findByRole("button", { name: /coca-cola/i });

      // El POS es una pantalla de venta: desde el mostrador se consulta una
      // marca, no se da de alta ni se borra.
      expect(screen.queryByRole("button", { name: /nueva marca/i })).toBeNull();
      expect(
        screen.queryByRole("button", { name: /^renombrar/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /^eliminar/i }),
      ).toBeNull();
      // El título tampoco puede prometer gestión.
      expect(screen.queryByText(/gestionar marcas/i)).toBeNull();
    });
  });
});

describe("PosPage · ticket colapsable en mobile", () => {
  // `matches: true` para cualquier query: a `useMediaQuery` solo le interesa
  // decidir en qué breakpoint estamos, no calcular nada.
  function stubVentanaMovil() {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  // El nombre accesible lleva el número adentro (`Abrir el ticket 1, está
  // vacío`), así que el matcher va flojo: la aserción es sobre la existencia
  // del botón, no sobre la redacción.
  const botonAbrir = () =>
    screen.queryByRole("button", { name: /abrir el ticket \d/i });

  const salidasDeCierre = () =>
    screen.queryAllByRole("button", { name: /cerrar el panel del ticket/i });

  beforeEach(() => {
    // El drawer es estado local de `PosPage`, así que cada `render` arranca
    // cerrado y no hay nada que resetear.
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("en escritorio no hay botón flotante: el ticket ya está a la vista", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    expect(botonAbrir()).toBeNull();
    expect(salidasDeCierre()).toHaveLength(0);
  });

  it("en mobile muestra el botón flotante y el ticket abre al tocarlo", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    expect(botonAbrir()).toBeTruthy();
    // Cerrado no hay asa ni backdrop: son las dos salidas del panel abierto.
    expect(salidasDeCierre()).toHaveLength(0);

    await user.click(botonAbrir()!);

    // Lo que se verifica es que aparezcan las salidas: un drawer sin forma de
    // cerrarse es un callejón sin salida.
    expect(salidasDeCierre().length).toBeGreaterThan(0);
    expect(botonAbrir()).toBeNull();
  });

  it("el botón flotante dice cuántos ítems hay y cuánto suman", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    // Vacío lo dice de entrada: abrir un panel a ciegas en mobile hace pensar
    // que la app no leyó el escaneo.
    expect(
      screen.getByRole("button", {
        name: /abrir el ticket 1, está vacío/i,
      }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /agregar gaseosa cola/i }));

    // Con el carrito invisible el total es lo único que confirma que lo
    // escaneado entró.
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /abrir el ticket 1 con 1 ítem por \$200\.00/i,
        }),
      ).toBeTruthy();
    });
  });

  it("el botón flotante dice qué ticket está abierto", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    // Por defecto se abre el ticket 1, y al crear un segundo el botón pasa a
    // anunciar el 2: si se quedara en el 1 mandaría al ticket equivocado.
    expect(
      screen.getByRole("button", { name: /abrir el ticket 1,/i }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /abrir un ticket nuevo/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /abrir el ticket 2, está vacío/i }),
      ).toBeTruthy();
    });
    expect(
      screen.queryByRole("button", { name: /abrir el ticket 1,/i }),
    ).toBeNull();
  });

  it("el asa del borde cierra el ticket", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    await user.click(botonAbrir()!);
    expect(salidasDeCierre().length).toBeGreaterThan(0);

    await user.click(salidasDeCierre()[0]);

    await waitFor(() => {
      expect(salidasDeCierre()).toHaveLength(0);
    });
    expect(botonAbrir()).toBeTruthy();
  });

  it("el backdrop cierra el ticket", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    await user.click(botonAbrir()!);
    // El backdrop es el segundo control: mismo nombre que el asa, pero es el
    // que cubre el catálogo.
    await user.click(salidasDeCierre()[1]);

    await waitFor(() => {
      expect(salidasDeCierre()).toHaveLength(0);
    });
  });

  it("Escape cierra el ticket", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    await user.click(botonAbrir()!);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(salidasDeCierre()).toHaveLength(0);
    });
  });

  it("al volver a escritorio el drawer se cierra solo", async () => {
    const usuario = userEvent.setup();

    // El stub tiene que soportar `change` de verdad: con un `matches` fijo el
    // test pasaría sin ejercitar nada, porque el drawer seguiría abierto.
    const suscriptores = new Set<(evento: { matches: boolean }) => void>();
    let mobile = true;
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return mobile;
      },
      media: query,
      onchange: null,
      addEventListener: (_tipo: string, fn: (evento: { matches: boolean }) => void) => {
        suscriptores.add(fn);
      },
      removeEventListener: (_tipo: string, fn: (evento: { matches: boolean }) => void) => {
        suscriptores.delete(fn);
      },
      addListener: (fn: (evento: { matches: boolean }) => void) => {
        suscriptores.add(fn);
      },
      removeListener: (fn: (evento: { matches: boolean }) => void) => {
        suscriptores.delete(fn);
      },
      dispatchEvent: () => false,
    }));

    render(<PosPage />);
    await esperarCatalogo();

    await usuario.click(botonAbrir()!);
    expect(salidasDeCierre().length).toBeGreaterThan(0);

    // Se simula lo que hace el navegador al cruzar el breakpoint: cambiar el
    // resultado y avisarle a los suscriptores.
    await act(async () => {
      mobile = false;
      for (const fn of suscriptores) fn({ matches: false });
    });

    // El drawer no existe en escritorio, así que el estado no puede quedar
    // abierto: si quedara, la próxima vez que la ventana se angosta taparía el
    // catálogo sin que nadie lo pidiera.
    expect(botonAbrir()).toBeNull();
    expect(salidasDeCierre()).toHaveLength(0);
  });

  it("abrir el ticket no toca el drawer de Ajustes", async () => {
    stubVentanaMovil();
    const user = userEvent.setup();
    render(<PosPage />);
    await esperarCatalogo();

    // El drawer de Ajustes del shell se llama casi igual que el nuestro: este
    // test existe para que volver a engancharlos salte rojo.
    await user.click(botonAbrir()!);

    expect(useUIStore.getState().isRightSidebarOpen).toBe(false);
  });
});

describe("PosPage · escaneo de código de barras", () => {
  /** Dispara el handler como lo haría el servicio al cerrar el Enter del lector. */
  async function escanear(codigo: string) {
    const handler = useScannerStore.getState()._handler;
    if (!handler) throw new Error("el POS no registró handler de escaneo");
    await act(async () => {
      handler(codigo);
    });
  }

  function ticketActivo() {
    return usePosTicketsStore.getState().tickets.find(
      (t) => t.id === usePosTicketsStore.getState().activeTicketId,
    )!;
  }

  it("registra el contexto 'sales' mientras la pantalla está libre", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    expect(useScannerStore.getState().context).toBe("sales");
  });

  it("agrega al ticket activo el producto escaneado", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    await escanear("779001");

    const items = ticketActivo().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productoId: 1, cantidad: 1, nombre: "Gaseosa Cola" });
  });

  it("repite cantidad si el producto ya estaba en el ticket", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    await escanear("779001");
    await escanear("779001");

    expect(ticketActivo().items).toHaveLength(1);
    expect(ticketActivo().items[0].cantidad).toBe(2);
  });

  it("no agrega nada si el código no existe", async () => {
    render(<PosPage />);
    await esperarCatalogo();

    await escanear("000000");

    expect(ticketActivo().items).toHaveLength(0);
  });

  it("no agrega nada si el producto está desactivado", async () => {
    const desactivado = producto({ activo: false });
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([]),
        scan: vi.fn().mockResolvedValue(desactivado),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await waitFor(() => expect(useScannerStore.getState().context).toBe("sales"));

    await escanear("779001");

    expect(ticketActivo().items).toHaveLength(0);
  });

  it("no agrega nada si el producto está sin stock", async () => {
    const sinStock = producto({ stockActual: 0, stockMinimo: 5 });
    window.electronAPI = {
      productos: {
        getAll: vi.fn().mockResolvedValue([sinStock]),
        scan: vi.fn().mockResolvedValue(sinStock),
      },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    render(<PosPage />);
    await waitFor(() => expect(useScannerStore.getState().context).toBe("sales"));

    await escanear("779001");

    expect(ticketActivo().items).toHaveLength(0);
  });

  it("el escaneo no pisa el buscador: el código no aparece en la búsqueda", async () => {
    render(<PosPage />);
    const card = await esperarCatalogo();

    await escanear("779001");

    expect(card).toBeTruthy();
    expect(screen.queryByDisplayValue("779001")).toBeNull();
  });
});

describe("PosPage · producto desactivado en el ticket", () => {
  const user = userEvent.setup();

  /**
   * Es la situación real: la línea quedó armada y después el producto se
   * desactivó en la base. La línea sobrevive (se cobra igual) pero no puede
   * seguir creciendo. Se siembra el store porque el catálogo solo muestra
   * productos activos: no hay card desde la que agregar un desactivado.
   */
  beforeEach(() => {
    window.electronAPI = {
      productos: { getAll: vi.fn().mockResolvedValue([producto({ activo: false })]) },
      categorias: { getAll: vi.fn().mockResolvedValue(categorias) },
      marcas: { getAll: vi.fn().mockResolvedValue(marcas) },
    } as unknown as Window["electronAPI"];

    usePosTicketsStore.setState({
      tickets: [
        {
          id: "t1",
          numero: 1,
          metodoPago: "efectivo",
          items: [
            {
              productoId: 1,
              nombre: "Gaseosa Cola",
              precioVenta: 200,
              costo: 100,
              cantidad: 1,
              imgPath: null,
            },
          ],
        },
      ],
      activeTicketId: "t1",
    });
  });

  function lineaActual() {
    return usePosTicketsStore.getState().tickets[0].items[0];
  }

  function botonMas() {
    return screen.getByRole("button", { name: /agregar una unidad de gaseosa cola/i });
  }

  it("el botón + queda deshabilitado para lectores de pantalla", async () => {
    render(<PosPage />);
    await waitFor(() => expect(botonMas()).toBeTruthy());

    expect(botonMas().getAttribute("aria-disabled")).toBe("true");
    expect(botonMas().getAttribute("data-bloqueado")).toBe("true");
  });

  it("el + bloqueado no tiene NINGÚN hover en sus clases", async () => {
    render(<PosPage />);
    await waitFor(() => expect(botonMas()).toBeTruthy());

    // Se chequea la clase final, no la intención: un `hover:` que se cuele por
    // el variant haría que el botón se ilumine sin hacer nada.
    const clases = botonMas().getAttribute("class") ?? "";
    expect(clases).not.toContain("hover:");
    expect(clases).toContain("cursor-default");
    expect(clases).toContain("opacity-40");
  });

  it("el motivo del bloqueo queda en el tooltip del +", async () => {
    render(<PosPage />);
    await waitFor(() => expect(botonMas()).toBeTruthy());

    // El tooltip de Tippy solo aparece on-hover; lo que se verifica aquí es que
    // el nodo que lo lleva existe y no quedó el texto por defecto.
    expect(document.body.textContent).toContain("Desactivado");
  });

  it("la línea avisa que el producto está desactivado", async () => {
    render(<PosPage />);

    await waitFor(() => expect(screen.getByText("Desactivado")).toBeTruthy());
  });

  it("el + no suma unidades aunque se lo cliquee", async () => {
    render(<PosPage />);
    await waitFor(() => expect(botonMas()).toBeTruthy());

    await user.click(botonMas());

    expect(lineaActual().cantidad).toBe(1);
  });

  it("el atajo de teclado + tampoco suma unidades", async () => {
    render(<PosPage />);
    await waitFor(() => expect(botonMas()).toBeTruthy());

    await user.keyboard("+");

    expect(lineaActual().cantidad).toBe(1);
  });

  it("igual se puede RESTAR y quitar la línea", async () => {
    render(<PosPage />);
    await waitFor(() => expect(botonMas()).toBeTruthy());

    const menos = screen.getByRole("button", { name: /quitar una unidad de gaseosa cola/i });
    expect(menos.getAttribute("aria-disabled")).toBeNull();

    await user.click(menos);

    expect(usePosTicketsStore.getState().tickets[0].items).toHaveLength(0);
  });
});
