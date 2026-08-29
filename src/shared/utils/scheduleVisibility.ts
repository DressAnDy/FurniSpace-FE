export function isScheduleVisible(status?: string | null) {
  return (status ?? '').trim().toUpperCase() !== 'COMPLETED';
}
