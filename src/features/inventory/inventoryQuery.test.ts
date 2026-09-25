import { describe, expect, it } from "vitest";
import {
  coincideBusqueda,
  filtrarProductos,
  mapearProducto,
  normalizar,
  ordenarProductos,
  type OrdenInventario,
  type ProductoInventario,
} from "./inventoryQuery";
import type {
  Categoria,
  Marca,
  ProductoConLoteActivo,
} from "../../../electron/db/types";

const categorias: Categoria[] = [
  { id: 1, nombre: "Bebidas", activo: true },
  { id: 2, nombre: "Almacén", activo: true },
];

const marcas: Marca[] = [
  { id: 1, nombre: "Coca-Cola", activo: true },
  { id: 2, nombre: "Bagley", activo: true },
];

const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
const marcasPorId = new Map(marcas.map((m) => [m.id, m]));

function parsearFecha(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function crudo(partial: Partial<ProductoConLoteActivo> = {}): ProductoConLoteActivo {
  return {
    id: 1,
    categoriaId: 1,
    marcaId: 1,
    nombre: "Café Árabe 500g",
    codigoInterno: "001",
    codigosBarras: "779001,779002",
    variante: "Tostado",
    tipoVenta: "unidad",
    unidadMedida: "g",
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

function mapear(partial: Partial<ProductoConLoteActivo> = {}): ProductoInventario {
  return mapearProducto(crudo(partial), categoriasPorId, marcasPorId);
}

describe("mapearProducto", () => {
  it("resuelve marca y categoría desde los Maps y precomputa campos normalizados", () => {
    const p = mapear();
    expect(p.brand).toBe("Coca-Cola");
    expect(p.category).toBe("Bebidas");
    expect(p._nameN).toBe("cafe arabe 500g");
    expect(p._brandN).toBe("coca-cola");
    expect(p._variantN).toBe("tostado");
    expect(p._codigoInternoN).toBe("001");
    expect(p._codigosBarrasN).toBe("779001,779002");
  });

  it("no resuelve marca/categoría si las id no existen en los Maps", () => {
    const p = mapear({ marcaId: 999, categoriaId: null });
    expect(p.brand).toBe("");
    expect(p.category).toBe("");
  });
});

describe("filtrarProductos", () => {
  const catalogo = [
    mapear({ id: 1, nombre: "Café Árabe", variante: "Tostado", codigoInterno: "001", codigosBarras: "779001" }),
    mapear({ id: 2, nombre: "Coca Cola 2L", marcaId: 1, variante: null, codigoInterno: "002", codigosBarras: "779002" }),
    mapear({ id: 3, nombre: "Galletitas", marcaId: 2, categoriaId: 2, variante: null, codigoInterno: "003", codigosBarras: "779003" }),
    mapear({
      id: 4,
      nombre: "Cloro", categoriaId: 2, stockActual: 0, stockMinimo: 3,
      variante: null, codigoInterno: "004", codigosBarras: "779004",
    }),
    mapear({
      id: 5,
      nombre: "Yogur", categoriaId: 1, loteActivoVencimiento: parsearFecha(60),
      variante: null, codigoInterno: "005", codigosBarras: "779005",
    }),
  ];

  it("termino vacío devuelve todo (sin categoría ni kpi)", () => {
    const resultados = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "all",
      kpi: "all",
    });
    expect(resultados.map((p) => p.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("coincide por nombre, marca, variante y código (insensible a mayúsculas y acentos)", () => {
    const casos: [string, number[]][] = [
      ["cafe", [1]],
      ["CAFÉ", [1]],           // normaliza mayúsculas
      ["cafe ara", [1]],       // todo el nombre
      ["bagley", [3]],         // marca
      ["tostado", [1]],        // variante
      ["001", [1]],            // código interno
      ["779001", [1]],         // código de barras
["2l", [2]],             // substring de nombre con número
    ];
    for (const [termino, esperados] of casos) {
      const resultados = filtrarProductos(catalogo, {
        termino,
        categoriaId: "all",
        kpi: "all",
      });
      expect(resultados.map((p) => p.id)).toEqual(esperados);
    }
  });

  it("filtra por categoría usando su id", () => {
    const bebidas = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "1",
      kpi: "all",
    });
    expect(bebidas.map((p) => p.id)).toEqual([1, 2, 5]);

    const almacen = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "2",
      kpi: "all",
    });
    expect(almacen.map((p) => p.id)).toEqual([3, 4]);
  });

  it("combina texto + categoría + kpi", () => {
    const sinStockAlmacen = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "2",
      kpi: "out_of_stock",
    });
    expect(sinStockAlmacen.map((p) => p.id)).toEqual([4]);
  });

  it("filtra por kpis", () => {
    const agotados = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "all",
      kpi: "out_of_stock",
    });
    expect(agotados.map((p) => p.id)).toEqual([4]);

    const vencidos = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "all",
      kpi: "expired",
    });
    expect(vencidos.map((p) => p.id)).toEqual([5]);

    const porVencer = filtrarProductos(catalogo, {
      termino: "",
      categoriaId: "all",
      kpi: "expiring_soon",
    });
    expect(porVencer.map((p) => p.id)).toEqual([]);
  });

  it("coincideBusqueda marca solo las filas que deben repintarse al tipear", () => {
    const termino = normalizar("TORTA");
    const hits = catalogo
      .filter((p) => coincideBusqueda(p, termino))
      .map((p) => p.id);
    expect(hits).toEqual([]);

    const termino2 = normalizar("cafe");
    const hits2 = catalogo
      .filter((p) => coincideBusqueda(p, termino2))
      .map((p) => p.id);
    expect(hits2).toEqual([1]);
  });

  it("coincideBusqueda es la misma fuente de verdad que filtrarProductos", () => {
    for (const termino of ["CAFÉ", "bagley", "2l", "779003", "zzzz"]) {
      const norm = normalizar(termino);
      const idsPorFiltro = new Set(
        filtrarProductos(catalogo, {
          termino,
          categoriaId: "all",
          kpi: "all",
        }).map((p) => p.id),
      );
      const idsPorPredicado = new Set(
        catalogo.filter((p) => coincideBusqueda(p, norm)).map((p) => p.id),
      );
      expect(idsPorPredicado).toEqual(idsPorFiltro);
    }
  });

  it("no incluye la categoría si hay término que no matchea", () => {
    const resultados = filtrarProductos(catalogo, {
      termino: "yogur",
      categoriaId: "2",
      kpi: "all",
    });
    expect(resultados.map((p) => p.id)).toEqual([]);
  });
});

