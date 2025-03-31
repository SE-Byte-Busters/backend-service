import { logger } from "../config";

export const generateOTP = (): string => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (recipient: string, otp: string) => {
	// logger.info(`Sending OTP ${otp} to ${recipient}`);

	const url: string = process.env.SMS_URL || 'https://yourSMSprovider';
	const headers = { 
		'accept': 'application/json', 'apikey': process.env.SMS_KEY || 'APIKEY', 'Content-Type': 'application/json' 
	};
	const body = {
		"recipient": [ recipient ],
		"sender": process.env.PHONE_NUMBER,
		// "time": "2025-03-21T09:12:50.824Z", not required
		"message": `Welcome to Clean City site. OTP code: ${otp}`
	};

	const response = await fetch(url, {
		method: 'POST', headers, body: JSON.stringify(body)
	});

	if(response.ok){
		const data = await response.json();
		return data;
	} else {
		logger.error(`[Error] OTP Sender Error: (sendOTP) \n ${response.status}: ${response.body}`);
		throw new Error(`OTP Server error! status: ${response.status}`);
	}
};
