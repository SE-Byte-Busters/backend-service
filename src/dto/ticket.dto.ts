import { Types } from 'mongoose';

export interface ITicket {
    _id?: Types.ObjectId;
    report: Types.ObjectId;
    user: Types.ObjectId;
    userMessage: string;
    admin?: Types.ObjectId;
    adminDecisionNote?: string;
    createdAt?: Date;
    respondedAt?: Date;
}
