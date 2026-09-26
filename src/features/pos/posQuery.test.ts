import { describe, expect, it } from "vitest";
import {
  actualizarTicketActivo,
  agregarAlTicket,
  agregarTicket,
  calcularLinea,
  cambiarCantidadTicket,
  cambiarMetodoPagoTicket,
  cerrarTicket,
  construirCategorias,
  contarBloqueados,
  crearTicket,
  puedeAbrirTicket,
  ticketActivo,
  aplicarValorVista,
  aplicarVistaCatalogo,
  etiquetaVista,
  valorVistaActiva,
  MAX_TICKETS,
  OPCIONES_ORDEN,
  OPCIONES_VISTA,
  type OrdenCatalogo,
  cantidadAvisos,
  derivarEstadoStock,
  descripcionAviso,
  esVendible,
  esVencido,
  estaPorVencer,
  filtrarCatalogoPOS,
  formatearMoneda,
  mapearProductosPOS,
  precioUnitarioPorCantidad,
  quitarDelTicket,
  redondearMoneda,
  resumirTicket,
  separarPorDisponibilidad,
  tipoTarifaPorCantidad,
  tieneStockBajo,
  type ItemTicket,
  type TicketSession,
} from "./posQuery";
import type {
  Categoria,
  Marca,
  ProductoConLoteActivo,
} from "../../../electron/db/types";

const categorias: Categoria[] = [
  { id: 1, nombre: "Bebidas", activo: true },
  { id: 2, nombre: "Almacén", activo: true },
  { id: 3, nombre: "Inactiva", activo: false },
];

const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));

const marcas: Marca[] = [
  { id: 1, nombre: "Coca-Cola", activo: true },
  { id: 2, nombre: "Lorenz", activo: true },
];

const marcasPorId = new Map(marcas.map((m) => [m.id, m]));

