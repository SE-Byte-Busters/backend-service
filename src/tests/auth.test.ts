import { signupService, verifyOTP, sendAgainOTP, loginService } from '../services/auth.service';
import User from '../models/user.model';
import OTP from '../models/otp.model';
import ScoreAndBadge from '../models/scoreAndBadge.model';
import Admin from '../models/admin.model';
import { sendOTP as sendOTPUtil, generateOTP } from '../utils';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils';
import { userSchema, UserInput } from '../dto';

// Mocking the dependencies with explicit factory functions
// This prevents the original module's code from running
jest.mock('../models/user.model', () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn(), // Add any other static methods you use
}));

jest.mock('../models/otp.model', () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
}));

jest.mock('../models/scoreAndBadge.model', () => ({
    create: jest.fn(),
}));

jest.mock('../models/admin.model', () => ({
    findOne: jest.fn(),
}));

jest.mock('../utils', () => ({
    ...jest.requireActual('../utils'), // Keep actual implementations of other utils
    sendOTP: jest.fn(),
    generateOTP: jest.fn().mockReturnValue('123456'),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));

jest.mock('mongoose', () => ({
    ...jest.requireActual('mongoose'), // Keep actual mongoose for Types, etc.
    startSession: jest.fn().mockResolvedValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
    }),
}));



