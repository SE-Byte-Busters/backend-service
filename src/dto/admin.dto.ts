import { Document } from "mongoose";

export interface IAdmin extends Document {
	username: string;
	phoneNumber: string;
	role: 'admin' | 'superAdmin';
	email?: string;
	password: string;
	firstName?: string;
	lastName?: string;
	profileKey?: string;
	profileUrl?: string;
	status?: number;
	createdAt: Date;
	updatedAt: Date;
	hashPassword(candidatePassword: string): Promise<string>;
	comparePassword(candidatePassword: string): Promise<boolean>;
}
