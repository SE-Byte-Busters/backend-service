import { Schema, model, Types, Document, HydratedDocument } from 'mongoose';
import { IComment, Rating } from '../dto';



const ratingSchema = new Schema<Rating>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        score: { type: Number, required: true, min: 0, max: 5 },
    },
    { _id: false }
);

const commentSchema = new Schema<IComment>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        ratings: { type: [ratingSchema], default: [] },
        averageScore: { type: Number, default: 0 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Update averageScore before saving
commentSchema.pre('save', function (next) {
    if (this.ratings.length > 0) {
        const sum = this.ratings.reduce((acc, r) => acc + r.score, 0);
        this.averageScore = sum / this.ratings.length;
    } else {
        this.averageScore = 0;
    }
    next();
});

const Comment = model<IComment>('Comment', commentSchema);

export default Comment;

// ✅ Optional helper type
export type CommentDocument = HydratedDocument<IComment>;
