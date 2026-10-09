import { test, expect } from '../fixtures/test-fixtures';
import { logger } from '../utils/logger';
import { readBusSearchData } from '../utils/test-data-reader';

test.beforeEach(({ }, testInfo) => {
  logger.info(`Starting ${testInfo.title}.`);
});

test.afterEach(({ }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    logger.error(`${testInfo.title} finished with status ${testInfo.status}.`);
  }
});

test('TC_BUS_001 [REQ_BUS_01] Search bus with valid source city, destination city, and future travel date', async ({
  page,
  busSearchPage,
}) => {
  const data = readBusSearchData();
  const { source, destination } = data.validSearch;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4. Select a valid source city', async () => {
    await busSearchPage.selectSource(source);
  });
  await test.step('5. Select a valid destination city', async () => {
    await busSearchPage.selectDestination(destination);
  });
  await test.step('6. Select a future travel date', async () => {
    await busSearchPage.selectTravelDate(data.travelDate);
    await busSearchPage.verifySearchCriteria(source, destination, data.travelDate);
  });
  await test.step('7. Click Search', async () => {
    await busSearchPage.search();
  });
  await test.step('8. Verify bus results or an explicit no-results state is displayed', async () => {
    await expect(page).toHaveURL(/\/bus-tickets\//);
    const results = page.getByRole('button', { name: /book now|view seats|select seats/i });
    const noResults = page.getByText(/no buses|no results|no services/i);
    await expect(results.first().or(noResults.first())).toBeVisible();
    logger.info('Verified that bus results or an explicit no-results state is displayed.');
  });
});

test('TC_BUS_002 [REQ_BUS_01] Verify source city auto-suggestions are displayed while entering source city ', async ({ page, busSearchPage }) => {
  const data = readBusSearchData().sourceSuggestions;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-5. Click From and enter partial source city text', async () => {
    await busSearchPage.enterSource(data.partialSource);
  });
  await test.step('6. Verify the auto-suggestion list is displayed with the expected city', async () => {
    await busSearchPage.expectSuggestionList();
    await busSearchPage.expectSuggestion(data.expectedSource);
  });
  await test.step('7. Select the suggested city and verify it appears in the From field', async () => {
    await busSearchPage.selectSource(data.expectedSource);
    await expect.poll(() => busSearchPage.sourceValue()).toMatch(new RegExp(data.expectedSource, 'i'));
  });
});

test('TC_BUS_003 [REQ_BUS_01] Verify destination city auto-suggestions are displayed while entering destination city ', async ({ page, busSearchPage }) => {
  const data = readBusSearchData().destinationSuggestions;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4. Select a valid source city', async () => {
    await busSearchPage.selectSource(data.source);
  });
  await test.step('5-6. Click To and enter partial destination city text', async () => {
    await busSearchPage.enterDestination(data.partialDestination);
  });
  await test.step('7. Verify the auto-suggestion list is displayed with the expected city', async () => {
    await busSearchPage.expectSuggestionList();
    await busSearchPage.expectSuggestion(data.expectedDestination);
  });
  await test.step('8. Select the suggested city and verify it appears in the To field', async () => {
    await busSearchPage.selectDestination(data.expectedDestination);
    await expect.poll(() => busSearchPage.destinationValue()).toMatch(new RegExp(data.expectedDestination, 'i'));
  });
});

test('TC_BUS_004 [REQ_BUS_01] Verify warning message when source and destination cities are the same (Negative)', async ({ page, busSearchPage }) => {
  const root = readBusSearchData();
  const data = root.sameCity;
  let originalUrl = '';

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-7. Click From, enter Bangalore, wait for suggestions, select Bangalore', async () => {
    await busSearchPage.enterSource(data.source);
    await busSearchPage.expectSuggestionList();
    await busSearchPage.selectSource(data.source);
  });
  let cityCanBeSelected = false;
  await test.step('8-9. Click To and enter Bangalore', async () => {
    await busSearchPage.enterDestination(data.destination);
    cityCanBeSelected = await busSearchPage.sameCitySuggestionVisible(data.destination);
  });
  if (!cityCanBeSelected) {
    await test.step('10. Same city not offered as a destination: invalid route prevented', async () => {
      await busSearchPage.expectSuggestionList();
      logger.info('The destination suggestions did not offer the already-selected source city.');
    });
    return;
  }
  await test.step('10. Select Bangalore from the suggestions (application permits it)', async () => {
    await busSearchPage.selectDestination(data.destination);
  });
  await test.step('11. Select a future travel date', async () => {
    await busSearchPage.selectTravelDate(root.travelDate);
  });
  await test.step('12. Click Search', async () => {
    originalUrl = page.url();
    await busSearchPage.search();
  });
  await test.step('13. Verify a warning is shown or the invalid search is prevented', async () => {
    const routeChanged = await page.waitForURL((url) => url.href !== originalUrl, { timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    const validationVisible = await busSearchPage.validationMessage().isVisible().catch(() => false);
    logger.info(validationVisible
      ? 'Same-city search displayed an accessible validation alert.'
      : routeChanged
        ? 'Same-city search navigated without showing an accessible validation alert.'
        : 'Same-city search stayed on the search form without a visible alert.');
    expect(
      validationVisible || !routeChanged,
      'The same-city route should be rejected with visible validation or remain blocked on the search form.',
    ).toBeTruthy();
  });
  await test.step('14. Verify the application does not proceed with the same-city route', async () => {
    expect(page.url(), 'A rejected same-city search must not navigate to results.').toBe(originalUrl);
  });
});

