import { io, Socket } from 'socket.io-client'
import { useAuthStore } from './store/authStore'

let socket: Socket | null = null

export function connect(): Socket {
  const token = useAuthStore.getState().accessToken
  if (socket?.connected) return socket
  if (socket) {
    socket.disconnect()
    socket = null
  }
  socket = io('http://localhost:3000', { auth: { token } })
  return socket
}

export function reconnect(): Socket {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  return connect()
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
