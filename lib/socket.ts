import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connect(token: string): Socket {
  if (socket?.connected) return socket

  socket = io('http://localhost:3000', {
    auth: { token },
  })

  return socket
}

export function reconnect(token: string): Socket {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  return connect(token)
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
