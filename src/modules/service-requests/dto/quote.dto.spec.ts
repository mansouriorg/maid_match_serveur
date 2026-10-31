// The input rules use decorators that read type information; NestJS loads
// this library when the API starts, so a test of the rules alone loads it too.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuoteDto } from './quote.dto';

describe('QuoteDto', () => {
  const valid = {
    cleaningType: 'deep',
    durationHours: 3,
    hasSupplies: false,
    extras: ['ironing'],
  };

  it('accepts what the booking form sends', async () => {
    const errors = await validate(plainToInstance(QuoteDto, valid));
    expect(errors).toHaveLength(0);
  });

  it('refuses a missing type or an impossible duration', async () => {
    const errors = await validate(
      plainToInstance(QuoteDto, {
        ...valid,
        cleaningType: '',
        durationHours: 0,
      }),
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'cleaningType',
      'durationHours',
    ]);
  });
});
