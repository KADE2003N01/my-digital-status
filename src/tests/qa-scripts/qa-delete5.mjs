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
    const allKeys = Object.getOwnPropertyNames(root);
    // React 17/18 use random keys like __reactContainer$xxx or __reactListening<event>
    const containerKey = allKeys.find((k) => k.includes('reactContainer'));
    const listeningKeys = allKeys.filter((k) => k.includes('reactListening'));
    return { allKeys, containerKey, listeningKeys };
  });
  return { marker: 'v5', probe, errors };
}
