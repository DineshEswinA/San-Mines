export function formatTimeTo12Hour(epoch: number | string | Date): string {
  if (!epoch) return '';
  const date = new Date(epoch as any);
  if (isNaN(date.getTime())) return '';
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatDateOnly(epoch: number | string | Date): string {
  if (!epoch) return '';
  const date = new Date(epoch as any);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export function formatDateTime(epoch: number | string | Date): string {
  return `${formatDateOnly(epoch)}, ${formatTimeTo12Hour(epoch)}`;
}