describe("ordenarProductos", () => {
  const productos = [
    mapear({ id: 1, nombre: "Banana", stockActual: 5 }),
    mapear({ id: 2, nombre: "Manzana", stockActual: 2 }),
    mapear({ id: 3, nombre: "Ananá", stockActual: 2 }),
  ];

  it("ordena alfabéticamente A→Z y Z→A", () => {
    expect(
      ordenarProductos(productos, "nombre_asc").map((p) => p.name),
    ).toEqual(["Ananá", "Banana", "Manzana"]);
    expect(
      ordenarProductos(productos, "nombre_desc").map((p) => p.name),
    ).toEqual(["Manzana", "Banana", "Ananá"]);
  });

  it("ordena por stock y desempata alfabéticamente", () => {
    expect(ordenarProductos(productos, "stock_asc").map((p) => p.name)).toEqual(
      ["Ananá", "Manzana", "Banana"],
    );
  });

  it("sin_marca y sin_minimo devuelven copia sin reordenar", () => {
    for (const orden of ["sin_marca", "sin_minimo"] as OrdenInventario[]) {
      const resultado = ordenarProductos(productos, orden);
      expect(resultado).not.toBe(productos);
      expect(resultado).toEqual(productos);
    }
  });
});

describe("benchmark de filtrado (hot path: una tecla del buscador)", () => {
  it("filtra 2000 productos en tiempo real y vuelve resultados correctos", () => {
    const grande: ProductoInventario[] = [];
    for (let i = 0; i < 2000; i++) {
      grande.push(
        mapear({
          id: 100 + i,
          nombre: `Producto ${i} Delta`,
          codigosBarras: `779${String(i).padStart(8, "0")}`,
          categoriaId: i % 2 === 0 ? 1 : 2,
        }),
      );
    }

    const inicio = performance.now();
    for (let i = 0; i < 100; i++) {
      const resultados = filtrarProductos(grande, {
        termino: "delta",
        categoriaId: "all",
        kpi: "all",
      });
      expect(resultados.length).toBe(2000);
    }
    const fin = performance.now();

    // < 30ms por iteración de 2000 productos = sobra para ~60fps de un solo
    // keystroke real (el filtro es O(n) con campos pre-normalizados; sin
    // normalizar 6 veces por producto).
    const porIteracion = (fin - inicio) / 100;
    expect(porIteracion).toBeLessThan(30);
  });

  it("el escaneo (coincidencia exacta de código) es O(n) sin escribir el input", () => {
    const grande: ProductoInventario[] = [];
    for (let i = 0; i < 2000; i++) {
      grande.push(
        mapear({
          id: 100 + i,
          nombre: `Producto ${i}`,
          codigosBarras: `779${String(i).padStart(8, "0")}`,
        }),
      );
    }

    const inicio = performance.now();
    for (let i = 0; i < 100; i++) {
      const resultados = filtrarProductos(grande, {
        termino: "77900000420",
        categoriaId: "all",
        kpi: "all",
      });
      expect(resultados.length).toBe(1);
    }
    const fin = performance.now();
    expect((fin - inicio) / 100).toBeLessThan(30);
  });
});