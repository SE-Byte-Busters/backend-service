import mongoose, { Schema, Model, Types } from 'mongoose';
import { ITicket } from '../dto';

const TicketSchema = new Schema<ITicket>(
    {
        report: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userMessage: { type: String, required: true, maxlength: 500 },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Rejected'],
            default: 'Pending',
        },
        admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
        adminDecisionNote: { type: String },
        createdAt: { type: Date, default: Date.now },
        respondedAt: { type: Date },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
    }
);

const Ticket: Model<ITicket> = mongoose.model<ITicket>('Ticket', TicketSchema);

export default Ticket;
