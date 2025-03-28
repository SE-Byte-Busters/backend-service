import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

export const hashPassword = async (password: string): Promise<string> => {
	const salt = await bcrypt.genSalt(9);
	return await bcrypt.hash(password, salt);
};

export const comparePassword = async (candidatePassword: string, hashedPassword: string): Promise<boolean> => {
	return await bcrypt.compare(candidatePassword, hashedPassword);
};

export async function generateRandomToken(length: number = 100): Promise<string> {
	return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export async function randomPassword(): Promise<string> {
	const ans = Math.random().toString(36).slice(2) +
			Math.random().toString(36)
			.toUpperCase().slice(2);
	return ans;
}
