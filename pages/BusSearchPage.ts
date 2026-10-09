import { expect, type Locator, type Page } from '@playwright/test';
import { logger } from '../utils/logger';
import { BasePage } from './BasePage';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class BusSearchPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get sourceField(): Locator {
    return this.page.getByRole('textbox', { name: /^From India$/i });
  }

  private get destinationField(): Locator {
    return this.page.getByRole('textbox', { name: /^To India$/i });
  }

  private sourceSearchField(): Locator {
    return this.page.getByRole('textbox', { name: 'From', exact: true });
  }

  private destinationSearchField(): Locator {
    return this.page.getByRole('textbox', { name: 'To', exact: true });
  }

  private get dateField(): Locator {
    return this.page.getByRole('textbox', { name: /travel date/i });
  }

  private async dismissOptionalSignInPrompt(): Promise<void> {
    const mobileField = this.page.getByRole('textbox', { name: /enter mobile number/i });
    try {
      await mobileField.waitFor({ state: 'visible', timeout: 1_500 });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        return;
      }
      throw error;
    }

    const close = this.page.locator('[data-cy="closeModal"]');
    await expect(close).toBeVisible();
    await close.click();
    await expect(mobileField).toBeHidden();
    logger.info('Closed the optional sign-in prompt.');
  }

  private suggestion(city: string): Locator {
    const name = new RegExp(escapeRegex(city), 'i');
    return this.page.getByRole('option', { name });
  }

  async openBusModule(): Promise<void> {
    logger.info('Opening the MakeMyTrip bus-search page.');
    await this.open('/bus-tickets/');
    await expect(this.sourceField).toBeVisible();
    await expect(this.destinationField).toBeVisible();
    await this.dismissOptionalSignInPrompt();
  }

  async enterSource(query: string): Promise<void> {
    await this.sourceField.click();
    await this.sourceSearchField().fill(query);
    logger.info('Entered source-city search text.');
  }

  async enterDestination(query: string): Promise<void> {
    if (!await this.destinationSearchField().isVisible().catch(() => false)) {
      await this.destinationField.click();
    }
    await this.destinationSearchField().fill(query);
    logger.info('Entered destination-city search text.');
  }

  async expectSuggestionList(): Promise<void> {
    await expect(this.page.getByRole('option').first()).toBeVisible();
  }

  async expectSuggestion(city: string): Promise<void> {
    await expect(this.suggestion(city).first()).toBeVisible();
    logger.info(`Verified the ${city} suggestion.`);
  }

  async selectSource(city: string): Promise<void> {
    if (!await this.sourceSearchField().isVisible().catch(() => false)) {
      await this.enterSource(city);
    }
    await this.expectSuggestion(city);
    await this.suggestion(city).first().click();
    await expect(this.sourceField).toHaveValue(new RegExp(escapeRegex(city), 'i'));
    logger.info(`Selected source city ${city}.`);
  }

  async selectDestination(city: string): Promise<void> {
    if (!await this.destinationSearchField().isVisible().catch(() => false)) {
      await this.enterDestination(city);
    }
    await this.expectSuggestion(city);
    await this.suggestion(city).first().click();
    await expect(this.destinationField).toHaveValue(new RegExp(escapeRegex(city), 'i'));
    logger.info(`Selected destination city ${city}.`);
  }

  async selectTravelDate(isoDate: string): Promise<void> {
    const date = new Date(`${isoDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)
      || Number.isNaN(date.getTime())
      || date.toISOString().slice(0, 10) !== isoDate
      || date.getTime() <= Date.now()) {
      throw new Error(`Travel date must be a valid future ISO date; received "${isoDate}".`);
    }

    const visibleCalendarDay = this.page.getByRole('gridcell').first();
    if (!await visibleCalendarDay.isVisible().catch(() => false)) {
      await this.dateField.click();
    }
    const monthName = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const calendarDay = this.page.getByRole('gridcell', {
      name: new RegExp(
        `\\b${monthName.slice(0, 3)}\\s+0?${date.getUTCDate()}\\s+${date.getUTCFullYear()}\\b`,
        'i',
      ),
    });
    const nextMonth = this.page.getByRole('button', { name: /next month/i });

    for (let monthOffset = 0; monthOffset < 13; monthOffset += 1) {
      if (await calendarDay.count() > 0 && await calendarDay.first().isVisible()) {
        await calendarDay.first().click();
        logger.info(`Selected travel date ${isoDate}.`);
        return;
      }
      if (await nextMonth.count() === 0 || !await nextMonth.first().isVisible()) {
        break;
      }
      await nextMonth.first().click();
    }

    throw new Error(`The calendar did not expose an accessible date for ${isoDate}.`);
  }

  async verifySearchCriteria(source: string, destination: string, date: string): Promise<void> {
    await expect(this.sourceField).toHaveValue(new RegExp(escapeRegex(source), 'i'));
    await expect(this.destinationField).toHaveValue(new RegExp(escapeRegex(destination), 'i'));
    const selectedDate = new Date(`${date}T00:00:00.000Z`);
    const displayedDate = this.page.locator('[data-cy="departureDate"]');
    await expect(displayedDate).toContainText(String(selectedDate.getUTCDate()));
    await expect(displayedDate).toContainText(
      selectedDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
    );
    await expect(displayedDate).toContainText(String(selectedDate.getUTCFullYear()).slice(-2));
    logger.info('Verified the selected source, destination, and travel date.');
  }

  async search(): Promise<void> {
    await this.page.getByRole('button', { name: /search buses|search/i }).click();
    logger.info('Submitted the bus search.');
  }

  async sourceValue(): Promise<string> {
    return this.sourceField.inputValue();
  }

  async destinationValue(): Promise<string> {
    return this.destinationField.inputValue();
  }

  async sameCitySuggestionVisible(city: string): Promise<boolean> {
    return this.suggestion(city).first().isVisible().catch(() => false);
  }

  validationMessage(): Locator {
    return this.page.getByRole('alert').filter({ hasText: /\S/ });
  }

  private busCards(): Locator {
    return this.page.locator('[id^="listing-bus-card"]');
  }

  private busCountLabel(): Locator {
    return this.page.getByText(/\d+ buses found/).first();
  }

  async expectResultsLoaded(): Promise<number> {
    await expect(this.page).toHaveURL(/\/bus-tickets\/search/);
    await expect(this.busCards().first()).toBeVisible({ timeout: 30_000 });
    return this.busCount();
  }

  async busCount(): Promise<number> {
    const label = await this.busCountLabel().innerText();
    return Number(/(\d+)\s+buses found/.exec(label)?.[1] ?? 0);
  }

  async applyAcFilter(): Promise<void> {
    const acTab = this.page
      .locator('[class*="FilterTabs_tabSection"]')
      .filter({ has: this.page.getByText(/^AC$/) });
    await acTab.first().click();
    await expect(this.page.getByText('CLEAR ALL').first()).toBeVisible();
    logger.info('Applied the AC filter.');
  }

  async expectOnlyAcBusesDisplayed(): Promise<number> {
    const cards = this.busCards();
    await expect(cards.first()).toBeVisible();
    await expect(cards.filter({ hasText: /non[\s-]*a\/?c/i })).toHaveCount(0);
    await expect(cards.filter({ hasNotText: /a\/c/i })).toHaveCount(0);
    return cards.count();
  }

  async applySeatTypeFilter(label: 'Seater' | 'Sleeper'): Promise<void> {
    const tab = this.page
      .locator('[class*="FilterTabs_tabSection"]')
      .filter({ has: this.page.getByText(label, { exact: true }) });
    await tab.first().click();
    logger.info(`Applied the ${label} filter.`);
  }

  async applySingleSeatFilter(): Promise<void> {
    await this.page.getByText('Single Seats', { exact: true }).first().click();
    logger.info('Applied the Single Seats filter.');
  }

  noBusesMessage(): Locator {
    return this.page.getByText(/no buses (found|available)|no results found|no services|^\s*0 buses found/i).first();
  }

  async displayedBusCardCount(): Promise<number> {
    return this.busCards().count();
  }

  async displayedCardsMatch(pattern: RegExp): Promise<boolean> {
    const total = await this.busCards().count();
    const matching = await this.busCards().filter({ hasText: pattern }).count();
    return total > 0 && total === matching;
  }

  async proceedToPassengerDetails(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
    await this.page.waitForTimeout(3000);
    const card = this.busCards().first();
    await card.getByRole('button', { name: 'SELECT SEATS' }).click();
    await card.getByText('Know your seats').waitFor({ timeout: 20_000 });
    await card
      .locator('[class*="SeatMapContainer_seat__"]')
      .filter({ has: this.page.locator('img[src*="_Available"]') })
      .first()
      .click();
    const points = card.locator('input[name="boardingPoint"], input[name="dropPoint"]');
    await points.first().waitFor({ state: 'attached' });
    for (const name of ['boardingPoint', 'dropPoint']) {
      const label = card.locator(`label:has(input[name="${name}"])`).first();
      await label.click();
    }
    await card.getByText(/^continue$/i).first().click();
    await this.page.waitForURL(/\/bus\/review/, { timeout: 30_000 });
    logger.info('Reached the passenger details page.');
  }

  mobileNumberField(): Locator {
    return this.page.locator('#mobileNumber');
  }

  async fillContactAndPassenger(email: string, mobile: string): Promise<void> {
    await this.page.locator('#fname').fill('Test User');
    await this.page.locator('#age').fill('30');
    await this.page.getByText('Male', { exact: true }).first().click();
    await this.page.locator('#contactEmail').fill(email);
    await this.mobileNumberField().fill(mobile);
  }

  async clickBookingContinue(): Promise<void> {
    await this.page.getByText('Continue', { exact: true }).last().click();
  }
}