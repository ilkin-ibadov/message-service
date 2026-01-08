import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'

import { MessageService } from './message.service'
import { RedisService } from '../redis/redis.service'

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class MessageGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    // Maps userId → socket.id
    private onlineUsers = new Map<string, string>()

    constructor(
        private readonly jwtService: JwtService,
        private readonly messageService: MessageService,
        private readonly redisService: RedisService,
    ) { }

    afterInit(server: Server) {
        console.log('MessageGateway initialized')
    }

    async handleConnection(socket: Socket) {
        try {
            // Expect token in query: ?token=JWT
            const token = socket.handshake.query.token as string
            const payload = this.jwtService.verify(token)

            const userId = payload.sub
            socket.data.userId = userId

            // Save online mapping
            this.onlineUsers.set(userId, socket.id)
            await this.redisService.setUserOnline(userId)

            console.log(`User ${userId} connected via WebSocket`)
        } catch (err) {
            console.log('WebSocket auth failed')
            socket.disconnect()
        }
    }

    async handleDisconnect(socket: Socket) {
        const userId = socket.data.userId
        if (!userId) return

        this.onlineUsers.delete(userId)
        await this.redisService.setUserOffline(userId)

        console.log(`User ${userId} disconnected`)
    }

    // Optional: handle new message via socket (can also use REST)
    @SubscribeMessage('send.message')
    async handleSendMessage(
        @MessageBody() data: { receiverId: string; content: string },
        @ConnectedSocket() socket: Socket,
    ) {
        const senderId = socket.data.userId
        const message = await this.messageService.sendMessage({
            senderId,
            receiverId: data.receiverId,
            content: data.content,
        })

        const receiverSocketId = this.onlineUsers.get(data.receiverId)
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('message.sent', message)
        }

        // Return message to sender
        return message
    }

    // Emit read receipt
    async emitMessageRead(messageId: string, receiverId: string) {
        const receiverSocketId = this.onlineUsers.get(receiverId)
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('message.read', { messageId })
        }
    }

    // Emit delivered status
    async emitMessageDelivered(messageId: string, receiverId: string) {
        const receiverSocketId = this.onlineUsers.get(receiverId)
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('message.delivered', {
                messageId,
            })
        }
    }
}