import User from '../models/user.model';
import OTP from '../models/otp.model';
import { IUser, UserInput } from '../dto';
import { BadRequestError } from '../utils';
import { sendOTP, generateOTP } from '../utils';
import mongoose from 'mongoose';

export const signupService = async (userData: UserInput) => {
	const { phoneNumber, email } = userData;

	const existingUser = await User.findOne({ $or: [{ phoneNumber }, { email }] }); // check only for Verified users
	if (existingUser) {
		throw new BadRequestError('User already exists with this phone or email.');
	}

	const session = await mongoose.startSession();
	session.startTransaction();
	let newUser: IUser;

	try {
		[ newUser ] = await User.create([{
			...userData,
			role: 'user', isVerified: false, status: 0, lastOTPAttempt: new Date(),
		}], { session });

		const otpCode = generateOTP();

		await sendOTP(phoneNumber, otpCode); //  || email!

		await OTP.create([{
			user: newUser._id, phone: phoneNumber, email,
			method: phoneNumber ? 'phone' : 'email', position: 'signUp',
			verificationCode: otpCode, verificationAttempts: 0,
		}], { session }); // add message_id?

		await session.commitTransaction();
	} catch(error) {
		await session.abortTransaction();
		throw error;
	} finally {
		// it will run in any case and situation so do not return in this block
		session.endSession();
	}

	return { userId: newUser._id, otpSentTo: phoneNumber || email };
};
