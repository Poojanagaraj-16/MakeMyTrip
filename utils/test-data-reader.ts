import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface SearchCase {
  source: string;
  destination: string;
}

interface SuggestionCase {
  partialSource: string;
  expectedSource: string;
}

interface DestinationSuggestionCase {
  source: string;
  partialDestination: string;
  expectedDestination: string;
}

interface SameCityCase {
  source: string;
  destination: string;
}

export interface BusSearchData {
  validSearch: SearchCase;
  sourceSuggestions: SuggestionCase;
  destinationSuggestions: DestinationSuggestionCase;
  sameCity: SameCityCase;
  travelDate: string;
}

function readRecord(): Record<string, unknown> {
  const filename = resolve(process.cwd(), 'test-data', 'bus-search-data.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filename, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read valid JSON from ${filename}.`, { cause: error });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filename} must contain a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function recordAt(
  parent: Record<string, unknown>,
  key: string,
  filename: string,
): Record<string, unknown> {
  const value = parent[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${filename} must contain an object for "${key}".`);
  }
  return value as Record<string, unknown>;
}

function stringAt(record: Record<string, unknown>, key: string, section: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`test-data/bus-search-data.json must contain a non-empty string at "${section}.${key}".`);
  }
  return value;
}

function futureTravelDate(root: Record<string, unknown>): string {
  const offset = root.travelDateOffsetDays;
  if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 1) {
    throw new Error('test-data/bus-search-data.json must set travelDateOffsetDays to a positive integer.');
  }
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function readBusSearchData(): BusSearchData {
  const filename = 'test-data/bus-search-data.json';
  const root = readRecord();
  const validSearch = recordAt(root, 'validSearch', filename);
  const sourceSuggestions = recordAt(root, 'sourceSuggestions', filename);
  const destinationSuggestions = recordAt(root, 'destinationSuggestions', filename);
  const sameCity = recordAt(root, 'sameCity', filename);

  return {
    validSearch: {
      source: stringAt(validSearch, 'source', 'validSearch'),
      destination: stringAt(validSearch, 'destination', 'validSearch'),
    },
    sourceSuggestions: {
      partialSource: stringAt(sourceSuggestions, 'partialSource', 'sourceSuggestions'),
      expectedSource: stringAt(sourceSuggestions, 'expectedSource', 'sourceSuggestions'),
    },
    destinationSuggestions: {
      source: stringAt(destinationSuggestions, 'source', 'destinationSuggestions'),
      partialDestination: stringAt(destinationSuggestions, 'partialDestination', 'destinationSuggestions'),
      expectedDestination: stringAt(destinationSuggestions, 'expectedDestination', 'destinationSuggestions'),
    },
    sameCity: {
      source: stringAt(sameCity, 'source', 'sameCity'),
      destination: stringAt(sameCity, 'destination', 'sameCity'),
    },
    travelDate: futureTravelDate(root),
  };
}
