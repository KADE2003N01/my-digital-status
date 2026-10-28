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

  // React 19.x: props are stored in non-enumerable "__reactProps$xxx" — verify with a known react app technique:
  // check via devtools global hook absence, but instead simply test re-render: type into a React-controlled input
  // (the certificate title input) and see if value persists/controlled behavior works
  const typeTest = await page.evaluate(() => {
    const input = document.querySelector('#certificate-title');
    if (!input) return { found: false };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'TEST-REACT-CONTROL');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { found: true, value: input.value };
  });
  await page.waitForTimeout(800);
  const afterType = await page.evaluate(() => document.querySelector('#certificate-title')?.value);

  // Also try typing via Playwright into the search box if exists, or the CV form
  return { marker: 'v14', typeTest, afterType, errors };
}
