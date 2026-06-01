/**
 * Predicado usado pelo cron job `delete-expired-opportunities`
 * (ver migration que agenda DELETE em `editais` e `palcos_curados`).
 *
 * Espelha exatamente a cláusula SQL:
 *   prazo IS NOT NULL AND prazo < CURRENT_DATE
 *
 * Mantido como função pura para que possamos validar via testes que
 * apenas oportunidades expiradas são removidas, preservando registros
 * sem prazo definido ou com prazo ainda futuro / hoje.
 */
export function isOpportunityExpired(
  prazo: string | Date | null | undefined,
  today: Date = new Date(),
): boolean {
  if (prazo === null || prazo === undefined || prazo === "") return false;

  const prazoDate = prazo instanceof Date ? new Date(prazo) : new Date(`${prazo}T00:00:00`);
  if (Number.isNaN(prazoDate.getTime())) return false;

  // Normaliza ambos para meia-noite local para comparar só a parte de data,
  // alinhado ao comportamento de CURRENT_DATE no Postgres.
  const a = new Date(prazoDate.getFullYear(), prazoDate.getMonth(), prazoDate.getDate()).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return a < b;
}

export interface OpportunityLike {
  id: string;
  prazo: string | Date | null;
}

/**
 * Aplica o mesmo filtro do cron e retorna os registros que sobrevivem
 * (i.e. NÃO seriam apagados).
 */
export function filterSurvivingOpportunities<T extends OpportunityLike>(
  rows: T[],
  today: Date = new Date(),
): T[] {
  return rows.filter((row) => !isOpportunityExpired(row.prazo, today));
}
