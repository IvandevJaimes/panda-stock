import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

describe("QuantityStepper", () => {
  it("muestra el valor actual", () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("resta y suma una unidad", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<QuantityStepper value={3} onChange={onChange} itemLabel="Gaseosa" />);

    await user.click(screen.getByRole("button", { name: /^quitar una unidad/i }));
    expect(onChange).toHaveBeenCalledWith(2);

    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: /^agregar una unidad/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("los tooltip son cortos y NO repiten el nombre del item", async () => {
    const user = userEvent.setup();

    render(<QuantityStepper value={3} onChange={vi.fn()} itemLabel="Gaseosa Cola 2L" />);

    const quitar = screen.getByRole("button", { name: /^quitar una unidad de/i });
    await user.hover(quitar);
    expect(await screen.findByText("Quitar 1")).toBeTruthy();

    const agregar = screen.getByRole("button", { name: /^agregar una unidad de/i });
    await user.hover(agregar);
    expect(await screen.findByText("Agregar 1")).toBeTruthy();
  });

  it("el nombre accesible del grupo incluye el item", () => {
    render(<QuantityStepper value={2} onChange={vi.fn()} itemLabel="Gaseosa" />);
    expect(
      screen.getByRole("group", { name: /cantidad de gaseosa/i }),
    ).toBeTruthy();
  });

  it("en el mínimo con onRemove, restar lo quita en vez de decrementar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onRemove = vi.fn();

    render(
      <QuantityStepper
        value={1}
        onChange={onChange}
        onRemove={onRemove}
        itemLabel="Gaseosa"
      />,
    );

    // No deshabilitado: hay destino (quitar la línea).
    const btn = screen.getByRole("button", { name: /^quitar una unidad/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);

    await user.click(btn);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("en el mínimo sin onRemove, restar queda deshabilitado", () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} />);

    const btn = screen.getByRole("button", { name: /^quitar una unidad/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("deshabilita restar por encima del mínimo si se sube el min", () => {
    render(<QuantityStepper value={2} onChange={vi.fn()} min={2} />);

    const btn = screen.getByRole("button", { name: /^quitar una unidad/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("deshabilita sumar en el máximo", () => {
    render(<QuantityStepper value={9} onChange={vi.fn()} max={9} />);

    const btn = screen.getByRole("button", { name: /^agregar una unidad/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("el valor es una región live para que se anuncie el cambio", () => {
    render(<QuantityStepper value={4} onChange={vi.fn()} />);
    // Sin esto, el número es texto plano y un lector de pantalla no se entera
    // de que la cantidad cambió al apretar +.
    expect(screen.getByText("4").getAttribute("aria-live")).toBe("polite");
  });

  it("expone el grupo con el nombre accesible aun sin itemLabel", () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /cantidad de productos/i }),
    ).toBeTruthy();
  });
});
