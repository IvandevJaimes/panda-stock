import { describe, expect, it } from "vitest";
import {
  moverLinea,
  resolverAtajo,
  tablaAtajos,
  SIN_LINEA,
  type TeclaEvento,
} from "./posAtajos";

/** Tecla pelada. Los tests reemplazan solo los campos que les importan. */
function tecla(over: Partial<TeclaEvento> = {}): TeclaEvento {
  return {
    key: "",
    code: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    editable: false,
    ...over,
  };
}

/** Atajo con el modificador de plataforma, como lo emite un teclado Linux/Win. */
function conCtrl(over: Partial<TeclaEvento>): TeclaEvento {
  return tecla({ ctrl: true, ...over });
}

describe("resolverAtajo — teclado sin modificadores", () => {
  it("F2 enfoca la búsqueda y F3 vuelve al catálogo", () => {
    expect(resolverAtajo(tecla({ key: "F2" }), false)?.accion).toBe(
      "enfocarBusqueda",
    );
    expect(resolverAtajo(tecla({ key: "F3" }), false)?.accion).toBe(
      "enfocarCatalogo",
    );
  });

  it("F1 abre la ayuda", () => {
    expect(resolverAtajo(tecla({ key: "F1" }), false)?.accion).toBe("ayuda");
  });

  it("arriba y abajo mueven la línea, izquierda y derecha el ticket", () => {
    expect(resolverAtajo(tecla({ key: "ArrowUp" }), false)?.accion).toBe("moverArriba");
    expect(resolverAtajo(tecla({ key: "ArrowDown" }), false)?.accion).toBe("moverAbajo");
    expect(resolverAtajo(tecla({ key: "ArrowLeft" }), false)?.accion).toBe("ticketAnterior");
    expect(resolverAtajo(tecla({ key: "ArrowRight" }), false)?.accion).toBe("ticketSiguiente");
  });

  it("mapea Inicio, Fin y las páginas", () => {
    expect(resolverAtajo(tecla({ key: "Home" }), false)?.accion).toBe("irAlPrimero");
    expect(resolverAtajo(tecla({ key: "End" }), false)?.accion).toBe("irAlUltimo");
    expect(resolverAtajo(tecla({ key: "PageUp" }), false)?.accion).toBe("paginaArriba");
    expect(resolverAtajo(tecla({ key: "PageDown" }), false)?.accion).toBe("paginaAbajo");
  });

  it("Delete quita la línea del cursor", () => {
    expect(resolverAtajo(tecla({ key: "Delete" }), false)?.accion).toBe("quitarLinea");
  });

  it("Enter es candidato a cobro", () => {
    expect(resolverAtajo(tecla({ key: "Enter" }), false)?.accion).toBe("cobrar");
  });

  it("una tecla suelta no es atajo", () => {
    expect(resolverAtajo(tecla({ key: "a" }), false)).toBeNull();
    expect(resolverAtajo(tecla({ key: "Tab" }), false)).toBeNull();
  });
});

describe("resolverAtajo — cantidades", () => {
  it("+ y - funcionan desde el teclado principal", () => {
    expect(resolverAtajo(tecla({ key: "+" }), false)?.accion).toBe("agregarUno");
    expect(resolverAtajo(tecla({ key: "-" }), false)?.accion).toBe("quitarUno");
  });

  it("+ y - funcionan desde el numpad, que es lo que hay en la caja", () => {
    expect(
      resolverAtajo(tecla({ key: "+", code: "NumpadAdd" }), false)?.accion,
    ).toBe("agregarUno");
    expect(
      resolverAtajo(tecla({ key: "-", code: "NumpadSubtract" }), false)?.accion,
    ).toBe("quitarUno");
  });

  it("+ con Shift sigue siendo agregar", () => {
    expect(
      resolverAtajo(tecla({ key: "+", code: "Equal", shift: true }), false)?.accion,
    ).toBe("agregarUno");
  });

  it("no le disputa el zoom del navegador", () => {
    expect(
      resolverAtajo(tecla({ key: "+", ctrl: true, shift: true }), false),
    ).toBeNull();
    expect(
      resolverAtajo(tecla({ key: "-", code: "NumpadSubtract", ctrl: true }), false),
    ).toBeNull();
  });

  it("con el foco en el buscador, + y - se teclean literales", () => {
    expect(resolverAtajo(tecla({ key: "+", editable: true }), false)).toBeNull();
    expect(resolverAtajo(tecla({ key: "-", editable: true }), false)).toBeNull();
  });
});

