import { Response } from "express";
import { AuthenticatedRequest } from "../dto";
import { createUserTicket, getAllTicketsForAdmin } from "../services/ticket.service";

// for manual user
export const submitTicketController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req._id;
        const reportId = req.params.reportId;
        const { userMessage } = req.body;

        if (!userMessage || userMessage.trim().length === 0) {
            res.status(400).json({ message: 'Message is required' });
            return
        }

        const ticket = await createUserTicket(userId, reportId, userMessage);

        res.status(201).json({
            message: 'Ticket submitted successfully',
            ticket,
        });

    } catch (err: any) {
        console.error('Ticket submission error:', err);
        res.status(400).json({
            message: 'Failed to submit ticket',
            error: err.message || 'Unknown error'
        });
    }
};

export const getAdminTicketsController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const tickets = await getAllTicketsForAdmin();
        res.status(200).json({
            message: 'Tickets fetched successfully',
            tickets
        });
    } catch (err: any) {
        console.error('Admin ticket fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
    }
};