describe('Auth Service', () => {

    // Clear all mocks after each test to ensure test isolation
    afterEach(() => {
        jest.clearAllMocks();
    });

    //================================================================
    //==                   Tests for signupService                  ==
    //================================================================
    describe('signupService', () => {
        const userData = {
            phoneNumber: '+981234567890',
            email: 'test@example.com',
            password: 'password123',
            username: 'testuser'
        };

        const userDataForSignUp: UserInput = userSchema.parse({
            ...userData,
            role: 'user', isVerified: false, status: 0, lastOTPAttempt: new Date(),
        });

        it('should create a new user and send OTP successfully', async () => {
            // Mocking that no user exists
            (User.findOne as jest.Mock).mockResolvedValue(null);

            // Mocking the mongoose session
            const session = {
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                abortTransaction: jest.fn(),
                endSession: jest.fn(),
            };
            (mongoose.startSession as jest.Mock).mockResolvedValue(session);

            // Mocking the create methods
            const newUser = { _id: new Types.ObjectId(), ...userData };
            (User.create as jest.Mock).mockResolvedValue([newUser]);
            (OTP.create as jest.Mock).mockResolvedValue({});

            const result = await signupService(userDataForSignUp);

            // Assertions
            expect(User.findOne).toHaveBeenCalledWith({ $or: [{ phoneNumber: userData.phoneNumber }, { email: userData.email }] });
            expect(mongoose.startSession).toHaveBeenCalled();
            expect(session.startTransaction).toHaveBeenCalled();
            expect(User.create).toHaveBeenCalled();
            expect(generateOTP).toHaveBeenCalled();
            expect(sendOTPUtil).toHaveBeenCalledWith(userData.phoneNumber, '123456');
            expect(OTP.create).toHaveBeenCalled();
            expect(session.commitTransaction).toHaveBeenCalled();
            expect(session.endSession).toHaveBeenCalled();
            expect(result).toEqual({ _id: newUser._id, otpSentTo: userData.phoneNumber });
        });

        it('should throw BadRequestError if user already exists', async () => {
            (User.findOne as jest.Mock).mockResolvedValue({ email: 'test@example.com' });
            await expect(signupService(userDataForSignUp)).rejects.toThrow(BadRequestError);
        });

        it('should abort transaction on error', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            const session = {
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                abortTransaction: jest.fn(),
                endSession: jest.fn(),
            };
            (mongoose.startSession as jest.Mock).mockResolvedValue(session);
            (User.create as jest.Mock).mockRejectedValue(new Error('DB error'));

            await expect(signupService(userDataForSignUp)).rejects.toThrow('DB error');
            expect(session.abortTransaction).toHaveBeenCalled();
            expect(session.endSession).toHaveBeenCalled();
        });
    });

    //================================================================
    //==                    Tests for verifyOTP                     ==
    //================================================================
    describe('verifyOTP', () => {
        const userId = new Types.ObjectId().toHexString();
        const code = '123456';

        it('should verify OTP and activate user successfully', async () => {
            const otpRecord = {
                _id: new Types.ObjectId(),
                user: userId,
                verificationCode: code,
                verificationAttempts: 0,
                save: jest.fn(),
            };
            const user = {
                _id: userId,
                username: 'testuser',
                phoneNumber: '1234567890',
                password: 'hashedpassword',
                isVerified: false,
                hashPassword: jest.fn().mockResolvedValue('hashedpassword'),
                save: jest.fn(),
            };

            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);
            (User.findById as jest.Mock).mockResolvedValue(user);
            (OTP.deleteOne as jest.Mock).mockResolvedValue({});
            (ScoreAndBadge.create as jest.Mock).mockResolvedValue({});

            const result = await verifyOTP(code, userId, 'phone', 'signUp');

            expect(OTP.findOne).toHaveBeenCalled();
            expect(User.findById).toHaveBeenCalledWith(new Types.ObjectId(userId));
            expect(user.hashPassword).toHaveBeenCalled();
            expect(user.save).toHaveBeenCalled();
            expect(ScoreAndBadge.create).toHaveBeenCalled();
            expect(OTP.deleteOne).toHaveBeenCalled();
            expect(result).toEqual({ _id: user._id, username: user.username, phoneNumber: user.phoneNumber });
        });

        it('should throw NotFoundError if OTP record not found', async () => {
            (OTP.findOne as jest.Mock).mockResolvedValue(null);
            await expect(verifyOTP(code, userId, 'phone', 'signUp')).rejects.toThrow(NotFoundError);
        });

        it('should throw ForbiddenError on max attempts', async () => {
            const otpRecord = { verificationAttempts: 6, save: jest.fn() };
            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);
            await expect(verifyOTP(code, userId, 'phone', 'signUp')).rejects.toThrow(ForbiddenError);
        });

        it('should throw BadRequestError on invalid OTP', async () => {
            const otpRecord = { verificationCode: '654321', verificationAttempts: 0, save: jest.fn() };
            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);
            await expect(verifyOTP(code, userId, 'phone', 'signUp')).rejects.toThrow(BadRequestError);
        });

        it('should throw ForbiddenError if user not found', async () => {
            const otpRecord = { verificationCode: code, verificationAttempts: 0, save: jest.fn() };
            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);
            (User.findById as jest.Mock).mockResolvedValue(null);
            await expect(verifyOTP(code, userId, 'phone', 'signUp')).rejects.toThrow(ForbiddenError);
        });
    });

    //================================================================
    //==                  Tests for sendAgainOTP                    ==
    //================================================================
    describe('sendAgainOTP', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should resend OTP successfully', async () => {
            const otpRecord = {
                user: userId,
                phone: '1234567890',
                resendAttempts: 0,
                updatedAt: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
                save: jest.fn(),
            };
            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);

            const result = await sendAgainOTP(userId, 'phone', 'signUp');

            expect(sendOTPUtil).toHaveBeenCalledWith(otpRecord.phone, '123456');
            expect(otpRecord.save).toHaveBeenCalled();
            expect(result).toEqual({ _id: userId });
        });

        it('should throw ForbiddenError if waiting for previous attempt', async () => {
            const otpRecord = {
                resendAttempts: 0,
                updatedAt: new Date(), // now
            };
            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);
            await expect(sendAgainOTP(userId, 'phone', 'signUp')).rejects.toThrow(ForbiddenError);
        });

        it('should throw ForbiddenError on max resend attempts', async () => {
            const otpRecord = {
                resendAttempts: 4,
                updatedAt: new Date(Date.now() - 4 * 60 * 1000),
            };
            (OTP.findOne as jest.Mock).mockResolvedValue(otpRecord);
            await expect(sendAgainOTP(userId, 'phone', 'signUp')).rejects.toThrow(ForbiddenError);
        });
    });

    //================================================================
    //==                   Tests for loginService                   ==
    //================================================================
    describe('loginService', () => {
        const password = 'password123';
        const phoneNumber = '1234567890';
        const email = 'test@example.com';

        it('should login a verified user successfully', async () => {
            const user = {
                _id: new Types.ObjectId(),
                isVerified: true,
                comparePassword: jest.fn().mockResolvedValue(true),
            };
            (User.findOne as jest.Mock).mockResolvedValue(user);
            (jwt.sign as jest.Mock).mockReturnValue('test_token');

            const result = await loginService(phoneNumber, email, password);

            expect(User.findOne).toHaveBeenCalled();
            expect(user.comparePassword).toHaveBeenCalledWith(password);
            expect(jwt.sign).toHaveBeenCalled();
            expect(result).toEqual({ token: 'test_token', role: 'user' });
        });

        it('should login an admin successfully', async () => {
            const admin = {
                _id: new Types.ObjectId(),
                comparePassword: jest.fn().mockResolvedValue(true),
            };
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (Admin.findOne as jest.Mock).mockResolvedValue(admin);
            (jwt.sign as jest.Mock).mockReturnValue('test_token');

            const result = await loginService(phoneNumber, email, password);

            expect(Admin.findOne).toHaveBeenCalled();
            expect(admin.comparePassword).toHaveBeenCalledWith(password);
            expect(jwt.sign).toHaveBeenCalled();
            expect(result).toEqual({ token: 'test_token', role: 'admin' });
        });

        it('should throw NotFoundError for invalid credentials', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (Admin.findOne as jest.Mock).mockResolvedValue(null);
            await expect(loginService(phoneNumber, email, password)).rejects.toThrow(NotFoundError);
        });

        it('should throw UnauthorizedError for unverified user', async () => {
            const user = { isVerified: false };
            (User.findOne as jest.Mock).mockResolvedValue(user);
            await expect(loginService(phoneNumber, email, password)).rejects.toThrow(UnauthorizedError);
        });
    });
});