function parsearFecha(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function crudo(
  partial: Partial<ProductoConLoteActivo> = {},
): ProductoConLoteActivo {
  return {
    id: 1,
    categoriaId: 1,
    marcaId: null,
    nombre: "Gaseosa 500ml",
    codigoInterno: "111",
    codigosBarras: "779001,779002",
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
    creadoEn: parsearFecha(10),
    actualizadoEn: null,
    loteActivoVencimiento: null,
    ...partial,
  };
}

function productoPOS(
  partial: Partial<ProductoConLoteActivo> = {},
  conMarcas = marcasPorId,
) {
  return mapearProductosPOS([crudo(partial)], categoriasPorId, conMarcas)[0];
}

describe("derivarEstadoStock", () => {
  it("marca disponible cuando el stock cubre el mínimo", () => {
    expect(derivarEstadoStock(10, 5, false)).toBe("disponible");
  });

  it("marca stock bajo solo si hay unidades y no llega al mínimo", () => {
    expect(derivarEstadoStock(2, 5, false)).toBe("bajo");
    expect(derivarEstadoStock(0, 5, false)).toBe("agotado");
  });

  it("prioriza vencido por sobre el estado de stock", () => {
    expect(derivarEstadoStock(10, 5, true)).toBe("vencido");
    expect(derivarEstadoStock(0, 5, true)).toBe("vencido");
  });
});

describe("esVencido", () => {
  it("detecta el lote vencido y descarta los futuros", () => {
    expect(esVencido(parsearFecha(1))).toBe(true);
    expect(esVencido(parsearFecha(-10))).toBe(false);
    expect(esVencido(null)).toBe(false);
  });
});

describe("mapearProductosPOS", () => {
  it("resuelve la categoría y tokeniza los códigos de barras", () => {
    const producto = productoPOS();
    expect(producto.categoria).toBe("Bebidas");
    expect(producto._codigosBarras).toEqual(["779001", "779002"]);
  });
});

describe("esVendible", () => {
  it("permite vender disponible y stock bajo, pero no agotado ni vencido", () => {
    expect(esVendible(productoPOS({ id: 1, stockActual: 10 }))).toBe(true);
    expect(esVendible(productoPOS({ id: 2, stockActual: 2, stockMinimo: 5 }))).toBe(
      true,
    );
    expect(esVendible(productoPOS({ id: 3, stockActual: 0 }))).toBe(false);
    expect(
      esVendible(
        productoPOS({ id: 4, loteActivoVencimiento: parsearFecha(1) }),
      ),
    ).toBe(false);
  });
});

describe("separarPorDisponibilidad", () => {
  const catalogo = mapearProductosPOS(
    [
      crudo({ id: 1, nombre: "Gaseosa Cola" }),
      crudo({ id: 2, nombre: "Agua Mineral", stockActual: 0 }),
      crudo({
        id: 3,
        nombre: "Yerba",
        stockActual: 8,
        loteActivoVencimiento: parsearFecha(2),
      }),
      crudo({ id: 4, nombre: "Azucar", stockActual: 2, stockMinimo: 5 }),
    ],
    categoriasPorId,
  );

  it("deja arriba los productos con stock y no vencidos", () => {
    const { vendibles, noVendibles } = separarPorDisponibilidad(catalogo);
    expect(vendibles.map((p) => p.nombre)).toEqual(["Gaseosa Cola", "Azucar"]);
    expect(noVendibles.map((p) => p.nombre)).toEqual(["Agua Mineral", "Yerba"]);
  });

  it("deja vacio el grupo no vendible cuando todo esta disponible", () => {
    const { vendibles, noVendibles } = separarPorDisponibilidad([
      productoPOS({ id: 9, nombre: "Unico" }),
    ]);
    expect(vendibles).toHaveLength(1);
    expect(noVendibles).toHaveLength(0);
  });
});

describe("contarBloqueados", () => {
  it("cuenta agotados y vencidos por separado", () => {
    const catalogo = mapearProductosPOS(
      [
        crudo({ id: 1, nombre: "Gaseosa" }),
        crudo({ id: 2, nombre: "Agua", stockActual: 0 }),
        crudo({ id: 3, nombre: "Papel", stockActual: 0 }),
        crudo({
          id: 4,
          nombre: "Yerba",
          loteActivoVencimiento: parsearFecha(2),
        }),
        crudo({ id: 5, nombre: "Azucar", stockActual: 2, stockMinimo: 5 }),
      ],
      categoriasPorId,
    );

    expect(contarBloqueados(catalogo)).toEqual({ agotados: 2, vencidos: 1 });
  });

  it("devuelve ceros cuando no hay nada bloqueado", () => {
    expect(contarBloqueados([])).toEqual({ agotados: 0, vencidos: 0 });
    expect(
      contarBloqueados([
        productoPOS({ id: 1, stockActual: 10 }),
        productoPOS({ id: 2, stockActual: 2, stockMinimo: 5 }),
      ]),
    ).toEqual({ agotados: 0, vencidos: 0 });
  });
});

describe("filtrarCatalogoPOS", () => {
  const catalogo = mapearProductosPOS(
    [
      crudo({ id: 1, nombre: "Gaseosa Cola", codigoInterno: "111" }),
      crudo({
        id: 2,
        nombre: "Agua Mineral",
        categoriaId: 2,
        codigoInterno: "222",
        codigosBarras: "779003",
      }),
    ],
    categoriasPorId,
  );

  it("busca por nombre ignorando mayúsculas y acentos", () => {
    expect(filtrarCatalogoPOS(catalogo, "gaseosa", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(catalogo, "COLA", "all")).toHaveLength(1);
  });

  it("busca por código de barras con coincidencia exacta de token", () => {
    expect(filtrarCatalogoPOS(catalogo, "779002", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(catalogo, "779", "all")).toHaveLength(0);
  });

  it("busca por marca y por variante con coincidencia parcial", () => {
    const conMarca = mapearProductosPOS(
      [crudo({ id: 1, marcaId: 1, variante: "500 ml" })],
      categoriasPorId,
      marcasPorId,
    );
    expect(filtrarCatalogoPOS(conMarca, "coca", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(conMarca, "COLA", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(conMarca, "500", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(conMarca, "ml", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(conMarca, "lorenz", "all")).toHaveLength(0);
  });

  it("resuelve la marca por id y tolera productos sin marca", () => {
    const conMarca = productoPOS({ marcaId: 2 });
    expect(conMarca.marca).toBe("Lorenz");

    const sinMarca = productoPOS({ marcaId: null });
    expect(sinMarca.marca).toBe("");
    expect(sinMarca._marcaN).toBe("");
    expect(filtrarCatalogoPOS([sinMarca], "coca", "all")).toHaveLength(0);
  });

  it("no rompe la búsqueda si el mapper recibe marcasPorId vacío", () => {
    const sinMarcas = mapearProductosPOS(
      [crudo({ id: 1, marcaId: 1 })],
      categoriasPorId,
    );
    expect(sinMarcas[0].marca).toBe("");
    expect(filtrarCatalogoPOS(sinMarcas, "coca", "all")).toHaveLength(0);
  });

  it("mantiene coincidencia exacta en el código interno con marca y variante presentes", () => {
    const conMarca = mapearProductosPOS(
      [crudo({ id: 1, marcaId: 1, variante: "500 ml" })],
      categoriasPorId,
      marcasPorId,
    );
    expect(filtrarCatalogoPOS(conMarca, "111", "all")).toHaveLength(1);
    expect(filtrarCatalogoPOS(conMarca, "11", "all")).toHaveLength(0);
  });

  it("filtra por categoría y combina con la búsqueda", () => {
    expect(filtrarCatalogoPOS(catalogo, "", "2")).toHaveLength(1);
    expect(filtrarCatalogoPOS(catalogo, "gaseosa", "2")).toHaveLength(0);
  });
});

describe("avisos de card (por vencer / stock bajo)", () => {
  function enDias(dias: number): string {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${dd}/${mm}/${d.getFullYear()}`
  }

  it("no marca producto en estado normal", () => {
    const p = productoPOS({ stockActual: 10, stockMinimo: 5 });

    expect(estaPorVencer(p)).toBe(false);
    expect(tieneStockBajo(p)).toBe(false);
    expect(descripcionAviso(p)).toBe("");
  });

  it("marca por vencer dentro del umbral de 14 días", () => {
    const p = productoPOS({ loteActivoVencimiento: enDias(3) });

    expect(p.diasParaVencer).toBe(3);
    expect(estaPorVencer(p)).toBe(true);
    expect(descripcionAviso(p)).toContain("Vence en 3 días");
  });

  it("no marca por vencer fuera del umbral", () => {
    const p = productoPOS({ loteActivoVencimiento: enDias(15) });

    expect(estaPorVencer(p)).toBe(false);
    expect(descripcionAviso(p)).toBe("");
  });

  it("usa singular para el día previo", () => {
    expect(descripcionAviso(productoPOS({ loteActivoVencimiento: enDias(1) }))).toMatch(
      /^Vence mañana \(\d{2}\/\d{2}\/\d{4}\)$/,
    );
  });

  it("no marca por vencer lo que ya venció ni lo que vence hoy", () => {
    expect(estaPorVencer(productoPOS({ loteActivoVencimiento: enDias(0) }))).toBe(false);
    expect(estaPorVencer(productoPOS({ loteActivoVencimiento: enDias(-3) }))).toBe(false);
  });

  it("marca stock bajo con el conteo en el texto", () => {
    const p = productoPOS({ stockActual: 2, stockMinimo: 5 });

    expect(tieneStockBajo(p)).toBe(true);
    expect(descripcionAviso(p)).toBe("Stock bajo: 2 de mínimo 5");
  });

  it("informa las dos condiciones juntas cuando se cumplen", () => {
    const p = productoPOS({
      stockActual: 2,
      stockMinimo: 5,
      loteActivoVencimiento: enDias(3),
    });

    expect(cantidadAvisos(p)).toBe(2);
    expect(descripcionAviso(p)).toMatch(
      /^Vence en 3 días \(\d{2}\/\d{2}\/\d{4}\) · Stock bajo: 2 de mínimo 5$/,
    );
  });

  it("cuenta un solo aviso cuando corresponde", () => {
    expect(cantidadAvisos(productoPOS({ stockActual: 10, stockMinimo: 5 }))).toBe(0);
    expect(cantidadAvisos(productoPOS({ stockActual: 1, stockMinimo: 5 }))).toBe(1);
    expect(
      cantidadAvisos(productoPOS({ loteActivoVencimiento: enDias(2) })),
    ).toBe(1);
  });
});

describe("aplicarVistaCatalogo", () => {
  function enDias(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  const catalogo = [
    productoPOS({ id: 1, nombre: "Zapato", stockActual: 10, stockMinimo: 5, creadoEn: "2026-01-01" }),
    productoPOS({ id: 2, nombre: "Arroz", stockActual: 2, stockMinimo: 5, creadoEn: "2026-03-01" }),
    productoPOS({ id: 3, nombre: "Miel", creadoEn: "2026-02-01", loteActivoVencimiento: enDias(3) }),
    productoPOS({
      id: 4,
      nombre: "Pan",
      stockActual: 1,
      stockMinimo: 5,
      creadoEn: "2026-04-01",
      loteActivoVencimiento: enDias(3),
    }),
  ];

  describe("orden", () => {
    it("'nuevos' deja el más reciente primero", () => {
      const r = aplicarVistaCatalogo(catalogo, { orden: "nuevos", filtro: "all" });
      expect(r.map((p) => p.id)).toEqual([4, 2, 3, 1]);
    });

    it("'antiguos' invierte el criterio", () => {
      const r = aplicarVistaCatalogo(catalogo, { orden: "antiguos", filtro: "all" });
      expect(r.map((p) => p.id)).toEqual([1, 3, 2, 4]);
    });

    it("'alfabetico' ordena de A a Z y su inverso de Z a A", () => {
      expect(
        aplicarVistaCatalogo(catalogo, { orden: "alfabetico", filtro: "all" }).map((p) => p.nombre),
      ).toEqual(["Arroz", "Miel", "Pan", "Zapato"]);
      expect(
        aplicarVistaCatalogo(catalogo, { orden: "alfabetico_desc", filtro: "all" }).map((p) => p.nombre),
      ).toEqual(["Zapato", "Pan", "Miel", "Arroz"]);
    });

    it("ordena por precio en ambos sentidos", () => {
      const conPrecio = [
        productoPOS({ id: 1, precioVenta: 500 }),
        productoPOS({ id: 2, precioVenta: 100 }),
        productoPOS({ id: 3, precioVenta: 900 }),
      ];
      expect(
        aplicarVistaCatalogo(conPrecio, { orden: "precio_asc", filtro: "all" }).map((p) => p.precio),
      ).toEqual([100, 500, 900]);
      expect(
        aplicarVistaCatalogo(conPrecio, { orden: "precio_desc", filtro: "all" }).map((p) => p.precio),
      ).toEqual([900, 500, 100]);
    });

    it("no muta el array original", () => {
      const original = [...catalogo];
      aplicarVistaCatalogo(catalogo, { orden: "antiguos", filtro: "all" });
      expect(catalogo).toEqual(original);
    });
  });

  describe("filtro", () => {
    it("'all' no descarta nada", () => {
      expect(aplicarVistaCatalogo(catalogo, { orden: "nuevos", filtro: "all" })).toHaveLength(4);
    });

    it("filtra por stock bajo", () => {
      const r = aplicarVistaCatalogo(catalogo, { orden: "nuevos", filtro: "bajo" });
      expect(r.map((p) => p.id)).toEqual([4, 2]);
    });

    it("filtra por por vencer", () => {
      const r = aplicarVistaCatalogo(catalogo, { orden: "nuevos", filtro: "por_vencer" });
      expect(r.map((p) => p.id)).toEqual([4, 3]);
    });

    it("filtra por cualquier aviso, sin duplicar los que tienen los dos", () => {
      // Filtrados son 4 (2026-04), 3 (2026-02) y 2 (2026-03); por 'nuevos'
      // reordena a 4, 2, 3.
      const r = aplicarVistaCatalogo(catalogo, { orden: "nuevos", filtro: "con_avisos" });
      expect(r.map((p) => p.id)).toEqual([4, 2, 3]);
    });

    it("el filtro y el orden se combinan sin pisarse", () => {
      const r = aplicarVistaCatalogo(catalogo, { orden: "alfabetico", filtro: "por_vencer" });
      expect(r.map((p) => p.nombre)).toEqual(["Miel", "Pan"]);
    });
  });
});

describe("aplicarValorVista", () => {
  it("elegir un filtro conserva el orden actual", () => {
    const v = aplicarValorVista({ orden: "alfabetico", filtro: "all" }, "filtro:bajo");
    expect(v).toEqual({ orden: "alfabetico", filtro: "bajo" });
  });

  it("elegir un orden conserva el filtro actual", () => {
    const v = aplicarValorVista({ orden: "nuevos", filtro: "por_vencer" }, "orden:precio_asc");
    expect(v).toEqual({ orden: "precio_asc", filtro: "por_vencer" });
  });

  it("ignora valores desconocidos en vez de corromper el estado", () => {
    const base = { orden: "nuevos", filtro: "all" } as const;
    expect(aplicarValorVista(base, "orden:inventado")).toEqual(base);
    expect(aplicarValorVista(base, "basura")).toEqual(base);
  });
});

describe("etiquetaVista y valorVistaActiva", () => {
  it("con filtro por defecto muestra solo el orden", () => {
    expect(etiquetaVista({ orden: "antiguos", filtro: "all" })).toBe("Más antiguos primero");
  });

  it("con filtro y orden no por defecto muestra ambos", () => {
    expect(etiquetaVista({ orden: "alfabetico", filtro: "por_vencer" })).toBe(
      "Solo por vencer · Alfabético: A a Z",
    );
  });

  it("con filtro y orden por defecto muestra solo el filtro", () => {
    expect(etiquetaVista({ orden: "nuevos", filtro: "bajo" })).toBe("Solo con stock bajo");
  });

  it("marca la opción del filtro cuando hay filtro activo", () => {
    expect(valorVistaActiva({ orden: "nuevos", filtro: "bajo" })).toBe("filtro:bajo");
  });

  it("marca la opción del orden cuando no hay filtro", () => {
    expect(valorVistaActiva({ orden: "alfabetico", filtro: "all" })).toBe("orden:alfabetico");
  });
});

describe("OPCIONES_VISTA", () => {
  it("expone los seis órdenes y los tres filtros, sin repetir el 'todos'", () => {
    expect(OPCIONES_VISTA.map((o) => o.value)).toEqual([
      "orden:nuevos",
      "orden:antiguos",
      "orden:alfabetico",
      "orden:alfabetico_desc",
      "orden:precio_asc",
      "orden:precio_desc",
      "filtro:bajo",
      "filtro:por_vencer",
      "filtro:con_avisos",
    ]);
  });

  it("todo criterio ordenable tiene también su inverso", () => {
    const pares: [OrdenCatalogo, OrdenCatalogo][] = [
      ["nuevos", "antiguos"],
      ["alfabetico", "alfabetico_desc"],
      ["precio_asc", "precio_desc"],
    ];
    for (const [a, b] of pares) {
      expect(OPCIONES_ORDEN.some((o) => o.value === a)).toBe(true);
      expect(OPCIONES_ORDEN.some((o) => o.value === b)).toBe(true);
    }
  });

  it("ninguna etiqueta se repite, para que getByRole no sea ambiguo", () => {
    const labels = OPCIONES_VISTA.map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("construirCategorias", () => {
  it("solo muestra categorías activas con productos y su conteo", () => {
    const catalogo = mapearProductosPOS(
      [crudo({ id: 1 }), crudo({ id: 2, categoriaId: 2 })],
      categoriasPorId,
    );
    const resultado = construirCategorias(catalogo, categorias);

    expect(resultado).toEqual([
      { id: 1, nombre: "Bebidas", conteo: 1 },
      { id: 2, nombre: "Almacén", conteo: 1 },
    ]);
  });

  it("cuenta solo los vendibles de la categoría", () => {
    const catalogo = mapearProductosPOS(
      [
        crudo({ id: 1 }),
        crudo({ id: 2, stockActual: 0 }),
        crudo({ id: 3, loteActivoVencimiento: parsearFecha(1) }),
        crudo({ id: 4, stockActual: 3, stockMinimo: 5 }),
        crudo({ id: 5, categoriaId: 2 }),
      ],
      categoriasPorId,
    );

    const resultado = construirCategorias(
      catalogo.filter(esVendible),
      categorias,
    );

    expect(resultado).toEqual([
      { id: 1, nombre: "Bebidas", conteo: 2 },
      { id: 2, nombre: "Almacén", conteo: 1 },
    ]);
  });

  it("conserva la categoría seleccionada aunque se quede en cero", () => {
    const catalogo = mapearProductosPOS([crudo({ id: 1 })], categoriasPorId);

    expect(construirCategorias(catalogo, categorias, "2")).toEqual([
      { id: 1, nombre: "Bebidas", conteo: 1 },
      { id: 2, nombre: "Almacén", conteo: 0 },
    ]);
  });
});

describe("precioUnitarioPorCantidad", () => {
  it("aplica el 10% de descuento desde 3 unidades", () => {
    expect(tipoTarifaPorCantidad(2)).toBe("minorista");
    expect(tipoTarifaPorCantidad(3)).toBe("mayoreo");
    expect(precioUnitarioPorCantidad(200, 2)).toBe(200);
    expect(precioUnitarioPorCantidad(200, 3)).toBe(180);
  });

  it("evita el error de coma flotante en el precio unitario", () => {
    expect(precioUnitarioPorCantidad(2000, 4)).toBe(1800);
    expect(redondearMoneda(1800.0000000000002)).toBe(1800);
  });
});

describe("operaciones del ticket", () => {
  const producto = productoPOS();

  it("agrega un ítem nuevo al ticket", () => {
    const items = agregarAlTicket([], producto);
    expect(items).toHaveLength(1);
    expect(items[0].cantidad).toBe(1);
  });

  it("acumula cantidad si el producto ya está en el ticket", () => {
    const items = agregarAlTicket(agregarAlTicket([], producto), producto);
    expect(items).toHaveLength(1);
    expect(items[0].cantidad).toBe(2);
  });

  describe("orden: más nuevo agregado primero", () => {
    it("cada línea nueva entra al frente", () => {
      const a = productoPOS({ id: 1, nombre: "A" });
      const b = productoPOS({ id: 2, nombre: "B" });
      const c = productoPOS({ id: 3, nombre: "C" });

      const items = agregarAlTicket(agregarAlTicket(agregarAlTicket([], a), b), c);
      expect(items.map((i) => i.nombre)).toEqual(["C", "B", "A"]);
    });

    it("incrementar NO reordena: la línea conserva su lugar", () => {
      // Si se moviera, agregar una segunda unidad saltaría la fila al frente y
      // el cajero perdería de vista qué acaba de pasar.
      const a = productoPOS({ id: 1, nombre: "A" });
      const b = productoPOS({ id: 2, nombre: "B" });

      const items = agregarAlTicket(agregarAlTicket([], a), b);
      expect(items.map((i) => i.nombre)).toEqual(["B", "A"]);

      const tras = agregarAlTicket(items, a);
      expect(tras.map((i) => i.nombre)).toEqual(["B", "A"]);
      expect(tras[1].cantidad).toBe(2);
    });

    it("el orden no depende del reloj: dos altas seguidas no empatan", () => {
      // Con un timestamp (Date.now()) dos altas en el mismo tick empatan y el
      // orden queda al azar del motor. Con unshift es determinista siempre.
      const varios = Array.from({ length: 6 }, (_, i) =>
        productoPOS({ id: i + 1, nombre: `P${i + 1}` }),
      );
      const items = varios.reduce(
        (acc, prod) => agregarAlTicket(acc, prod),
        [] as ReturnType<typeof agregarAlTicket>,
      );
      expect(items.map((i) => i.nombre)).toEqual([
        "P6",
        "P5",
        "P4",
        "P3",
        "P2",
        "P1",
      ]);
    });
  });

  it("lleva la imagen del producto al ítem del ticket", () => {
    const conFoto = productoPOS({ id: 30, imgPath: "productos/gaseosa.png" });
    const sinFoto = productoPOS({ id: 31, imgPath: null });

    expect(agregarAlTicket([], conFoto)[0].imgPath).toBe(
      "productos/gaseosa.png",
    );
    expect(agregarAlTicket([], sinFoto)[0].imgPath).toBeNull();
  });

  it("cambia la cantidad y quita el ítem al llegar a cero", () => {
    const items = agregarAlTicket([], producto);
    expect(cambiarCantidadTicket(items, producto.id, 4)[0].cantidad).toBe(4);
    expect(cambiarCantidadTicket(items, producto.id, 0)).toHaveLength(0);
  });

  it("quita un ítem puntual", () => {
    const items = agregarAlTicket([], producto);
    expect(quitarDelTicket(items, producto.id)).toHaveLength(0);
  });

  it("rechaza agregar un producto agotado o vencido", () => {
    const agotado = productoPOS({ id: 20, nombre: "Sin stock", stockActual: 0 });
    const vencido = productoPOS({
      id: 21,
      nombre: "Vencido",
      loteActivoVencimiento: parsearFecha(1),
    });

    expect(agregarAlTicket([], agotado)).toHaveLength(0);
    expect(agregarAlTicket([], vencido)).toHaveLength(0);
  });

  it("no puede acumular unidades de un producto que se agota", () => {
    const items = agregarAlTicket([], producto);
    const agotado = productoPOS({
      id: producto.id,
      nombre: producto.nombre,
      stockActual: 0,
    });

    expect(agregarAlTicket(items, agotado)).toHaveLength(1);
    expect(agregarAlTicket(items, agotado)[0].cantidad).toBe(1);
  });
});

describe("calcularLinea", () => {
  const base: ItemTicket = {
    productoId: 1,
    nombre: "Gaseosa",
    precioVenta: 200,
    costo: 100,
    cantidad: 1,
    imgPath: null,
  };

  it("en minorista el importe es el precio de venta", () => {
    const linea = calcularLinea(base);
    expect(linea.tipoTarifa).toBe("minorista");
    expect(linea.precioUnitario).toBe(200);
    expect(linea.importe).toBe(200);
    expect(linea.ahorro).toBe(0);
  });

  it("en mayoreo registra el ahorro sobre el precio minorista", () => {
    const linea = calcularLinea({ ...base, cantidad: 3 });
    expect(linea.tipoTarifa).toBe("mayoreo");
    expect(linea.precioUnitario).toBe(180);
    expect(linea.importeMinorista).toBe(600);
    expect(linea.importe).toBe(540);
    expect(linea.ahorro).toBe(60);
  });
});

describe("resumirTicket", () => {
  it("devuelve ceros con el ticket vacío", () => {
    const resumen = resumirTicket([]);
    expect(resumen.unidades).toBe(0);
    expect(resumen.subtotal).toBe(0);
    expect(resumen.total).toBe(0);
    expect(resumen.descuento).toBe(0);
  });

  it("acumula unidades, descuento y total sin IVA", () => {
    const items: ItemTicket[] = [
      {
        productoId: 1,
        nombre: "Gaseosa",
        precioVenta: 200,
        costo: 100,
        cantidad: 3,
        imgPath: null,
      },
      {
        productoId: 2,
        nombre: "Agua",
        precioVenta: 100,
        costo: 50,
        cantidad: 1,
        imgPath: null,
      },
    ];
    const resumen = resumirTicket(items);

    expect(resumen.unidades).toBe(4);
    expect(resumen.subtotal).toBe(700);
    expect(resumen.descuento).toBe(60);
    expect(resumen.impuesto).toBe(0);
    expect(resumen.total).toBe(640);
  });
});

describe("formatearMoneda", () => {
  it("muestra el signo peso y dos decimales", () => {
    expect(formatearMoneda(0)).toBe("$0.00");
    expect(formatearMoneda(1234.5)).toBe("$1234.50");
  });
});

describe("sesiones de ticket", () => {
  const producto = productoPOS();

  function sesiones(n: number): TicketSession[] {
    return Array.from({ length: n }, (_, i) => crearTicket(`t${i + 1}`, i + 1));
  }

  function conItems(id: string, numero: number, cantidad: number): TicketSession {
    return {
      ...crearTicket(id, numero),
      items: Array.from({ length: cantidad }, (_, i) => ({
        productoId: i + 1,
        nombre: `Producto ${i + 1}`,
        precioVenta: 1000,
        costo: 700,
        cantidad: 1,
        imgPath: null,
      })),
    };
  }

  describe("crearTicket", () => {
    it("arranca vacío y en efectivo", () => {
      const ticket = crearTicket("t1", 1);
      expect(ticket.items).toEqual([]);
      expect(ticket.metodoPago).toBe("efectivo");
    });
  });

  describe("agregarTicket y puedeAbrirTicket", () => {
    it("agrega al final y numera por posición", () => {
      const tickets = agregarTicket(sesiones(2), "t3");
      expect(tickets).toHaveLength(3);
      expect(tickets[2].id).toBe("t3");
      expect(tickets[2].numero).toBe(3);
    });

    it("deja cinco tickets y frena el sexto", () => {
      let tickets = sesiones(MAX_TICKETS);
      expect(puedeAbrirTicket(tickets)).toBe(false);

      tickets = agregarTicket(tickets, "t6");
      expect(tickets).toHaveLength(MAX_TICKETS);
      // El que se pasó no se agrega: la pestaña nueva ni siquiera debería
      // aparecer en el listado.
      expect(tickets.some((t) => t.id === "t6")).toBe(false);
    });

    it("permite abrir de nuevo después de cerrar una", () => {
      expect(puedeAbrirTicket(sesiones(MAX_TICKETS - 1))).toBe(true);
    });
  });

  describe("actualizarTicketActivo", () => {
    it("solo toca la sesión indicada y deja las otras con la misma referencia", () => {
      const tickets = [conItems("t1", 1, 1), conItems("t2", 2, 2)];
      const resultado = actualizarTicketActivo(tickets, "t2", (items) =>
        agregarAlTicket(items, producto),
      );

      // t1 no se toca: misma referencia y mismos items.
      expect(resultado[0]).toBe(tickets[0]);
      expect(resultado[0].items).toHaveLength(1);
      expect(resultado[0].items[0].cantidad).toBe(1);

      // `producto` es el id 1 y `conItems` ya lo dejó en t2, así que
      // `agregarAlTicket` acumula sobre esa línea en vez de abrir una nueva.
      // Lo que se verifica es que la mutación cayó en t2: si se aplicara al
      // primer ticket del arreglo, el cantidad de t1 sería 2.
      expect(resultado[1].items).toHaveLength(2);
      expect(resultado[1].items.find((i) => i.productoId === 1)?.cantidad).toBe(2);
    });

    it("no hace nada si el id no existe", () => {
      const tickets = sesiones(2);
      const resultado = actualizarTicketActivo(tickets, "nope", () => [
        { productoId: 9, nombre: "X", precioVenta: 1, costo: 1, cantidad: 1, imgPath: null },
      ]);
      expect(resultado).toEqual(tickets);
    });
  });

  describe("cambiarMetodoPagoTicket", () => {
    it("el método de pago es por sesión, no global", () => {
      const tickets = sesiones(2);
      const resultado = cambiarMetodoPagoTicket(tickets, "t2", "transferencia");
      expect(resultado[0].metodoPago).toBe("efectivo");
      expect(resultado[1].metodoPago).toBe("transferencia");
    });
  });

  describe("cerrarTicket", () => {
    it("al cerrar el último abre uno nuevo en blanco, número 1", () => {
      const resultado = cerrarTicket(sesiones(1), "t1", "t1", "t2");
      expect(resultado.tickets).toHaveLength(1);
      expect(resultado.tickets[0].id).toBe("t2");
      expect(resultado.tickets[0].numero).toBe(1);
      expect(resultado.tickets[0].items).toEqual([]);
      expect(resultado.activeTicketId).toBe("t2");
    });

    it("al cerrar el activo cae en el contiguo anterior", () => {
      const resultado = cerrarTicket(sesiones(3), "t3", "t3", "t4");
      expect(resultado.tickets.map((t) => t.id)).toEqual(["t1", "t2"]);
      expect(resultado.activeTicketId).toBe("t2");
    });

    it("al cerrar el primero de varios cae en el que le sigue", () => {
      const resultado = cerrarTicket(sesiones(3), "t1", "t1", "t4");
      expect(resultado.tickets.map((t) => t.id)).toEqual(["t2", "t3"]);
      expect(resultado.activeTicketId).toBe("t2");
    });

    it("al cerrar el del medio renumera para que no quede hueco", () => {
      const resultado = cerrarTicket(sesiones(3), "t2", "t2", "t4");
      expect(resultado.tickets.map((t) => t.numero)).toEqual([1, 2]);
      // El tercero pasó de 3 a 2: un hueco del tipo "Ticket 1, Ticket 3" se lee
      // como un bug.
      expect(resultado.activeTicketId).toBe("t1");
    });

    it("cerrar uno que no es el activo no mueve la vista", () => {
      const resultado = cerrarTicket(sesiones(3), "t2", "t3", "t4");
      expect(resultado.tickets.map((t) => t.id)).toEqual(["t1", "t3"]);
      expect(resultado.activeTicketId).toBe("t3");
    });

    it("conserva el contenido de los tickets que quedan", () => {
      const tickets = [conItems("t1", 1, 2), conItems("t2", 2, 1)];
      const resultado = cerrarTicket(tickets, "t1", "t1", "t3");
      expect(resultado.tickets[0].items).toHaveLength(1);
    });
  });

  describe("ticketActivo", () => {
    it("devuelve la sesión pedida", () => {
      const tickets = sesiones(2);
      expect(ticketActivo(tickets, "t2").id).toBe("t2");
    });

    it("cae en la primera si el id no existe, sin romper", () => {
      const tickets = sesiones(2);
      expect(ticketActivo(tickets, "nope").id).toBe("t1");
    });

    it("degrada a un ticket vacío en vez de devolver undefined", () => {
      expect(ticketActivo([], "t1").items).toEqual([]);
    });
  });
});
