// Uang = integer rupiah. Tampilan: Rp34.000
export const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID')

// Bagian pengelola = round(omzet x persen / 100), sama dengan round() di view tenant_daily_revenue.
// Persen dijadikan basis poin dulu supaya tidak meleset 1 rupiah karena float (12,45% x 21.000 = 2.615, bukan 2.614).
export const canteenShare = (gross: number, percent: number) => Math.round((gross * Math.round(percent * 100)) / 10000)
