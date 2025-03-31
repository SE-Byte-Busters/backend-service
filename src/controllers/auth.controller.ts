import { Request, Response } from 'express';
import { signupService } from '../services/';
import { userSchema, UserInput } from '../dto/';
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

