/**
 * Format large numbers with K/M/B/T suffixes.
 * e.g. 1500 -> "1.5K", 2300000 -> "2.3M"
 * Numbers below 1000 are returned as-is.
 *
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';

    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (abs >= 1e6)  return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 1e3)  return sign + (abs / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';

    return sign + Math.floor(abs).toString();
}
