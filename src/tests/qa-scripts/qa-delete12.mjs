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

  // React 19: random prop key is non-enumerable AND starts with "$" maybe. Try brute pattern search on element properties via for...in on window? No.
  // Try: JSON stringify a Proxy? Simplest reliable: check `el._reactListening...` symbols via Object.getOwnPropertySymbols
  const probe = await page.evaluate(() => {
    const el = document.querySelector('.theme-toggle');
    const syms = Object.getOwnPropertySymbols(el).map((s) => String(s));
    const proto = Object.getOwnPropertySymbols(Object.getPrototypeOf(el)).map((s) => String(s));
    // Also try to trigger a React synthetic event manually via dispatchEvent with bubbles
    window.__confirmCalled = false;
    window.confirm = () => { window.__confirmCalled = true; return true; };
    const btn = document.querySelector('.certificate-admin-item button.admin-button.danger');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { syms, proto, dispatched: true };
  });
  await page.waitForTimeout(1500);
  const confirmAfter = await page.evaluate(() => window.__confirmCalled);
  return { marker: 'v12', probe, confirmAfter, errors };
}
