import jwt, { JwtPayload } from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../dto';
import fs from 'fs';
import ini from 'ini';

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
const userExpirationTime = config.server.userExpirationTime;
const expertExpirationTime = config.server.expertExpirationTime;
const JWTrecoveryTime = parseInt(config.server.JWTrecoveryTime);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error('[ERROR] JWT_SECRET not defined in environment variables.');
}


export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];
		if (!token) {
			res.status(401).json({ message: 'Access token missing.' });
			return;
		}

		const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

		req._id = decoded._id;
		req.role = req.headers['x-role'] as string;

		const currentTime = Math.floor(Date.now() / 1000);
		const timeLeft = Math.floor((decoded.exp! - currentTime) / 60);
		req.timeLeft = timeLeft;

		if (timeLeft <= JWTrecoveryTime && req.role === 'user') {
			const newToken = jwt.sign({ _id: decoded._id }, JWT_SECRET, {
				expiresIn: userExpirationTime,
			});
			req.token = newToken;
			res.setHeader('x-new-token', newToken);
			req.updateJWT = true;
		} else {
			req.updateJWT = false;
		}

		next();
	} catch (error) {
		res.status(403).json({ message: 'Invalid or expired token.' });
		return;
	}
};

export const partialAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (token) {
		try {
			const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
			req._id = decoded._id;
			req.role = req.headers['x-role'] as string;

			const currentTime = Math.floor(Date.now() / 1000);
			const timeLeft = Math.floor((decoded.exp! - currentTime) / 60);
			req.timeLeft = timeLeft;

			if (timeLeft <= JWTrecoveryTime && req.role === 'user') {
				const newToken = jwt.sign({ _id: decoded._id }, JWT_SECRET, {
					expiresIn: userExpirationTime,
				});
				req.token = newToken;
				res.setHeader('x-new-token', newToken);
				req.updateJWT = true;
			} else {
				req.updateJWT = false;
			}

			req.partialAccess = false;
			next();
		} catch (err) {
			res.status(403).json({ message: 'Invalid or expired token.' });
			return;
		}
	} else {
		req.partialAccess = true;
		next();
	}
};