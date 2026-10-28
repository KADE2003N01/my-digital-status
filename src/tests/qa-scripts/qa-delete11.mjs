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
    const el = document.querySelector('.theme-toggle');
    // React attaches props via a random key. Compare against a fresh element including symbols
    const fresh = document.createElement('button');
    const elKeys = Reflect.ownKeys(el).map(String);
    const freshKeys = Reflect.ownKeys(fresh).map(String);
    const diff = elKeys.filter((k) => !freshKeys.includes(k));
    return { elKeys, diff };
  });
  return { marker: 'v11', probe, errors };
}
