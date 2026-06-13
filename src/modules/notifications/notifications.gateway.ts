// src/modules/notifications/notifications.gateway.ts
import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    // 🔥 La correction est ici : on autorise un tableau contenant les ports 3000 et 3001
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001', 
      process.env.FRONTEND_URL || ''
    ], 
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server!: Server; 

  handleConnection(client: Socket) {
    console.log(`Admin connecté au WebSocket : ${client.id}`);
    // Plus tard, tu pourras ajouter une vérification JWT ici pour t'assurer 
    // que seul un admin peut se connecter à ce socket.
  }

  handleDisconnect(client: Socket) {
    console.log(`Admin déconnecté : ${client.id}`);
  }

  // Méthode personnalisée pour envoyer l'alerte
  notifyAdminOfNewRequest(serviceRequest: any) {
    this.server.emit('new-intervention', {
      title: 'Nouvelle demande de nettoyage !',
      message: `${serviceRequest.customerName} a réservé une intervention.`,
      data: serviceRequest,
    });
  }
}