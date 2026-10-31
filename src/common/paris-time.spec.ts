import { addDaysInParis } from './paris-time';

describe('addDaysInParis', () => {
  it('adds whole days at the same Paris time', () => {
    // 09:00 in Paris (winter time, UTC+1)
    const start = new Date('2026-12-01T08:00:00.000Z');
    expect(addDaysInParis(start, 7).toISOString()).toBe(
      '2026-12-08T08:00:00.000Z',
    );
  });

  it('keeps 09:00 in Paris across the change to winter time', () => {
    // 09:00 summer time (UTC+2) on 20 October; clocks change on 25 October
    const start = new Date('2026-10-20T07:00:00.000Z');
    expect(addDaysInParis(start, 7).toISOString()).toBe(
      '2026-10-27T08:00:00.000Z',
    );
  });

  it('keeps 09:00 in Paris across the change to summer time', () => {
    // 09:00 winter time (UTC+1) on 24 March 2027; clocks change on 28 March
    const start = new Date('2027-03-24T08:00:00.000Z');
    expect(addDaysInParis(start, 14).toISOString()).toBe(
      '2027-04-07T07:00:00.000Z',
    );
  });
});