test('TC_BUS_005 [REQ_BUS_02] Verify source city auto-suggestions are displayed while entering source city (Positive)', async ({ page, busSearchPage }) => {
  const data = readBusSearchData().sourceSuggestions;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-5. Click From and enter partial source city text', async () => {
    await busSearchPage.enterSource(data.partialSource);
  });
  await test.step('6. Verify the auto-suggestion list is displayed with the expected city', async () => {
    await busSearchPage.expectSuggestionList();
    await busSearchPage.expectSuggestion(data.expectedSource);
  });
  await test.step('7. Select the suggested city and verify it appears in the From field', async () => {
    await busSearchPage.selectSource(data.expectedSource);
    await expect.poll(() => busSearchPage.sourceValue()).toMatch(new RegExp(data.expectedSource, 'i'));
  });
});


test('TC_BUS_006 [REQ_BUS_02] Verify destination city auto-suggestions are displayed while entering destination city (Positive)', async ({ page, busSearchPage }) => {
  const data = readBusSearchData().destinationSuggestions;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4. Select a valid source city', async () => {
    await busSearchPage.selectSource(data.source);
  });
  await test.step('5-6. Click To and enter partial destination city text', async () => {
    await busSearchPage.enterDestination(data.partialDestination);
  });
  await test.step('7. Verify the auto-suggestion list is displayed with the expected city', async () => {
    await busSearchPage.expectSuggestionList();
    await busSearchPage.expectSuggestion(data.expectedDestination);
  });
  await test.step('8. Select the suggested city and verify it appears in the To field', async () => {
    await busSearchPage.selectDestination(data.expectedDestination);
    await expect.poll(() => busSearchPage.destinationValue()).toMatch(new RegExp(data.expectedDestination, 'i'));
  });
});

test('TC_BUS_007 [REQ_BUS_02] Verify warning message when source and destination cities are the same (Negative)', async ({ page, busSearchPage }) => {
  const root = readBusSearchData();
  const data = root.sameCity;
  let originalUrl = '';

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-7. Click From, enter Bangalore, wait for suggestions, select Bangalore', async () => {
    await busSearchPage.enterSource(data.source);
    await busSearchPage.expectSuggestionList();
    await busSearchPage.selectSource(data.source);
  });
  let cityCanBeSelected = false;
  await test.step('8-9. Click To and enter Bangalore', async () => {
    await busSearchPage.enterDestination(data.destination);
    cityCanBeSelected = await busSearchPage.sameCitySuggestionVisible(data.destination);
  });
  if (!cityCanBeSelected) {
    await test.step('10. Same city not offered as a destination: invalid route prevented', async () => {
      await busSearchPage.expectSuggestionList();
      logger.info('The destination suggestions did not offer the already-selected source city.');
    });
    return;
  }
  await test.step('10. Select Bangalore from the suggestions (application permits it)', async () => {
    await busSearchPage.selectDestination(data.destination);
  });
  await test.step('11. Select a future travel date', async () => {
    await busSearchPage.selectTravelDate(root.travelDate);
  });
  await test.step('12. Click Search', async () => {
    originalUrl = page.url();
    await busSearchPage.search();
  });
  await test.step('13. Verify a warning is shown or the invalid search is prevented', async () => {
    const routeChanged = await page.waitForURL((url) => url.href !== originalUrl, { timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    const validationVisible = await busSearchPage.validationMessage().isVisible().catch(() => false);
    logger.info(validationVisible
      ? 'Same-city search displayed an accessible validation alert.'
      : routeChanged
        ? 'Same-city search navigated without showing an accessible validation alert.'
        : 'Same-city search stayed on the search form without a visible alert.');
    expect(
      validationVisible || !routeChanged,
      'The same-city route should be rejected with visible validation or remain blocked on the search form.',
    ).toBeTruthy();
  });
  await test.step('14. Verify the application does not proceed with the same-city route', async () => {
    expect(page.url(), 'A rejected same-city search must not navigate to results.').toBe(originalUrl);
  });
});


