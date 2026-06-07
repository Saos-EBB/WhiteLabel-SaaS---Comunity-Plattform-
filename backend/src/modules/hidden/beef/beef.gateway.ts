import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents } from '../../shared/events/app-events'
import type { BeefGameStateUpdateEvent, BeefGameFinishedEvent, BeefGameGoEvent, BeefGameBoardUpdateEvent } from '../../shared/events/app-events'
import { BeefGameService } from './beef-game.service'

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

  constructor(private readonly beefGameService: BeefGameService) {}

  @SubscribeMessage('join_beef')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() beefId: string) {
    client.join(`beef:${beefId}`)
  }

  @SubscribeMessage('leave_beef')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() beefId: string) {
    client.leave(`beef:${beefId}`)
  }

  // Reaction test: client sends click, server records receipt time
  @SubscribeMessage('game:reaction_click')
  async handleReactionClick(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { beefId: string; userId: string },
  ) {
    await this.beefGameService.applyReactionClick(payload.beefId, payload.userId, Date.now())
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

  @OnEvent(AppEvents.beefGameStateUpdate)
  onGameStateUpdate(payload: BeefGameStateUpdateEvent) {
    this.server.to(`beef:${payload.beefId}`).emit('game:state_update', {
      state: payload.state,
      game_type: payload.gameType,
      initiator_ready: payload.initiatorReady,
      target_ready: payload.targetReady,
    })
  }

  @OnEvent(AppEvents.beefGameGo)
  onGameGo(payload: BeefGameGoEvent) {
    this.server.to(`beef:${payload.beefId}`).emit('game:go', { sent_at: payload.sentAt })
  }

  @OnEvent(AppEvents.beefGameBoardUpdate)
  onGameBoardUpdate(payload: BeefGameBoardUpdateEvent) {
    this.server.to(`beef:${payload.beefId}`).emit('game:board_update', {
      game_type: payload.gameType,
      ...payload.board,
    })
  }

  @OnEvent(AppEvents.beefGameFinished)
  onGameFinished(payload: BeefGameFinishedEvent) {
    this.server.to(`beef:${payload.beefId}`).emit('game:finished', { winner_id: payload.winnerId })
  }
}
