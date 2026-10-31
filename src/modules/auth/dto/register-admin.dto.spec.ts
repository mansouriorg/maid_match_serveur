import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterAdminDto } from './register-admin.dto';

describe('RegisterAdminDto', () => {
  it('refuses a password shorter than 12 characters', async () => {
    const dto = plainToInstance(RegisterAdminDto, {
      email: 'new-admin@example.com',
      password: 'short-pass',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('accepts a password of 12 characters or more', async () => {
    const dto = plainToInstance(RegisterAdminDto, {
      email: 'new-admin@example.com',
      password: 'a-long-password',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
