export const euro = (n) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
    .format(Number(n || 0));

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

export const statusBadgeClass = (input) => {
  const s = String(input || 'neu').toLowerCase();
  if (s === 'erledigt') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (s === 'in arbeit' || s === 'in bearbeitung')
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
};
