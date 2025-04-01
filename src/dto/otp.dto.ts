import { Types, Document } from 'mongoose';
import { z } from 'zod';

export interface IOTP extends Document {
	user: Types.ObjectId;
	phone?: string;
	email?: string;
	method: 'phone' | 'email';
	position: 'signUp' | 'forgotPassword';
	verificationCode: string;
	verificationAttempts: number;
	resendAttempts: number;
	createdAt: Date;
	updatedAt: Date;
}

export const OTPBaseSchema = z.object({
	user: z.instanceof(Types.ObjectId).or(z.string().refine(
		val => Types.ObjectId.isValid(val),
		{ message: "Invalid ObjectId" }
	)),
	phone: z.string().optional(),
	email: z.string().optional(),
	method: z.enum(['phone', 'email']),
	position: z.enum(['signUp', 'forgotPassword']),
	verificationCode: z.string()
		.length(6, "Verification code must be 6 characters")
		.regex(/^\d+$/, "Code must contain only digits"),
	verificationAttempts: z.number().int().min(0).max(7, "Maximum attempts exceeded"),
	resendAttempts: z.number().int().min(0).max(4, "Maximum attempts exceeded"),  // change to ini file
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date()
}).strict();

export const OTPSchema = OTPBaseSchema.refine(
	data => data.method === 'phone' ? !!data.phone : !!data.email,
	{
		message: "Phone required for 'phone' method, email required for 'email' method",
		path: ['method']
	}
);

export const updateOTPSchema = OTPBaseSchema.partial()
	.omit({ method: true, user: true, position: true })
	.extend({
		verificationAttempts: z.number().int().min(0).max(5, "Maximum attempts exceeded").optional()
});
