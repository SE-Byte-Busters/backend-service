import { logger } from "../config";

export const notif = async (recipient: string, title: string, state: number) => {
    const url: string = process.env.SMS_URL || 'https://yourSMSprovider';
    const headers = {
        'accept': 'application/json',
        'apikey': process.env.SMS_KEY || 'APIKEY',
        'Content-Type': 'application/json'
    };

    const statusText = state === 1 ? 'approved' : 'rejected';

    const body = {
        recipient: ["+989360237699"],
        sender: process.env.PHONE_NUMBER,
        message: `Your report titled "${title}" has been ${statusText} by the admin.`
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`[notif] Failed to send SMS: ${response.status} - ${errorText}`);
            throw new Error(`Failed to send notification. Status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        logger.error(`[notif] Unexpected error while sending SMS: ${error}`);
        throw error;
    }
};