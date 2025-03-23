
import mongoose, { Schema, Document, Model } from 'mongoose';

// User Interface for TypeScript
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin' | 'manager' | 'company';
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// User Schema
const userSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'manager', 'company'],
            default: 'user',
        },
    },
    {
        timestamps: true, // Automatically manages `createdAt` and `updatedAt`
    }
);

// Method to compare passwords
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return candidatePassword === this.password; // Replace with proper hashing in production
};

// User Model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
