import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents } from '../../shared/events/app-events'

@WebSocketGateway({
  namespace: '/hidden-beef',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class HiddenBeefGateway {
  @WebSocketServer()
  server!: Server

  @SubscribeMessage('join_beef')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() beefId: string) {
    client.join(`beef:${beefId}`)
  }

  @SubscribeMessage('leave_beef')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() beefId: string) {
    client.leave(`beef:${beefId}`)
  }

  @OnEvent(AppEvents.beefVote)
  onVote(payload: { beefId: string; initiatorCoins: number; targetCoins: number; totalVotes: number }) {
    this.server.to(`beef:${payload.beefId}`).emit('beef:vote_update', {
      initiator_coins: payload.initiatorCoins,
      target_coins: payload.targetCoins,
      total_votes: payload.totalVotes,
    })
  }

  @OnEvent(AppEvents.beefComment)
  onComment(payload: { beefId: string; comment: any }) {
    this.server.to(`beef:${payload.beefId}`).emit('beef:comment_new', payload.comment)
  }

  @OnEvent(AppEvents.beefClosed)
  onClosed(payload: { beefId: string; winnerId: string | null }) {
    this.server.to(`beef:${payload.beefId}`).emit('beef:closed', { winner_id: payload.winnerId })
  }
}
