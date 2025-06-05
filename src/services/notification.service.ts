import Notification from '../models/notification.model';
import { onlineUsers } from '../sockets/onlineUsers';
import { io } from '../server';

export const notifyUser = async ({
    userId,
    title,
    message,
    type = 'info',
}: {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'alert';
}) => {
    const notification = await Notification.create({
        user: userId,
        title,
        message,
        type,
    });

    const socketId = onlineUsers.get(userId);

    if (socketId && io.sockets.sockets.get(socketId)) {
        io.to(socketId).emit('notification', notification);
        console.log(`📤 Notification sent to user ${userId}`);
    } else {
        onlineUsers.delete(userId);
        console.log(`💾 User ${userId} offline, notification saved.`);
    }

    return notification;
};
