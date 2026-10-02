import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

afterEach(() => {
  cleanup();
});

describe("LoadingState", () => {
  it("anuncia el título con role=status para lectores de pantalla", () => {
    render(<LoadingState title="Cargando inventario..." />);

    const estado = screen.getByRole("status");
    expect(estado.textContent).toBe("Cargando inventario...");
  });

  it("el spinner queda oculto para lectores de pantalla", () => {
    const { container } = render(<LoadingState title="Cargando" />);

    // El ícono es decorativo: sin aria-hidden el announcement duplicaría el texto.
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("no renderiza la descripción si no se pasa", () => {
    render(<LoadingState title="Cargando" />);

    expect(screen.getByRole("status").parentElement?.textContent).toBe(
      "Cargando",
    );
  });

  it("renderiza la descripción cuando se pasa", () => {
    render(
      <LoadingState
        title="Cargando inventario..."
        description="Estamos trayendo el inventario desde la base de datos."
      />,
    );

    expect(
      screen.getByText("Estamos trayendo el inventario desde la base de datos."),
    ).toBeTruthy();
  });

  it("sin fullPage no estira el bloque a toda la altura", () => {
    const { container } = render(<LoadingState title="Cargando" />);

    const raiz = container.firstElementChild;
    expect(raiz?.className).not.toContain("min-h-[70vh]");
    expect(raiz?.className).not.toContain("h-full");
  });

  it("con fullPage estira a toda la altura disponible", () => {
    // Nota: jsdom no calcula layout, así que acá se verifica el contrato de
    // clases (que el bloque ocupe la altura) y no el píxel final del centrado.
    // El centrado real depende del contrato flex del contenedor, que en jsdom
    // no es observable.
    const { container } = render(<LoadingState title="Cargando" fullPage />);

    const raiz = container.firstElementChild;
    expect(raiz?.className).toContain("h-full");
    expect(raiz?.className).toContain("min-h-[70vh]");
    expect(raiz?.className).toContain("items-center");
    expect(raiz?.className).toContain("justify-center");
  });

  it("respeta el className que le pase el consumidor", () => {
    const { container } = render(
      <LoadingState title="Cargando" fullPage className="opacity-50" />,
    );

    expect(container.firstElementChild?.className).toContain("opacity-50");
  });
});
