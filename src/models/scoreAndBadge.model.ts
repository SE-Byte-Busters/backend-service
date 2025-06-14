import { Model, Schema, model } from 'mongoose';
import { IScoreAndBadge } from '../dto';

const ScoreAndBadgeSchema = new Schema<IScoreAndBadge>({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		unique: true,
	},
	username: {
		type: String,
		required: true,
	},
	score: {
		type: Number,
		required: true,
		default: 0,
		min: 0,
	},
	badges: {
		type: [String],
		default: [],
	},
}, { timestamps: true, });

const ScoreAndBadge: Model<IScoreAndBadge> = model<IScoreAndBadge>('ScoreAndBadge', ScoreAndBadgeSchema);

export default ScoreAndBadge;
