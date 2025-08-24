import mongoose, { Types } from 'mongoose';
import {
    createUserTicket,
    getAllTicketsForAdmin,
    respondToTicket,
    getUserTickets,
} from '../services/ticket.service'; // Adjust path as needed
import { Report, Ticket } from '../models';
import { BadRequestError, NotFoundError } from '../utils';

//================================================================
//==                         Mocks                              ==
//================================================================

// Mock Mongoose Models
jest.mock('../models/report.model');
jest.mock('../models/ticket.model');


//================================================================
//==                       Test Suite                           ==
//================================================================

describe('Ticket Service', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    //----------------------------------------------------------------
    // 1. Tests for createUserTicket
    //----------------------------------------------------------------
    describe('createUserTicket', () => {
        const userId = new Types.ObjectId().toHexString();
        const reportOwnerId = new Types.ObjectId();
        const reportId = new Types.ObjectId().toHexString();
        const userMessage = 'This report is incorrect.';

        it('should create a ticket successfully', async () => {
            const mockReport = { _id: reportId, user: reportOwnerId };
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
            (Ticket.findOne as jest.Mock).mockResolvedValue(null);
            const mockTicketInstance = { save: jest.fn().mockResolvedValue(true) };
            (Ticket as jest.MockedClass<typeof Ticket>).mockImplementation(() => mockTicketInstance as any);

            await createUserTicket(userId, reportId, userMessage);

            expect(Report.findById).toHaveBeenCalledWith(reportId);
            expect(Ticket.findOne).toHaveBeenCalledWith({ report: reportId, user: userId });
            expect(mockTicketInstance.save).toHaveBeenCalled();
        });

        it('should throw BadRequestError if user is the report owner', async () => {
            const mockReport = { _id: reportId, user: new Types.ObjectId(userId) };
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
            await expect(createUserTicket(userId, reportId, userMessage)).rejects.toThrow(
                new BadRequestError('You cannot submit a ticket for your own report')
            );
        });

        it('should throw BadRequestError if a ticket already exists', async () => {
            const mockReport = { _id: reportId, user: reportOwnerId };
            (Report.findById as jest.Mock).mockResolvedValue(mockReport);
            (Ticket.findOne as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });
            await expect(createUserTicket(userId, reportId, userMessage)).rejects.toThrow(
                new BadRequestError('You already submitted a ticket for this report')
            );
        });

        it('should throw BadRequestError if the report is not found', async () => {
            (Report.findById as jest.Mock).mockResolvedValue(null);
            await expect(createUserTicket(userId, reportId, userMessage)).rejects.toThrow(
                new BadRequestError('Report not found')
            );
        });
    });

    //----------------------------------------------------------------
    // 2. Tests for getAllTicketsForAdmin
    //----------------------------------------------------------------
    describe('getAllTicketsForAdmin', () => {
        it('should return all tickets, populated and sorted', async () => {
            const mockTickets = [{ userMessage: 'Ticket 1' }, { userMessage: 'Ticket 2' }];
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockTickets),
            };
            (Ticket.find as jest.Mock).mockReturnValue(mockQuery);

            const result = await getAllTicketsForAdmin();

            expect(Ticket.find).toHaveBeenCalled();
            expect(mockQuery.populate).toHaveBeenCalledWith('user', 'username phoneNumber');
            expect(mockQuery.populate).toHaveBeenCalledWith('report', 'title city');
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(result).toEqual(mockTickets);
        });

        it('should return an empty array if no tickets exist', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([]),
            };
            (Ticket.find as jest.Mock).mockReturnValue(mockQuery);

            const result = await getAllTicketsForAdmin();

            expect(result).toEqual([]);
        });

        it('should correctly chain populate calls', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([]),
            };
            (Ticket.find as jest.Mock).mockReturnValue(mockQuery);

            await getAllTicketsForAdmin();

            expect(mockQuery.populate).toHaveBeenCalledTimes(2);
        });
    });

    //----------------------------------------------------------------
    // 3. Tests for respondToTicket
    //----------------------------------------------------------------
    describe('respondToTicket', () => {
        const ticketId = new Types.ObjectId().toHexString();
        const adminId = new Types.ObjectId().toHexString();
        const decisionNote = 'This report is valid. Action taken.';

        it('should add a response to a ticket successfully', async () => {
            const mockTicket = {
                _id: ticketId,
                adminDecisionNote: null,
                save: jest.fn().mockResolvedValue(true),
            };
            (Ticket.findById as jest.Mock).mockResolvedValue(mockTicket);

            const result = await respondToTicket(ticketId, adminId, decisionNote);

            expect(Ticket.findById).toHaveBeenCalledWith(ticketId);
            expect(mockTicket.save).toHaveBeenCalled();
            expect(result.adminDecisionNote).toBe(decisionNote);
            expect(result.admin).toEqual(new Types.ObjectId(adminId));
        });

        it('should throw BadRequestError if ticket has already been answered', async () => {
            const mockTicket = { _id: ticketId, adminDecisionNote: 'Already answered' };
            (Ticket.findById as jest.Mock).mockResolvedValue(mockTicket);
            await expect(respondToTicket(ticketId, adminId, decisionNote)).rejects.toThrow(
                new BadRequestError('Ticket has already been answered')
            );
        });

        it('should throw NotFoundError if ticket is not found', async () => {
            (Ticket.findById as jest.Mock).mockResolvedValue(null);
            await expect(respondToTicket(ticketId, adminId, decisionNote)).rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError if adminId is not provided', async () => {
            await expect(respondToTicket(ticketId, undefined, decisionNote)).rejects.toThrow(
                new NotFoundError('Admin not found')
            );
        });
    });

    //----------------------------------------------------------------
    // 4. Tests for getUserTickets
    //----------------------------------------------------------------
    describe('getUserTickets', () => {
        const userId = new Types.ObjectId().toHexString();

        it('should return tickets for a specific user', async () => {
            const mockUserTickets = [{ userMessage: 'My Ticket' }];
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockUserTickets),
            };
            (Ticket.find as jest.Mock).mockReturnValue(mockQuery);

            const result = await getUserTickets(userId);

            expect(Ticket.find).toHaveBeenCalledWith({ user: userId });
            expect(mockQuery.populate).toHaveBeenCalledWith('report', 'title');
            expect(mockQuery.populate).toHaveBeenCalledWith('admin', 'username');
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(result).toEqual(mockUserTickets);
        });

        it('should throw NotFoundError if userId is not provided', async () => {
            await expect(getUserTickets(undefined)).rejects.toThrow(NotFoundError);
        });

        it('should return an empty array if the user has no tickets', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([]),
            };
            (Ticket.find as jest.Mock).mockReturnValue(mockQuery);

            const result = await getUserTickets(userId);

            expect(result).toEqual([]);
        });
    });
});