describe("resolverAtajo — modificador de plataforma", () => {
  it("Ctrl+D vacía, Ctrl+N abre ticket y Ctrl+M abre marcas", () => {
    expect(resolverAtajo(conCtrl({ key: "d" }), false)?.accion).toBe("vaciarTicket");
    expect(resolverAtajo(conCtrl({ key: "n" }), false)?.accion).toBe("nuevoTicket");
    expect(resolverAtajo(conCtrl({ key: "m" }), false)?.accion).toBe("abrirMarcas");
  });

  it("en macOS el atajo es Meta, no Ctrl", () => {
    expect(resolverAtajo(tecla({ key: "d", meta: true }), true)?.accion).toBe("vaciarTicket");
    expect(resolverAtajo(conCtrl({ key: "d" }), true)).toBeNull();
  });

  it("Ctrl con otra tecla no dispara ninguna acción del POS", () => {
    expect(resolverAtajo(conCtrl({ key: "s" }), false)).toBeNull();
    expect(resolverAtajo(conCtrl({ key: "ArrowDown" }), false)).toBeNull();
  });
});

describe("resolverAtajo — cambio de ticket", () => {
  it("Alt con flechas ya no cambia de ticket", () => {
    expect(resolverAtajo(tecla({ key: "ArrowLeft", alt: true }), false)).toBeNull();
    expect(resolverAtajo(tecla({ key: "ArrowRight", alt: true }), false)).toBeNull();
  });

  it("Alt+1..5 salta al ticket número y lo devuelve", () => {
    const resultado = resolverAtajo(
      tecla({ key: "3", code: "Digit3", alt: true }),
      false,
    );
    expect(resultado?.accion).toBe("irAlTicket");
    expect(resultado?.numeroTicket).toBe(3);
  });

  it("Alt+numpad también vale", () => {
    const resultado = resolverAtajo(
      tecla({ key: "5", code: "Numpad5", alt: true }),
      false,
    );
    expect(resultado?.numeroTicket).toBe(5);
  });

  it("Alt+6 en adelante no es atajo: el máximo son cinco tickets", () => {
    expect(
      resolverAtajo(tecla({ key: "6", code: "Digit6", alt: true }), false),
    ).toBeNull();
  });

  it("no muta sus argumentos entre llamadas", () => {
    const evento = tecla({ key: "2", code: "Digit2", alt: true });
    const primero = resolverAtajo(evento, false);
    const segundo = resolverAtajo(evento, false);
    expect(primero).toEqual(segundo);
  });
});

describe("resolverAtajo — foco en un campo editable", () => {
  it("solo pasan F1, F2, Escape y Enter", () => {
    expect(resolverAtajo(tecla({ key: "F1", editable: true }), false)?.accion).toBe("ayuda");
    expect(resolverAtajo(tecla({ key: "F2", editable: true }), false)?.accion).toBe(
      "enfocarBusqueda",
    );
    expect(resolverAtajo(tecla({ key: "Escape", editable: true }), false)?.accion).toBe(
      "salirDeBusqueda",
    );
    expect(resolverAtajo(tecla({ key: "Enter", editable: true }), false)?.accion).toBe(
      "salirDeBusqueda",
    );
  });

  it("las flechas dejan de ser navegación y vuelven a mover el cursor de texto", () => {
    expect(resolverAtajo(tecla({ key: "ArrowLeft", editable: true }), false)).toBeNull();
    expect(resolverAtajo(tecla({ key: "ArrowDown", editable: true }), false)).toBeNull();
  });

  it("Ctrl+D no vacía el ticket mientras se escribe", () => {
    expect(resolverAtajo(conCtrl({ key: "d", editable: true }), false)).toBeNull();
  });

  it("Delete borra texto en el buscador en vez de quitar la línea", () => {
    expect(resolverAtajo(tecla({ key: "Delete", editable: true }), false)).toBeNull();
  });
});

