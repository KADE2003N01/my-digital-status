export default async function run(page, ui) {
  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message + ' | ' + String(err.stack).slice(0, 300)));

  await page.goto('http://127.0.0.1:5173/admin-login.html');
  await page.waitForSelector('#admin-password', { timeout: 20000 });
  await page.locator('#admin-email, input[name="email"]').first().fill('kadecomputerscience@gmail.com');
  await page.locator('#admin-password').fill('kade@12345');
  await page.getByRole('button', { name: /Sign in to admin/i }).click();
  await page.waitForTimeout(4000);
  await page.goto('http://127.0.0.1:5173/admin-documents.html');
  await page.waitForSelector('.certificate-admin-item', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // React 19.3: expando props ARE on DOM nodes as "__reactFiber$" & "__reactProps$".
  // Our earlier checks failed - maybe the evaluate world differs. Try with structuredClone-safe JSON
  const probe = await page.evaluate(() => {
    const btn = document.querySelector('.certificate-admin-item button.admin-button.danger');
    const out = { keys: [] };
    try {
      // eslint-disable-next-line
      const keys = Object.keys(btn);
      out.keys = keys;
    } catch (e) { out.err = e.message; }
    try {
      let k; const found = [];
      // Use a for-in to be thorough
      for (k in btn) found.push(k);
      out.forIn = found;
    } catch (e) { }
    return out;
  });
  return { marker: 'v18', probe, errors };
}
