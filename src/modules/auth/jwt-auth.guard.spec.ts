import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

class FakeController {
  @Public()
  openRoute() {
    return 'open';
  }

  closedRoute() {
    return 'closed';
  }
}

function contextFor(handler: () => string): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => FakeController,
  } as unknown as ExecutionContext;
}

const openContext = contextFor(FakeController.prototype.openRoute);
const closedContext = contextFor(FakeController.prototype.closedRoute);

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });

  it('lets a visitor without a token use a public route', () => {
    expect(guard.handleRequest(null, false, undefined, openContext)).toBeNull();
  });

  it('keeps the user on a public route when the token is valid', () => {
    const user = { userId: 3, email: 'a@b.tn' };

    expect(guard.handleRequest(null, user, undefined, openContext)).toBe(user);
  });

  it('lets a logged-in admin use a protected route', () => {
    const user = { userId: 3, email: 'a@b.tn' };

    expect(guard.handleRequest(null, user, undefined, closedContext)).toBe(
      user,
    );
  });

  it('refuses a visitor without a token on a protected route', () => {
    expect(() =>
      guard.handleRequest(null, false, undefined, closedContext),
    ).toThrow(UnauthorizedException);
  });

  it('passes on the error when the token check itself fails', () => {
    expect(() =>
      guard.handleRequest(new Error('boom'), false, undefined, closedContext),
    ).toThrow('boom');
  });
});