describe("moverLinea", () => {
  it("sin lineas no hay seleccion", () => {
    expect(moverLinea(0, 0, 3, "abajo")).toBe(SIN_LINEA);
    expect(moverLinea(-1, 0, 3, "fin")).toBe(SIN_LINEA);
  });

  it("arriba y abajo mueven de a una linea", () => {
    expect(moverLinea(0, 10, 3, "abajo")).toBe(1);
    expect(moverLinea(5, 10, 3, "arriba")).toBe(4);
  });

  it("no se pasa del final ni del principio", () => {
    expect(moverLinea(9, 10, 3, "abajo")).toBe(9);
    expect(moverLinea(0, 10, 3, "arriba")).toBe(0);
  });

  it("las paginas saltan la cantidad de filas visibles", () => {
    expect(moverLinea(0, 30, 4, "pagina-abajo")).toBe(4);
    expect(moverLinea(20, 30, 4, "pagina-arriba")).toBe(16);
  });

  it("Inicio y Fin van a los extremos", () => {
    expect(moverLinea(7, 10, 3, "inicio")).toBe(0);
    expect(moverLinea(7, 10, 3, "fin")).toBe(9);
  });

  it("un indice guardado fuera de rango se recorta al extremo", () => {
    expect(moverLinea(99, 5, 3, "abajo")).toBe(4);
    expect(moverLinea(99, 5, 3, "inicio")).toBe(0);
  });

  it("sin seleccion cualquier paso aterriza en un extremo", () => {
    expect(moverLinea(-1, 5, 3, "abajo")).toBe(0);
    expect(moverLinea(-1, 5, 3, "fin")).toBe(4);
  });

  it("sin filas visibles la pagina avanza de a uno", () => {
    expect(moverLinea(2, 10, 0, "pagina-abajo")).toBe(3);
    expect(moverLinea(2, 10, 0, "abajo")).toBe(3);
  });
});

describe("tablaAtajos", () => {
  it("no repite acciones", () => {
    const lista = tablaAtajos(false).map((entrada) => entrada.accion);
    expect(new Set(lista).size).toBe(lista.length);
  });

  it("rota el modificador segun la plataforma", () => {
    expect(tablaAtajos(true).find((e) => e.accion === "vaciarTicket")?.teclas).toBe("Cmd+D");
    expect(tablaAtajos(false).find((e) => e.accion === "vaciarTicket")?.teclas).toBe("Ctrl+D");
  });

  it("mantiene las teclas como notacion W3C para aria-keyshortcuts", () => {
    for (const entrada of tablaAtajos(false)) {
      if (entrada.teclas.includes("Enter") || entrada.teclas.includes("\u2026")) continue;
      expect(entrada.teclas).not.toMatch(/\s/);
      expect(entrada.rotulo.length).toBeGreaterThan(0);
    }
  });

  it("cada atajo de la tabla dispara la accion que anuncia", () => {
    const ejemplos: Record<string, TeclaEvento> = {
      enfocarBusqueda: tecla({ key: "F2" }),
      enfocarCatalogo: tecla({ key: "F3" }),
      moverArriba: tecla({ key: "ArrowUp" }),
      moverAbajo: tecla({ key: "ArrowDown" }),
      irAlPrimero: tecla({ key: "Home" }),
      irAlUltimo: tecla({ key: "End" }),
      paginaArriba: tecla({ key: "PageUp" }),
      paginaAbajo: tecla({ key: "PageDown" }),
      agregarUno: tecla({ key: "+" }),
      quitarUno: tecla({ key: "-" }),
      quitarLinea: tecla({ key: "Delete" }),
      vaciarTicket: conCtrl({ key: "d" }),
      cobrar: tecla({ key: "Enter" }),
      nuevoTicket: conCtrl({ key: "n" }),
      ticketAnterior: tecla({ key: "ArrowLeft" }),
      ticketSiguiente: tecla({ key: "ArrowRight" }),
      abrirMarcas: conCtrl({ key: "m" }),
      cambiarMetodoPago: tecla({ key: "F4" }),
      // `Escape` solo resuelve con el foco en el buscador.
      salirDeBusqueda: tecla({ key: "Escape", editable: true }),
      ayuda: tecla({ key: "F1" }),
      // `Alt+dígito` se lee del `code`, no del `key`: con Alt el `key` depende
      // del layout y en varios teclado devuelve el símbolo en vez del número.
      irAlTicket: tecla({ key: "1", code: "Digit1", alt: true }),
    };

    const cubierta = new Set<string>();
    for (const entrada of tablaAtajos(false)) {
      const evento = ejemplos[entrada.accion];
      if (!evento) continue;
      cubierta.add(entrada.accion);
      expect(resolverAtajo(evento, false)?.accion).toBe(entrada.accion);
    }

    // Contra el largo de la tabla, no contra un numero fijo: cada entrada
    // necesita su ejemplo. Con un conteo hardcodeado, sacar un atajo de la ayuda
    // rompe el test aunque la tecla siga funcionando, y esovfuerza a dejar
    // documentado lo que justamente se quiso sacar.
    expect(cubierta.size).toBe(tablaAtajos(false).length);
  });
});
