export interface ReportData {
  agenteNombre: string;
  sedeNombre: string;
  turno: string;
  tipoReporte: string;
  novedades: string;
  hora: string;
}

export function generateWhatsAppLink(numeroGrupo: string, data: ReportData): string {
  // Limpiar el número de cualquier caracter no numérico
  const cleanNumber = numeroGrupo.replace(/\D/g, "");

  const mensaje = `*REPORTE OPERATIVO - ${data.sedeNombre}*
*Agente:* ${data.agenteNombre}
*Turno:* ${data.turno.toUpperCase()}
*Hora:* ${data.hora}
*Tipo:* ${data.tipoReporte.toUpperCase()}

*Novedades:*
${data.novedades || "Sin novedades relevantes."}

_Enviado desde Seguridad Control App_`;

  const encodedMessage = encodeURIComponent(mensaje);
  
  // Utiliza el formato universal wa.me que funciona en Android, iOS y Desktop
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}
