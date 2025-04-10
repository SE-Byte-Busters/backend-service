import { Document, Types } from "mongoose";

export interface IScoreAndBadge extends Document {
	user: Types.ObjectId;
	username: string;
	score: number;
	badges: string[];
}
