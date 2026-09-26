import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Categoria,
  Marca,
  ProductoConLoteActivo,
} from "../../../electron/db/types";
import { PosPage } from "./PosPage";

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
    productos: { getAll: vi.fn().mockResolvedValue([producto()]) },
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
    expect(screen.getByText("Sin productos todavía")).toBeTruthy();
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
      expect(screen.getByText(/sin stock: yerba/i)).toBeTruthy();
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

    await userEvent.setup().type(
      screen.getByLabelText("Buscar producto"),
      "yerba",
    );

    await waitFor(() => {
      expect(screen.getByText("Sin stock: Yerba")).toBeTruthy();
    });
    expect(
      screen.getByText("No se puede vender desde el punto de venta."),
    ).toBeTruthy();
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
      expect(screen.getByText("Sin productos todavía")).toBeTruthy();
    });
  });
});
