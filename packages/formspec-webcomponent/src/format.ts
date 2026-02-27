/**
 * Format a Formspec money value `{amount, currency}` as a localized currency string.
 * Returns `''` when the amount is missing or not a finite number.
 */
export function formatMoney(
    moneyVal: { amount: any; currency?: string } | null | undefined,
    locale = 'en-US',
): string {
    if (moneyVal == null || moneyVal.amount == null) return '';
    const n = typeof moneyVal.amount === 'number' ? moneyVal.amount : parseFloat(moneyVal.amount);
    if (!isFinite(n)) return '';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: moneyVal.currency || 'USD',
    }).format(n);
}
