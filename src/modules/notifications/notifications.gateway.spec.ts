import {
  ADMINS_ROOM,
  NotificationsGateway,
  socketOrigin,
} from './notifications.gateway';

type Next = (error?: Error) => void;

function startGateway(verifyAsync: jest.Mock) {
  const gateway = new NotificationsGateway({ verifyAsync } as any);
  let middleware: (socket: any, next: Next) => void = () => undefined;
  gateway.afterInit({ use: (fn: any) => (middleware = fn) } as any);
  const run = (socket: any, next: Next) => middleware(socket, next);
  return { gateway, run };
}

const socketWith = (auth: any) => ({ handshake: { auth } });
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('NotificationsGateway', () => {
  it('refuses a socket without a token', () => {
    const { run } = startGateway(jest.fn());
    const next = jest.fn();

    run(socketWith({}), next);

    expect(next).toHaveBeenCalledWith(new Error('Unauthorized'));
  });

  it('refuses a socket with a bad token', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('jwt malformed'));
    const { run } = startGateway(verify);
    const next = jest.fn();

    run(socketWith({ token: 'nope' }), next);
    await flush();

    expect(verify).toHaveBeenCalledWith('nope');
    expect(next).toHaveBeenCalledWith(new Error('Unauthorized'));
  });

  it('accepts a socket with a valid token', async () => {
    const verify = jest.fn().mockResolvedValue({ sub: 1 });
    const { run } = startGateway(verify);
    const next = jest.fn();

    run(socketWith({ token: 'good' }), next);
    await flush();

    expect(next).toHaveBeenCalledWith();
  });

  it('puts a connected admin in the admins room', () => {
    const { gateway } = startGateway(jest.fn());
    const client = { join: jest.fn() };

    gateway.handleConnection(client as any);

    expect(client.join).toHaveBeenCalledWith(ADMINS_ROOM);
  });

  it('sends events to the admins room only', () => {
    const { gateway } = startGateway(jest.fn());
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as any;

    gateway.emitToAdmins('new-intervention', { id: 1 });

    expect(to).toHaveBeenCalledWith(ADMINS_ROOM);
    expect(emit).toHaveBeenCalledWith('new-intervention', { id: 1 });
  });
});

describe('socketOrigin', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('allows every site when nothing is configured', () => {
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
    const callback = jest.fn();

    socketOrigin('https://anything.example', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('allows only the configured sites, read at connection time', () => {
    process.env.CORS_ORIGINS = 'https://a.example, https://b.example';
    const callback = jest.fn();

    socketOrigin('https://a.example', callback);
    socketOrigin('https://evil.example', callback);

    expect(callback).toHaveBeenNthCalledWith(1, null, true);
    expect(callback).toHaveBeenNthCalledWith(2, null, false);
  });
});
