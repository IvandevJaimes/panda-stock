export function formatearCodigo(valor: string | null): string {
  if (!valor) return "—";
  const partes = valor
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return partes.length > 1
    ? `${partes[0]} +${partes.length - 1}`
    : (partes[0] ?? "—");
}

export function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}