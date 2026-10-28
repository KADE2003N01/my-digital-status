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

  // Compare all four delete buttons: are ANY of them wired?
  const probe = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('.certificate-admin-item').forEach((item, i) => {
      const danger = item.querySelector('button.admin-button.danger');
      const quiet = item.querySelector('button.admin-button.quiet');
      const hasDanger = Boolean(danger);
      const names = danger ? Object.getOwnPropertyNames(danger) : [];
      results.push({
        i,
        hasDanger,
        dangerReactProps: names.filter((k) => k.startsWith('__react')).length,
        quietReactProps: quiet ? Object.getOwnPropertyNames(quiet).filter((k) => k.startsWith('__react')).length : -1,
        title: item.querySelector('strong')?.textContent
      });
    });
    return results;
  });

  // Click edit on item 2 (React should work), then delete on the SAME item
  await page.locator('.certificate-admin-item button.admin-button.quiet').nth(1).click();
  await page.waitForTimeout(1200);
  const editState2 = await page.evaluate(() => Boolean(document.querySelector('#edit-title')));
  await page.locator('.certificate-admin-item button.admin-button.danger').nth(1).click();
  await page.waitForTimeout(1500);
  const confirm2 = await page.evaluate(() => window.__confirmCalled || false);

  return { marker: 'v3', probe, editState2, confirm2, errors };
}
