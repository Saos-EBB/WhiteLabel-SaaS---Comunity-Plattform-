import { io, Socket } from 'socket.io-client'
import { useAuthStore } from './store/authStore'

let socket: Socket | null = null

export function connect(): Socket {
  if (socket?.connected) return socket

  const { accessToken } = useAuthStore.getState()

  socket = io('http://localhost:3000', {
    auth: { token: accessToken },
    transports: ['websocket'],
  })

  return socket
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}
