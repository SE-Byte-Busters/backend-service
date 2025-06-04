import { Document } from "mongoose";
import { z } from 'zod';

export interface IUser extends Document {
	username: string;
	phoneNumber: string;
	role: 'user' | 'group' | 'company';
	email?: string;
	password: string;
	firstName?: string;
	lastName?: string;
	isVerified: boolean;
	profileKey?: string;
	profileUrl?: string;
	status?: number;
	lastOTPAttempt: Date;
	createdAt: Date;
	totalScore: Number;
	updatedAt: Date;
	hashPassword(candidatePassword: string): Promise<string>;
	comparePassword(candidatePassword: string): Promise<boolean>;
}


export const userSchema = z.object({
	username: z.string()
		.min(3, 'Username must be at least 3 characters')
		.max(100, 'Username cannot exceed 100 characters'),
	phoneNumber: z.string()
		.regex(/^\+98\d{10}$/, "Invalid phone number format (E.164)"), // /^\+?[1-9]\d{1,14}$/
	role: z.enum(['user', 'group', 'company']),
	email: z.string().email().optional(),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	isVerified: z.boolean(),
	profileKey: z.string().optional(),
	profileUrl: z.string().optional(),
	status: z.number().optional(),
	lastOTPAttempt: z.date(),
}).strict();

export type UserInput = z.infer<typeof userSchema>;

// Define a schema for updating a user (partial fields allowed)
export const updateUserSchema = userSchema.partial();

