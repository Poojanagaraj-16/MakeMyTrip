import type { Locator, Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async open(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async expectVisible(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
  }
}
