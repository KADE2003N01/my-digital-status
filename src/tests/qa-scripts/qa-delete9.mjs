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

  // Use React DevTools-style: find the props key by checking all prototype levels with 'in' operator via random sampling
  // Simpler: React 19 names keys __reactProps$<hash>. getOwnPropertyNames returned NOTHING which is impossible if React attached props...
  // UNLESS this DOM was rendered by something else. Let's check react version modules loaded:
  const modules = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('react') || n.includes('chunk')).slice(0, 30));
  // And check the vite module graph via a fetch of main.jsx transform
  return { marker: 'v9', modules, errors };
}
