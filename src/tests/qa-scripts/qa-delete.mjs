export default async function run(page, ui) {
  await page.goto('http://127.0.0.1:5173/admin-login.html');
  await page.waitForSelector('#admin-password', { timeout: 20000 });
  await page.locator('#admin-email, input[name="email"]').first().fill('kadecomputerscience@gmail.com');
  await page.locator('#admin-password').fill('kade@12345');
  await page.getByRole('button', { name: /Sign in to admin/i }).click();
  await page.waitForTimeout(4000);
  await page.goto('http://127.0.0.1:5173/admin-documents.html');
  await page.waitForSelector('.certificate-admin-item', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // 1. Click Edit and check if the form actually populates with the item title (real React state change)
  const firstTitle = await page.locator('.certificate-admin-item strong').first().textContent();
  await page.locator('.certificate-admin-item button.admin-button.quiet').first().click();
  await page.waitForTimeout(1500);
  const editFormState = await page.evaluate(() => {
    const input = document.querySelector('#edit-title');
    const certForm = document.querySelector('#certificate-form');
    return {
      hasEditTitle: Boolean(input),
      inputValue: input ? input.value : null,
      formVisible: certForm ? getComputedStyle(certForm).display !== 'none' : false
    };
  });

  // 2. Check the certificate upload form fields (React-controlled?)
  const formProbe = await page.evaluate(() => {
    const form = document.querySelector('#certificate-form');
    if (!form) return { exists: false };
    const titleInput = form.querySelector('input[name="title"], #certificate-title, #edit-title');
    return { exists: true, titleInputId: titleInput?.id, titleValue: titleInput?.value };
  });

  return { firstTitle, editFormState, formProbe };
}
