import { test as base } from '@playwright/test';
import { BusSearchPage } from '../pages/BusSearchPage';
import { logger } from '../utils/logger';

interface TestFixtures {
  busSearchPage: BusSearchPage;
}

export const test = base.extend<TestFixtures>({
  busSearchPage: async ({ page }, use) => {
    logger.info('Initialized the bus-search page object.');
    await use(new BusSearchPage(page));
  },
});

export { expect } from '@playwright/test';
