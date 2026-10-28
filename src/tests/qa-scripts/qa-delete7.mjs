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
    // React attaches random expando props to DOM nodes. Check ANY element:
    const samples = [document.body, document.querySelector('#root'), document.querySelector('.admin-page'), document.querySelector('.certificate-admin-item'), document.querySelector('.theme-toggle')];
    const out = samples.map((el) => {
      if (!el) return 'missing';
      const props = [];
      // walk prototype chain own props
      let o = el;
      while (o && o !== Object.prototype) {
        props.push(...Object.getOwnPropertyNames(o));
        o = Object.getPrototypeOf(o);
      }
      return props.filter((p) => p.startsWith('__')).slice(0, 5);
    });
    return out;
  });
  return { marker: 'v7', probe, errors };
}
