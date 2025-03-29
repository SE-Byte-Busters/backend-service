import { Cursor } from "mongoose";

export class CustomError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class BadRequestError extends CustomError {
	constructor(message = 'Bad Request') {
		super(message, 400);
	}
}

export class UnauthorizedError extends CustomError {
	constructor(message = 'Unauthorized') {
		super(message, 401);
	}
}

export class ForbiddenError extends CustomError {
	constructor(message = 'Forbidden') {
		super(message, 403);
	}
}

export class NotFoundError extends CustomError {
	constructor(message = 'Not Found') {
		super(message, 404);
	}
}

export class MethodNotAllowed extends CustomError {
	constructor(message = 'Method Not Allowed') {
		super(message, 405);
	}
}

export class NotAcceptable extends CustomError {
	constructor(message = 'Not Acceptable') {
		super(message, 406);
	}
}

export class InternalServerError extends CustomError {
	constructor(message = 'Internal Server Error') {
		super(message, 500);
	}
}

export class NotImplemented extends CustomError {
	constructor(message = 'Not Implemented') {
		super(message, 501);
	}
}
