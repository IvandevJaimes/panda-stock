import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HighlightMatch } from "./HighlightMatch";

function renderHighlights(text: string, query: string) {
  const { container } = render(<HighlightMatch text={text} query={query} />);
  const marks = Array.from(container.querySelectorAll("mark")).map(
    (mark) => mark.textContent,
  );
  return { texto: container.textContent ?? "", marks };
}

describe("HighlightMatch", () => {
  it("resalta el término conservando el texto original", () => {
    const { texto, marks } = renderHighlights("Gaseosa Cola", "gaseosa");

    expect(texto).toBe("Gaseosa Cola");
    expect(marks).toEqual(["Gaseosa"]);
  });

  it("es insensible a mayúsculas", () => {
    expect(renderHighlights("Gaseosa Cola", "COLA").marks).toEqual(["Cola"]);
  });

  it("resalta todas las apariciones", () => {
    const { texto, marks } = renderHighlights("Agua Agua Mineral", "agua");

    expect(texto).toBe("Agua Agua Mineral");
    expect(marks).toEqual(["Agua", "Agua"]);
  });

  it("resalta acentos escribiendo sin tilde, como el filtro que normaliza", () => {
    const { texto, marks } = renderHighlights("Café con Leche", "cafe");

    expect(texto).toBe("Café con Leche");
    expect(marks).toEqual(["Café"]);
  });

  it("resalta escribiendo con tilde", () => {
    expect(renderHighlights("Café con Leche", "café").marks).toEqual(["Café"]);
  });

  it("no toca la ñ al normalizar", () => {
    const { texto, marks } = renderHighlights("Añouevo", "año");

    expect(texto).toBe("Añouevo");
    expect(marks).toEqual(["Año"]);
  });

  it("no resalta términos de un carácter ni texto vacío", () => {
    expect(renderHighlights("Gaseosa", "a").marks).toEqual([]);
    expect(renderHighlights("Gaseosa", "  ").marks).toEqual([]);
    expect(renderHighlights("Gaseosa", "").marks).toEqual([]);
  });

  it("deja el texto intacto cuando no hay coincidencia", () => {
    const { texto, marks } = renderHighlights("Gaseosa Cola", "pepsi");

    expect(texto).toBe("Gaseosa Cola");
    expect(marks).toEqual([]);
  });

  it("no interpreta el término como regex", () => {
    const { texto, marks } = renderHighlights("Gaseosa (500ml)", "(500ml)");

    expect(texto).toBe("Gaseosa (500ml)");
    expect(marks).toEqual(["(500ml)"]);
  });

  it("aplica la clase del mark y la variante compact", () => {
    const { container } = render(
      <HighlightMatch text="Gaseosa Cola" query="gaseosa" compact className="mi-clase" />,
    );
    const mark = container.querySelector("mark");

    expect(mark?.className).toContain("mi-clase");
    expect(mark?.className).toContain("px-0");
  });
});
