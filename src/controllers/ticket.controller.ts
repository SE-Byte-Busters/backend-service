import { Response } from "express";
import { AuthenticatedAdminRequest, AuthenticatedRequest } from "../dto";
import { createUserTicket, getAllTicketsForAdmin, getUserTickets, respondToTicket } from "../services/ticket.service";

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

export const respondToTicketController = async (
    req: AuthenticatedAdminRequest,
    res: Response
): Promise<void> => {
    try {
        const ticketId = req.params.ticketId;
        const adminId = req._id; // ادمین لاگین‌شده
        const { adminDecisionNote } = req.body;

        if (!adminDecisionNote || adminDecisionNote.trim().length === 0) {
            res.status(400).json({ message: 'Response note is required' });
            return

        }

        const ticket = await respondToTicket(ticketId, adminId, adminDecisionNote);

        res.status(200).json({
            message: 'Ticket responded successfully',
            ticket,
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to respond to ticket', error: err.message });
    }
};

export const getUserTicketsController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req._id;
        const tickets = await getUserTickets(userId);

        res.status(200).json({
            message: 'User tickets retrieved successfully',
            tickets,
        });
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch tickets',
            error: (err as Error).message,
        });
    }
};