import mongoose from "mongoose";
import { ITicket } from "../dto";
import { BadRequestError, NotFoundError } from "../utils";
import Ticket from "../models/ticket.model";
import { Report } from "../models";


export const createUserTicket = async (
    userId: string | undefined,
    reportId: string,
    userMessage: string
): Promise<ITicket> => {
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
        throw new BadRequestError('Invalid report ID');
    }

    const report = await Report.findById(reportId);
    if (!report) {
        throw new BadRequestError('Report not found');
    }

    if (report.user.toString() === userId) {
        throw new BadRequestError('You cannot submit a ticket for your own report');
    }

    const existingTicket = await Ticket.findOne({ report: reportId, user: userId });
    if (existingTicket) {
        throw new BadRequestError('You already submitted a ticket for this report');
    }

    const ticket = new Ticket({
        report: reportId,
        user: userId,
        userMessage,
    });

    await ticket.save();
    return ticket;
};

export const getAllTicketsForAdmin = async () => {
    const tickets = await Ticket.find()
        .populate('user', 'username phoneNumber')
        .populate('report', 'title city')
        .sort({ createdAt: -1 });

    return tickets;
};



export const respondToTicket = async (
    ticketId: string,
    adminId: string | undefined,
    decisionNote: string
): Promise<ITicket> => {
    if (!adminId) {
        throw new NotFoundError('Admin not found');
    }
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
        throw new NotFoundError('Ticket not found');
    }

    if (ticket.adminDecisionNote) {
        throw new BadRequestError('Ticket has already been answered');
    }

    ticket.admin = new mongoose.Types.ObjectId(adminId);
    ticket.adminDecisionNote = decisionNote;
    ticket.respondedAt = new Date();

    await ticket.save();
    return ticket;
};


export const getUserTickets = async (userId: string | undefined) => {
    if (!userId) {
        throw new NotFoundError('user not found');
    }
    return await Ticket.find({ user: userId })
        .populate('report', 'title') // فقط عنوان گزارش را برگردان
        .populate('admin', 'username') // فقط نام ادمین را برگردان
        .sort({ createdAt: -1 }); // جدیدترین تیکت‌ها اول
};