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

  // Direct approach: intercept what happens when we click Delete via a real trusted click,
  // checking network requests.
  const requests = [];
  page.on('request', (r) => requests.push(r.method() + ' ' + r.url()));
  await page.evaluate(() => {
    window.__confirmCalled = false;
    window.confirm = () => { window.__confirmCalled = true; return true; };
  });
  await page.locator('.certificate-admin-item button.admin-button.danger').first().click({ delay: 50 });
  await page.waitForTimeout(2000);
  const confirmCalled = await page.evaluate(() => window.__confirmCalled);
  const items = await page.locator('.certificate-admin-item').count();

  // ALSO: does clicking the OTHER document kind (Other/CV section) delete work?
  const allDanger = await page.locator('button.admin-button.danger').count();
  await page.locator('button.admin-button.danger').last().click({ delay: 50 });
  await page.waitForTimeout(2000);
  const confirmLast = await page.evaluate(() => window.__confirmCalled);
  const itemsAfter = await page.locator('.certificate-admin-item').count();

  return { marker: 'v8', confirmCalled, items, allDanger, confirmLast, itemsAfter, deleteRequests: requests.filter((r) => r.startsWith('DELETE')), errors };
}