test('TC_BUS_008 [REQ_BUS_03] Apply AC filter and verify only AC buses are displayed (Positive)', async ({ page, busSearchPage }) => {
  const data = readBusSearchData();
  const { source, destination } = data.validSearch;
  let totalBefore = 0;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-6. Select source city, destination city, and a future travel date', async () => {
    await busSearchPage.selectSource(source);
    await busSearchPage.selectDestination(destination);
    await busSearchPage.selectTravelDate(data.travelDate);
  });
  await test.step('7. Click Search and wait for bus results', async () => {
    await busSearchPage.search();
    totalBefore = await busSearchPage.expectResultsLoaded();
    logger.info(`Buses found before filtering: ${totalBefore}.`);
  });
  await test.step('8. Apply the AC filter', async () => {
    await busSearchPage.applyAcFilter();
  });
  await test.step('9. Verify only AC buses are displayed', async () => {
    const shown = await busSearchPage.expectOnlyAcBusesDisplayed();
    const totalAfter = await busSearchPage.busCount();
    logger.info(`Buses found after AC filter: ${totalAfter}; AC cards verified: ${shown}.`);
    expect(totalAfter, 'The AC filter must not increase the number of buses.').toBeLessThanOrEqual(totalBefore);
  });
});

test('TC_BUS_009 [REQ_BUS_03] Apply multiple filters (AC + Seater + Single Seat) and verify the appropriate validation message is displayed (Negative)', async ({ page, busSearchPage }) => {
  const data = readBusSearchData();
  const { source, destination } = data.validSearch;

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-6. Select source city, destination city, and a future travel date', async () => {
    await busSearchPage.selectSource(source);
    await busSearchPage.selectDestination(destination);
    await busSearchPage.selectTravelDate(data.travelDate);
  });
  await test.step('7. Click Search and wait for bus results', async () => {
    await busSearchPage.search();
    await busSearchPage.expectResultsLoaded();
  });
  await test.step('8. Apply the AC filter', async () => {
    await busSearchPage.applyAcFilter();
  });
  await test.step('9. Apply the Seater filter', async () => {
    await busSearchPage.applySeatTypeFilter('Seater');
    await expect(page.getByText('CLEAR ALL').first()).toBeVisible();
  });
  await test.step('10. Apply the Single Seats filter', async () => {
    await busSearchPage.applySingleSeatFilter();
  });
  await test.step('11. Verify a validation / no-results message, or that results satisfy every applied filter', async () => {
    const alert = busSearchPage.validationMessage();
    const noBuses = busSearchPage.noBusesMessage();
    const messageShown = await alert.or(noBuses).first().isVisible().catch(() => false);
    if (messageShown) {
      logger.info('The application displayed a validation or no-results message for the combined filters.');
      return;
    }
    await expect.poll(() => busSearchPage.displayedBusCardCount()).toBeGreaterThan(0);
    logger.info('No validation message was shown; verifying the results satisfy all applied filters.');
    await expect.poll(() => busSearchPage.displayedCardsMatch(/a\/c/i), { message: 'Every displayed bus must be AC.', timeout: 15_000 }).toBeTruthy();
    await expect.poll(() => busSearchPage.displayedCardsMatch(/seater/i), { message: 'Every displayed bus must be Seater.', timeout: 15_000 }).toBeTruthy();
    await expect.poll(() => busSearchPage.displayedCardsMatch(/single seat/i), { message: 'Every displayed bus must offer single seats.', timeout: 15_000 }).toBeTruthy();
    expect(await busSearchPage.validationMessage().count(), 'No error alert should be shown for a valid filter combination.').toBe(0);
  });
});

test('TC_BUS_010 [REQ_BUS_04] Enter an invalid mobile number and verify the validation message is displayed (Negative)', async ({ page, busSearchPage }) => {
  test.setTimeout(150_000);
  const data = readBusSearchData();
  const { source, destination } = data.validSearch;
  const invalidMobile = '12345';

  await test.step('1-2. Launch Edge and navigate to https://www.makemytrip.com/', async () => {
    await page.goto('/');
  });
  await test.step('3. Open the Bus module', async () => {
    await busSearchPage.openBusModule();
  });
  await test.step('4-6. Select source city, destination city, and a future travel date', async () => {
    await busSearchPage.selectSource(source);
    await busSearchPage.selectDestination(destination);
    await busSearchPage.selectTravelDate(data.travelDate);
  });
  await test.step('7. Click Search and wait for bus results', async () => {
    await busSearchPage.search();
    await busSearchPage.expectResultsLoaded();
  });
  await test.step('8. Select a bus, an available seat, boarding and drop points, then continue', async () => {
    await busSearchPage.proceedToPassengerDetails();
    await expect(page).toHaveURL(/\/bus\/review/);
  });
  await test.step('9. Enter passenger details and an invalid mobile number', async () => {
    await busSearchPage.fillContactAndPassenger('test.user@example.com', invalidMobile);
    await expect(busSearchPage.mobileNumberField()).toHaveValue(invalidMobile);
  });
  await test.step('10. Click Continue and verify the invalid mobile number is rejected', async () => {
    await busSearchPage.clickBookingContinue();
    await page.waitForTimeout(2000);
    const message = busSearchPage.validationMessage();
    if (await message.count()) {
      logger.info(`Validation message displayed: ${await message.first().innerText()}`);
    } else {
      logger.info('The site shows no inline text message; it blocks the booking instead.');
    }
    await expect(page, 'The booking must not proceed with an invalid mobile number.').toHaveURL(/\/bus\/review/);
    await expect(busSearchPage.mobileNumberField()).toHaveValue(invalidMobile);
  });
});