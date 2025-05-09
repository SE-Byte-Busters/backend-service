import { Document, Types } from "mongoose";
import { z } from 'zod';
import { IUser } from "./user.dto";

export interface IReport extends Document {
	user: Types.ObjectId;
	title: string;
	description: string;
	approximatePosition: string;
	location: {
		type: 'Point' | 'Area';
		coordinates: number[];
	};
	city?: string;
	category?: string[];
	priority?: 'High' | 'Medium' | 'Low';
	images: { key: string, url: string }[];
	completionStatus: number;
	resolvedAt?: Date;
	resolvedBy?: Types.ObjectId;
	approvalStatus: number;
	status: number;
	score: number;
	voteScore: number;
	votes: { user: Types.ObjectId, direction: 'Up' | 'Down' }[];
	comments: { user: Types.ObjectId, text: string, date: Date }[];
}


export interface CommentWithUser {
	_id: Types.ObjectId;
	user: {
		_id: Types.ObjectId;
		username: string;
	};
	text: string;
	date: Date;
}