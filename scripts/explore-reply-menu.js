async (page) => {
  const result = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="notes_card"]');
    if (!card) return 'No card found';
    // Find all buttons/clickable elements in the card
    const btns = card.querySelectorAll('button, [role="button"], .cdk-menu-trigger, [class*="more"], [class*="menu"]');
    const list = [];
    btns.forEach(b => {
      list.push(b.tagName + '.' + b.className.substring(0, 60) + ' => ' + (b.textContent || '').trim().substring(0, 40));
    });
    return list.join(' | ');
  });
  return result;
}
