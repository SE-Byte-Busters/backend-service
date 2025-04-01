import { Model, Schema, model } from 'mongoose';
import { IOTP } from '../dto';

const OTPSchema = new Schema<IOTP>(
	{
		user: { 
			type: Schema.Types.ObjectId, 
			ref: 'User', 
			required: true 
		},
		phone: { 
			type: String,
			required: false,
		},
		email: {
			type: String,
			required: false,
		},
		method: {
			type: String,
			required: true,
			enum: ['phone', 'email'],
		},
		position: {
			type: String,
			required: true,
			enum: ['signUp', 'forgotPassword'],
		},
		verificationCode: {
			type: String,
			required: true,
		},
		verificationAttempts: {
			type: Number,
			default: 0,
			max: 7, // change to ini file
		},
		resendAttempts: {
			type: Number,
			default: 0,
			max: 4, // change to ini file
		},
		updatedAt: {
			type: Date,
			expires: '5m',// change to ini file
		}
	},
	{ 
		timestamps: true,
	}
);

const OTP: Model<IOTP> = model<IOTP>('OTP', OTPSchema);

export default OTP;
