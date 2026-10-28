export default async function run(page, ui) {
  const errors = [];
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://127.0.0.1:5173/admin-login.html');
  await page.waitForSelector('#admin-password', { timeout: 20000 });
  await page.locator('#admin-email, input[name="email"]').first().fill('kadecomputerscience@gmail.com');
  await page.locator('#admin-password').fill('kade@12345');
  await page.getByRole('button', { name: /Sign in to admin/i }).click();
  await page.waitForTimeout(4000);

  // Before navigating: check React works on admin.html (overview page)
  const overviewProbe = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].slice(0, 5);
    return {
      url: location.href,
      buttonCount: btns.length,
      anyReactProps: btns.some((b) => Reflect.ownKeys(b).some((k) => String(k).includes('reactProps'))),
      sampleKeyStrings: Reflect.ownKeys(btns[0] || {}).map(String).slice(0, 10)
    };
  });

  await page.goto('http://127.0.0.1:5173/admin-documents.html');
  await page.waitForSelector('.certificate-admin-item', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const docProbe = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].slice(0, 5);
    return {
      buttonCount: btns.length,
      anyReactProps: btns.some((b) => Reflect.ownKeys(b).some((k) => String(k).includes('reactProps'))),
      sampleKeyStrings: Reflect.ownKeys(btns[0] || {}).map(String).slice(0, 10)
    };
  });

  return { marker: 'v13', overviewProbe, docProbe, errors };
}
