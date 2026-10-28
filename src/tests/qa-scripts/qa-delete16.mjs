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

  const reactVersion = await page.evaluate(async () => {
    const r = await fetch('/node_modules/.vite/deps/chunk-4PXDAZTX.js?v=ae4dc8a0');
    const text = await r.text();
    const versions = [...text.matchAll(/"(\d+\.\d+\.\d+[^"]*)"/g)].map((m) => m[1]).slice(0, 5);
    return versions;
  });
  return { marker: 'v16', reactVersion, errors };
}
