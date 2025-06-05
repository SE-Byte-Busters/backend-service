import { Types } from "mongoose";


export interface Rating {
    user: Types.ObjectId;
    score: number;
}

export interface IComment extends Document {
    user?: Types.ObjectId;
    text: string;
    ratings: Rating[];
    averageScore?: number;
    createdAt?: Date;
}