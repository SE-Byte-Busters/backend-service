import { Types } from 'mongoose';

export interface ITicket {
    _id?: Types.ObjectId;
    report: Types.ObjectId;
    user: Types.ObjectId;
    userMessage: string;
    status?: 'Pending' | 'Accepted' | 'Rejected';
    admin?: Types.ObjectId;
    adminDecisionNote?: string;
    createdAt?: Date;
    respondedAt?: Date;
}
