import mongoose, { Schema, Model } from 'mongoose';
import { hashPassword, comparePassword } from '../utils';
import { IUser } from '../dto';

const userSchema = new Schema<IUser>(
	{
		username: {
			type: String,
			required: true,
			minlength: 3,
			maxlength: 100,
			trim: true,
		},
		phoneNumber: {
			type: String,
			unique: true,
			required: true,
			match: [/^\+98\d{10}$/, 'Invalid phone number format.'],
		},
		role: { 
			type: String,
			enum: ['user', 'group', 'company'], 
			default: 'user' 
		},
		email: {
			type: String,
			unique: true,
			required: false,
			match: [/\S+@\S+\.\S+/, 'Invalid email format.'],
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 8,
			trim: true,
		},
		firstName: {
			type: String,
			trim: true,
			required: false,
			// match: [/^[\u0600-\u06FF\w\s]+$/, 'Invalid username. Must be Persian characters or alphanumeric.'],
		},
		lastName: {
			type: String,
			trim: true,
			required: false,
		},
		isVerified: {
			type: Boolean,
			default: false,
			required: true,
		},
		status: {
			type: Number,
			default: 0,
			required: false,
		},
		lastOTPAttempt: {
			type: Date,
			required: true,
		}
	},
	{
		timestamps: true,
	}
);

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
	return await comparePassword(candidatePassword, this.password);
};

userSchema.methods.hashPassword = async function (candidatePassword: string): Promise<string> {
	return await hashPassword(candidatePassword);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
