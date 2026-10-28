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

  // React 19: event props attached to DOM nodes? No - 19 uses events on root container.
  // Check root container for reactKeys again but with own property names including symbols on the DIV
  const probe = await page.evaluate(() => {
    const root = document.getElementById('root');
    const firstDiv = root.querySelector('div.admin-page');
    const symNames = (el) => Object.getOwnPropertySymbols(el).map((s) => s.toString());
    return {
      rootSyms: symNames(root),
      divSyms: symNames(firstDiv),
      btnSyms: symNames(document.querySelector('.certificate-admin-item button.admin-button.danger'))
    };
  });
  return { marker: 'v17', probe, errors };
}
