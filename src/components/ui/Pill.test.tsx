import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pill } from "./Pill";

describe("Pill", () => {
  it("la etiqueta es un <button> real, no un div con role=button", () => {
    render(
      <Pill label="Bebidas" count={3} onSelect={vi.fn()} showActions={false} />,
    );

    const boton = screen.getByRole("button", { name: /bebidas/i });
    expect(boton.tagName).toBe("BUTTON");
    expect(boton).toHaveProperty("type", "button");
    // El contenedor no debe seguir siendo Role de button, o habría dos
    // controles para la misma acción y el nombre accesible se duplicaría.
    expect(boton.parentElement?.getAttribute("role")).toBeNull();
  });

  it("no anida botones: editar y eliminar son hermanos de la etiqueta", () => {
    // Un <button> dentro de otro <button> es HTML inválido y rompe la
    // activación por teclado en varios navegadores.
    render(
      <Pill
        label="Bebidas"
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // Anclar con ^ para no matchear "Editar Bebidas" ni "Eliminar Bebidas".
    const etiqueta = screen.getByRole("button", { name: /^bebidas/i });
    const editar = screen.getByRole("button", { name: /^editar bebidas/i });
    const eliminar = screen.getByRole("button", { name: /^eliminar bebidas/i });

    expect(etiqueta.contains(editar)).toBe(false);
    expect(etiqueta.contains(eliminar)).toBe(false);
    expect(editar.contains(eliminar)).toBe(false);
  });

  it("editar no dispara onSelect (ya no hace falta stopPropagation)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onEdit = vi.fn();

    render(
      <Pill label="Bebidas" onSelect={onSelect} onEdit={onEdit} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /editar bebidas/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marca el estado activo con aria-pressed", () => {
    const { rerender } = render(
      <Pill label="Bebidas" active onSelect={vi.fn()} showActions={false} />,
    );
    expect(
      screen.getByRole("button", { name: /bebidas/i }).getAttribute("aria-pressed"),
    ).toBe("true");

    rerender(
      <Pill label="Bebidas" active={false} onSelect={vi.fn()} showActions={false} />,
    );
    expect(
      screen.getByRole("button", { name: /bebidas/i }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("el conteo forma parte del nombre accesible de la pastilla", () => {
    render(
      <Pill label="Bebidas" count={7} onSelect={vi.fn()} showActions={false} />,
    );

    expect(screen.getByText("7")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /bebidas\s*7/i }),
    ).toBeTruthy();
  });

  it("con showActions=false no renderiza editar ni eliminar", () => {
    render(<Pill label="Bebidas" onSelect={vi.fn()} showActions={false} />);

    expect(screen.queryByRole("button", { name: /editar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /eliminar/i })).toBeNull();
  });

  it("con canDelete=false oculta solo eliminar", () => {
    render(
      <Pill
        label="Bebidas"
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canDelete={false}
      />,
    );

    expect(screen.getByRole("button", { name: /editar/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /eliminar/i })).toBeNull();
  });

  it("llama onChange al seleccionar", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Pill label="Bebidas" onSelect={onSelect} showActions={false} />);
    await user.click(screen.getByRole("button", { name: /bebidas/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("es alcanzable y activable con teclado", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Pill label="Bebidas" onSelect={onSelect} showActions={false} />);
    const boton = screen.getByRole("button", { name: /^bebidas/i });

    boton.focus();
    // Un div con role="button" y tabIndex=0 también es focusable, pero no
    // dispara click con Enter sin el onKeyDown hecho a mano. Aquí lo que se
    // verifica es que el botón nativo lo resuelve solo.
    expect(document.activeElement).toBe(boton);
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
