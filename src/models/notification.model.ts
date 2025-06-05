import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: 'info' | 'alert';
    read: boolean;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'alert'], default: 'info' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>('Notification', notificationSchema);
