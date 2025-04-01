import { Request, Response } from 'express';
import { loginService, sendAgainOTP, signupService, verifyOTP } from '../services/';
import { userSchema, UserInput, IUser } from '../dto/';
import { ZodError } from 'zod';
import { CustomError, InternalServerError } from '../utils';
import { logger } from '../config';

export const signupController = async (req: Request, res: Response): Promise<void> => {
	try {
		const validatedData: UserInput = userSchema.parse({
			...req.body,
			role: 'user', isVerified: false, status: 0, lastOTPAttempt: new Date(),
		});

		const result = await signupService(validatedData);

		res.status(201).json({ message: 'Signup successful, OTP sent!', data: result });
	} catch (error) {
		if (error instanceof ZodError) {
			res.status(400).json({ message: 'Validation failed', errors: error.errors });
		} else if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (signupController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

export const confirmSignUpOTP = async (req: Request, res: Response): Promise<void> => {
	try {
		const { phoneNumber, code, _id, method } = req.body;
		if (!phoneNumber || !code || !_id || !method) {
			res.status(400).json({ message: 'Input parameters missing.', errors: {} });
		}
		// validate phoneNumber, code, _id

		const user = await verifyOTP(code, _id, method, 'signUp');

		res.status(200).json({ message: 'Sign-up confirmed successfully.', data: user });
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (signupController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

export const sendAgainSignUpOTP = async (req: Request, res: Response): Promise<void> => {
	try {
		const { _id, method } = req.body;
		if (!_id || !method) {
			res.status(400).json({ message: 'Input parameters missing.', errors: {} });
		}
		// validate method

		const user = await sendAgainOTP(_id, method, 'signUp');

		res.status(200).json({ message: 'OTP code send Again.', data: user });
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (signupController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};

export const loginController = async (req: Request, res: Response): Promise<void> => {
	try {
		const { username, password } = req.body;
		if (!username || !password) {
			res.status(400).json({ message: 'Input parameters missing.', errors: {} });
		}

		const result: { token: string, role: string } = await loginService(username, username, password);

		res.setHeader('x-token', result.token);
		res.setHeader('x-role', result.role);
		res.status(201).json({ message: 'Login successfully.', data: result });
	} catch (error) {
		if (error instanceof CustomError) {
			res.status(error.statusCode).json({ message: error.message });
		} else {
			logger.error(`[Error] Local Error Handler: (signupController) \n ${error}`);
			res.status(500).json({ message: new InternalServerError().message });
		}
	}
};