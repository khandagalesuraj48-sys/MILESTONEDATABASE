import { Experience } from '../models/types';

/**
 * Calculates total professional experience from experience items,
 * merging overlapping intervals to avoid double-counting concurrent employment.
 * 
 * @param experienceList List of Experience items with fromYear, toYear, and isCurrent
 * @returns Total distinct years of experience as a number rounded to 1 decimal place
 */
export function calculateDistinctExperienceYears(experienceList: Experience[]): number {
  if (!experienceList || experienceList.length === 0) {
    return 0;
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Convert each experience item into [startMonthIndex, endMonthIndex] (months since year 1900)
  interface DateRange {
    startMonth: number;
    endMonth: number;
  }

  const ranges: DateRange[] = [];

  for (const exp of experienceList) {
    const fromStr = (exp.fromYear || '').trim();
    const toStr = (exp.toYear || '').trim();

    if (!fromStr) continue;

    // Parse start date
    const start = parseYearMonth(fromStr, false);
    if (!start) continue;

    // Parse end date
    let end: { year: number; month: number } | null = null;
    if (exp.isCurrent || toStr.toLowerCase() === 'present' || toStr.toLowerCase() === 'current' || !toStr) {
      end = { year: currentYear, month: currentMonth };
    } else {
      end = parseYearMonth(toStr, true);
    }

    if (!end) continue;

    const startMonthIndex = (start.year - 1900) * 12 + (start.month - 1);
    const endMonthIndex = (end.year - 1900) * 12 + (end.month - 1);

    if (endMonthIndex >= startMonthIndex) {
      ranges.push({ startMonth: startMonthIndex, endMonth: endMonthIndex });
    }
  }

  if (ranges.length === 0) {
    return 0;
  }

  // Sort ranges by start month
  ranges.sort((a, b) => a.startMonth - b.startMonth);

  // Merge overlapping intervals
  const merged: DateRange[] = [ranges[0]];

  for (let i = 1; i < ranges.length; i++) {
    const current = ranges[i];
    const last = merged[merged.length - 1];

    if (current.startMonth <= last.endMonth) {
      // Overlap or contiguous: merge
      last.endMonth = Math.max(last.endMonth, current.endMonth);
    } else {
      merged.push(current);
    }
  }

  // Calculate total months across merged non-overlapping intervals
  let totalMonths = 0;
  for (const r of merged) {
    totalMonths += (r.endMonth - r.startMonth + 1);
  }

  const years = totalMonths / 12;
  return Math.round(years * 10) / 10;
}

function parseYearMonth(str: string, isEnd: boolean): { year: number; month: number } | null {
  if (!str) return null;

  // Check YYYY-MM
  const yyyyMm = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyyMm) {
    const year = parseInt(yyyyMm[1], 10);
    const month = parseInt(yyyyMm[2], 10);
    if (year >= 1950 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Check 4-digit year
  const yearMatch = str.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return { year, month: isEnd ? 12 : 1 };
  }

  return null;
}

