import { logger } from "../config";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch, { RequestInit } from "node-fetch";

export const generateOTP = (): string => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (recipient: string, otp: string) => {
	// logger.info(`Sending OTP ${otp} to ${recipient}`);

	const proxy = process.env.PROXY || "http://user:pass@ip:port";
	const agent = new HttpsProxyAgent(proxy);

	const url: string = process.env.SMS_URL || 'https://yourSMSprovider';
	const headers = { 
		'accept': 'application/json', 
		'apikey': process.env.SMS_KEY || 'APIKEY', 
		'Content-Type': 'application/json' 
	};
	const body = {
		"code": process.env.SMS_CODE,
		"recipient": recipient,
		"sender": process.env.PHONE_NUMBER,
		"variable": {
			"verification-code": otp
		}
	};

	const response = await fetch(url, {
		method: 'POST', headers, body: JSON.stringify(body), agent
	} as RequestInit & { agent: any });

	if(response.ok){
		const data = await response.json();
		return data;
	} else {
		logger.error(`[Error] OTP Sender Error: (sendOTP) \n ${response.status}: ${response.body}`);
		throw new Error(`OTP Server error! status: ${response.status}`);
	}
};
