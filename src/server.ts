import app from './app';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { connectMongoDB, disconnectMongoDB, initializeMinioBuckets } from './config';
import { onlineUsers } from './sockets/onlineUsers';
import jwt, { JwtPayload } from 'jsonwebtoken';

dotenv.config();
connectMongoDB();
initializeMinioBuckets();

const PORT = process.env.PORT || 3000;

// Create raw HTTP server
const server = http.createServer(app);

// Create Socket.IO server
export const io = new Server(server, {
    cors: {
        origin: '*', // Replace with frontend URL in production
        methods: ['GET', 'POST'],
    },
});

io.use((socket: any, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));

    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) throw new Error('JWT_SECRET not set in environment');

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        socket.userId = decoded._id;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

// Handle socket connections
io.on('connection', (socket: any) => {
    console.log('🔌 User connected:', socket.id);

    // Automatically join room and store socket by userId from token
    const userId = socket.userId;
    if (userId) {
        console.log(`User ${userId} joined`);
        onlineUsers.set(userId, socket.id);
    }

    socket.on('disconnect', () => {
        for (const [userId, sId] of onlineUsers.entries()) {
            if (sId === socket.id) {
                onlineUsers.delete(userId);
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});

// Start HTTP + WebSocket server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
const shutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ HTTP server closed.');
        disconnectMongoDB();
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
