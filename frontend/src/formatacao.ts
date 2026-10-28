export const moeda = (centavos: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);

export const dataHora = (valor: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));

export const nomeSituacao = (situacao: string) => ({
  EM_ANDAMENTO: "Em andamento",
  AGENDADO: "Agendado",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
}[situacao] ?? situacao);

export function contador(fim: string, agora = Date.now()) {
  const segundos = Math.max(0, Math.floor((new Date(fim).getTime() - agora) / 1000));
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  return [horas, minutos, resto].map((n) => String(n).padStart(2, "0")).join(":");
}

export function reaisParaCentavos(valor: string): number | null {
  const normalizado = valor.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizado)) return null;
  const partes = normalizado.split(".");
  const inteiro = Number(partes[0]);
  const decimais = Number((partes[1] ?? "").padEnd(2, "0"));
  const centavos = inteiro * 100 + decimais;
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}
