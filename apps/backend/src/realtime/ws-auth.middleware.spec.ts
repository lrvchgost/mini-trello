import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { WsAuthMiddleware, type WsSocketData } from './ws-auth.middleware';

function createSocket(token?: string): Socket {
  return {
    id: 'socket-1',
    data: {} as WsSocketData,
    handshake: { auth: token ? { token } : {} },
  } as unknown as Socket;
}

function createServer(): { server: Server; use: jest.Mock } {
  const use = jest.fn();
  return { server: { use } as unknown as Server, use };
}

describe('WsAuthMiddleware', () => {
  let jwtService: jest.Mocked<JwtService>;
  let middleware: WsAuthMiddleware;

  beforeEach(() => {
    jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    middleware = new WsAuthMiddleware(jwtService);
  });

  it('puts the user on socket.data for a valid token', () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'user@example.com' });
    const socket = createSocket('valid-token');
    const next = jest.fn();

    middleware.authenticate(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect((socket.data as WsSocketData).user).toEqual({ id: 'user-1', email: 'user@example.com' });
  });

  it('rejects a missing token', () => {
    const next = jest.fn();

    middleware.authenticate(createSocket(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const socket = createSocket('bad-token');
    const next = jest.fn();

    middleware.authenticate(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((socket.data as WsSocketData).user).toBeUndefined();
  });

  it('registers the middleware on the server only once', () => {
    const { server, use } = createServer();

    middleware.apply(server);
    middleware.apply(server);

    expect(use).toHaveBeenCalledTimes(1);
  });
});
