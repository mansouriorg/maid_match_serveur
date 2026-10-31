import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

const SECRET = 'a-long-random-secret-used-only-in-this-test';

function configWith(getOrThrow: (key: string) => string): ConfigService {
  return { getOrThrow } as unknown as ConfigService;
}

describe('JwtStrategy', () => {
  it('reads the secret from JWT_SECRET', () => {
    const getOrThrow = jest.fn().mockReturnValue(SECRET);

    new JwtStrategy(configWith(getOrThrow));

    expect(getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('refuses to start when JWT_SECRET is missing', () => {
    const getOrThrow = jest.fn(() => {
      throw new Error('JWT_SECRET is missing');
    });

    expect(() => new JwtStrategy(configWith(getOrThrow))).toThrow(
      'JWT_SECRET is missing',
    );
  });

  it('turns a valid token into the admin id and e-mail', () => {
    const strategy = new JwtStrategy(configWith(() => SECRET));

    expect(strategy.validate({ sub: 4, email: 'a@b.tn' })).toEqual({
      userId: 4,
      email: 'a@b.tn',
    });
  });
});
