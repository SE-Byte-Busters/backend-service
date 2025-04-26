import User from '../models/user.model';
import OTP from '../models/otp.model';
import ScoreAndBadge from '../models/scoreAndBadge.model';
import { IUser, UserInput } from '../dto';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils';
import { sendOTP, generateOTP } from '../utils';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model';

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

	return { _id: newUser._id, otpSentTo: phoneNumber || email };
};


export const verifyOTP = async (
		code: string, _id: string, method: string, position: string ) => {
	const otpRecord = await OTP.findOne({ user: new Types.ObjectId(_id), position, method });

	if (!otpRecord) {
		throw new NotFoundError('OTP not found or expired.');
	} 
	otpRecord.verificationAttempts = otpRecord.verificationAttempts + 1;

	if (otpRecord.verificationAttempts == 7){ // change to ini
		await otpRecord.save({ timestamps: false });
		throw new ForbiddenError('Maximum attempts reached.');
	} else if (otpRecord.verificationCode !== code) {
		await otpRecord.save({ timestamps: false });
		throw new BadRequestError('Invalid OTP.');
	}

	const user = await User.findById(new Types.ObjectId(_id));
	if(user){
		user.password = await user.hashPassword(user.password);
		user.isVerified = true;
		await user.save();

		const score = await ScoreAndBadge.create({ 
			user: user._id, username: user.username, score: 0, badges: []
		});
	} else {
		throw new ForbiddenError('User related to OTP not found.');
	}

	await OTP.deleteOne({ _id: otpRecord._id });

	return { _id: user._id, username: user.username, phoneNumber: user.phoneNumber };
};

export const sendAgainOTP = async (_id: string, method: string, position: string) => {

	const otpRecord = await OTP.findOne({ user: new Types.ObjectId(_id), position, method });
	const LIMIT_MINUTES_MS = 3 * 60 * 1000; // 3 minutes in milliseconds
	
	if (!otpRecord) {
		throw new NotFoundError('OTP not found or expired.');
	} else if(otpRecord.resendAttempts == 4){ // change to ini file
		throw new ForbiddenError('Maximum attempts reached.');
	} else if (new Date() < new Date(otpRecord.updatedAt.getTime() + LIMIT_MINUTES_MS)){
		throw new ForbiddenError('Wait for the previous attempt.');
	}
	
	const otpCode = generateOTP();
	if(otpRecord.phone){
		await sendOTP(otpRecord.phone, otpCode);
	}

	otpRecord.verificationCode = otpCode;
	otpRecord.verificationAttempts = 0;
	otpRecord.resendAttempts = otpRecord.resendAttempts + 1;
	await otpRecord.save();

	return { _id: otpRecord.user };
};

export const loginService = async (phoneNumber: string, email: string, password: string): 
	Promise<{ token: string, role: string }> => {
	let user = await User.findOne({ $or: [{ phoneNumber }, { email }] });
	if(!user) {
		const admin = await Admin.findOne({ $or: [{ phoneNumber }, { email }] });
		if(!admin){
			throw new NotFoundError("Username/Password is not valid.");
		}
		const isPasswordValid = await admin.comparePassword(password);
		if(!isPasswordValid) {
			throw new NotFoundError("Username/Password is not valid.");
		}

		const jwtToken = jwt.sign({ _id: admin._id }
			, process.env.JWT_SECRET || 'Random128BitHexString', { expiresIn: '2h' }); // change to ini file 'userExpirationTime'

		return { token: jwtToken, role: 'admin' };
	} else if (!user.isVerified) {
		throw new UnauthorizedError("Plaese verify your account to login.");
	}

	const isPasswordValid = await user.comparePassword(password);
	if(!isPasswordValid) {
		throw new NotFoundError("Username/Password is not valid.");
	}

	const jwtToken = jwt.sign({ _id: user._id }
		, process.env.JWT_SECRET || 'Random128BitHexString', { expiresIn: '2h' }); // change to ini file 'userExpirationTime'

	return { token: jwtToken, role: 'user' };
};
