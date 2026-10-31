// Dates in Paris time. France changes clocks twice a year, so "the same time,
// 7 days later" is not always exactly 7 x 24 hours later.
const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function parisParts(date: Date): Record<string, number> {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value);
    }
  }
  return values;
}

// How far Paris time is ahead of UTC at a given moment, in milliseconds.
function parisOffsetMs(timestamp: number): number {
  const p = parisParts(new Date(timestamp));
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

// The same Paris clock time, a number of days later.
export function addDaysInParis(date: Date, days: number): Date {
  const p = parisParts(date);
  const wall = Date.UTC(
    p.year,
    p.month - 1,
    p.day + days,
    p.hour,
    p.minute,
    p.second,
  );
  let timestamp = wall - parisOffsetMs(wall);
  timestamp = wall - parisOffsetMs(timestamp);
  return new Date(timestamp);
}
