import mongoose, { Schema, Model } from 'mongoose';
import { hashPassword, comparePassword } from '../utils';
import { IAdmin } from '../dto';

const adminSchema = new Schema<IAdmin>(
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
			enum: ['admin', 'superAdmin'],
			default: 'admin'
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
		profileKey: {
			type: String,
			require: false,
		},
		profileUrl: {
			type: String,
			require: false,
		},
		status: {
			type: Number,
			default: 0,
			required: false,
		},
	},
	{
		timestamps: true,
	}
);

adminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
	return await comparePassword(candidatePassword, this.password);
};

adminSchema.methods.hashPassword = async function (candidatePassword: string): Promise<string> {
	return await hashPassword(candidatePassword);
};

const Admin: Model<IAdmin> = mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;
