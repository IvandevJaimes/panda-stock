import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TruncatedText } from "./TruncatedText";

// jsdom no calcula layout, así que las cuatro medidas dan 0 y ningún texto
// parece recortado. El componente decide si montar el tooltip midiendo el
// elemento, así que hay que falsear las medidas a mano.
const MEDIDAS = {
  scrollWidth: 0,
  clientWidth: 0,
  scrollHeight: 0,
  clientHeight: 0,
};

function stubMedidas(over: Partial<typeof MEDIDAS>) {
  Object.assign(MEDIDAS, { scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0 }, over);
  for (const key of Object.keys(MEDIDAS) as (keyof typeof MEDIDAS)[]) {
    vi.spyOn(Element.prototype, key, "get").mockReturnValue(MEDIDAS[key]);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TruncatedText", () => {
  it("en una línea, muestra el tooltip si el texto no entra a lo ancho", async () => {
    const user = userEvent.setup();
    stubMedidas({ scrollWidth: 180, clientWidth: 120 });

    render(<TruncatedText text="Gaseosa Cola 2L" />);

    await user.hover(screen.getByText("Gaseosa Cola 2L"));
    expect(await screen.findByRole("tooltip")).toBeTruthy();
  });

  it("en una línea, no muestra tooltip si el texto entra entero", async () => {
    const user = userEvent.setup();
    stubMedidas({ scrollWidth: 120, clientWidth: 120 });

    render(<TruncatedText text="Agua" />);

    await user.hover(screen.getByText("Agua"));
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("con dos líneas, muestra el tooltip si el texto se recorta en vertical", async () => {
    const user = userEvent.setup();
    // Ancho entra de sobra, pero el nombre ocupa 3 líneas y solo se ven 2: el
    // recorte es vertical y por eso el ancho no dice nada.
    stubMedidas({ scrollWidth: 120, clientWidth: 120, scrollHeight: 51, clientHeight: 34 });

    render(<TruncatedText text="Yerba Mate Campera Suavizada 500g" lines={2} />);

    await user.hover(screen.getByText("Yerba Mate Campera Suavizada 500g"));
    expect(await screen.findByRole("tooltip")).toBeTruthy();
  });

  it("con dos líneas, no confunde un ancho lleno con un texto recortado", async () => {
    const user = userEvent.setup();
    // La trampa del `line-clamp`: el texto se envuelve a lo ancho, así que
    // `scrollWidth` queda igual a `clientWidth` aunque sobren líneas. Si el
    // componente midiera el eje horizontal, acá no habría tooltip y el nombre
    // largo se quedaría sin forma de leerlo entero.
    stubMedidas({ scrollWidth: 120, clientWidth: 120, scrollHeight: 34, clientHeight: 34 });

    render(<TruncatedText text="Yerba Mate Campera" lines={2} />);

    await user.hover(screen.getByText("Yerba Mate Campera"));
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
