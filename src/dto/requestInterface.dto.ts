import { Request } from 'express';

export interface AuthenticatedRequest extends Request { 
	_id?: string; 
	role?: string; 
	timeLeft?: number; 
	token?: string; 
	updateJWT?: boolean; 
	partialAccess?: boolean; 
}
