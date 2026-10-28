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

  // React 19 uses internal properties starting with random symbol? No—uses string props.
  // Different approach: check the fiber through container's _reactRootContainer or the like
  const probe = await page.evaluate(() => {
    const el = document.querySelector('.theme-toggle'); // a known-working React button
    const desc = Object.getOwnPropertyNames(el);
    const descProto = Object.getOwnPropertyNames(Object.getPrototypeOf(el));
    // Find expando: compare with a detached fresh element
    const fresh = document.createElement('button');
    const freshProps = Object.getOwnPropertyNames(fresh);
    const extra = desc.filter((p) => !freshProps.includes(p) && !descProto.includes(p));
    return { extra: extra.map((e) => e.slice(0, 40)), extraCount: extra.length };
  });
  return { marker: 'v10', probe, errors };
}
