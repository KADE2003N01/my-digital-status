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

  // Debug the t() translation call path: monkeypatch window.confirm AND check
  // whether deleteDocument is reached at all. First find the exact handler via React internals of a WORKING element (Edit).
  const handlerProbe = await page.evaluate(() => {
    // find React root container internals
    const root = document.getElementById('root');
    const rootKey = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));
    if (!rootKey) return { found: false };
    const rootFiber = root[rootKey];
    // Walk the fiber tree to find the Delete button component
    const seen = [];
    function walk(fiber, depth) {
      if (!fiber || depth > 30 || seen.length > 200) return;
      if (fiber.memoizedProps?.onClick) {
        seen.push({
          tag: fiber.tag,
          name: fiber.type?.name || (typeof fiber.type === 'string' ? fiber.type : 'anon'),
          onClickSrc: String(fiber.memoizedProps.onClick).slice(0, 100)
        });
      }
      if (fiber.child) walk(fiber.child, depth + 1);
      if (fiber.sibling) walk(fiber.sibling, depth + 1);
    }
    walk(rootFiber.stateNode ? rootFiber : rootFiber, 0);
    return { found: true, handlers: seen.slice(0, 40) };
  });
  return { marker: 'v4', handlerProbe, errors };
}
