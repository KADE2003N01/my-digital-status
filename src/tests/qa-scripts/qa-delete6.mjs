export default async function run(page, ui) {
  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://127.0.0.1:5173/admin-login.html');
  await page.waitForSelector('#admin-password', { timeout: 20000 });
  await page.locator('#admin-email, input[name="email"]').first().fill('kadecomputerscience@gmail.com');
  await page.locator('#admin-password').fill('kade@12345');
  await page.getByRole('button', { name: /Sign in to admin/i }).click();
  await page.waitForTimeout(4000);
  await page.goto('http://127.0.0.1:5173/admin-documents.html');
  await page.waitForSelector('.certificate-admin-item', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const probe = await page.evaluate(() => {
    const root = document.getElementById('root');
    // expando props are non-enumerable in newer React; use in operator
    const candidates = [];
    for (const k in root) { /* enumerable only */ }
    // Try common patterns directly
    const found = [];
    for (const key of Object.getOwnPropertyNames(root).concat(Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(root).map(String) : [])) {
      found.push(key);
    }
    // Non-enumerable: brute force with getOwnPropertyNames already done. Try JSON trick:
    let nonEnum = [];
    try {
      nonEnum = Object.keys(Object.getOwnPropertyDescriptors(root));
    } catch (e) { }
    return { found, nonEnum };
  });
  return { marker: 'v6', probe, errors };
}
