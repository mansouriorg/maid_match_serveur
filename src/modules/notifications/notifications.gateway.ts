import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

// Every connected socket is an admin: a bad token is refused.
export const ADMINS_ROOM = 'admins';

// Which websites may open a socket. It is read when a browser connects (not
// when this file is loaded), so the values of the .env file are available.
export function socketOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  const configured = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
    .join(',')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  // Nothing configured (local development): any site, like the HTTP API.
  if (configured.length === 0 || origin === undefined) {
    callback(null, true);
    return;
  }
  callback(null, configured.includes(origin));
}

@WebSocketGateway({
  cors: { origin: socketOrigin, credentials: false },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  // Runs once. Every new socket must send a valid admin token in "auth".
  afterInit(server: Server) {
    server.use((socket, next) => {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token.length === 0) {
        next(new Error('Unauthorized'));
        return;
      }
      this.jwtService.verifyAsync(token).then(
        () => next(),
        () => next(new Error('Unauthorized')),
      );
    });
  }

  handleConnection(client: Socket) {
    void client.join(ADMINS_ROOM);
  }

  // Sends an event to the connected admins only.
  emitToAdmins(event: string, payload: unknown) {
    this.server.to(ADMINS_ROOM).emit(event, payload);
  }
}
