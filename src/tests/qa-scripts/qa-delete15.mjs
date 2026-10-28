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

  // React DevTools hook test: install hook BEFORE react loads won't work now.
  // Alternative: check react version from the module itself
  const reactVersion = await page.evaluate(async () => {
    const r = await fetch('/node_modules/.vite/deps/react.js?v=ae4dc8a0');
    const text = await r.text();
    const m = text.match(/"([\d]+\.[\d]+\.[\d]+[^"]*)"/g);
    return m ? m.slice(0, 5) : text.slice(0, 200);
  });

  // Type into title via playwright (trusted events) then check React resets it (controlled input re-render)
  await page.locator('#certificate-title').fill('');
  await page.waitForTimeout(500);
  const valueAfterClear = await page.evaluate(() => document.querySelector('#certificate-title')?.value);

  return { marker: 'v15', reactVersion, valueAfterClear, errors };
}
