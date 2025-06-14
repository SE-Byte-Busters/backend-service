// src/tests/ticket.service.test.ts

import mongoose, { Types } from 'mongoose';
import { Ticket, Report } from '../models';
import {
    createUserTicket,
    getAllTicketsForAdmin,
    respondToTicket,
    getUserTickets,
} from '../services/ticket.service'; // Adjust path as needed
import { BadRequestError, NotFoundError } from '../utils';
import { ITicket } from '../dto';

// --- MOCKS SETUP ---

// Mocking Mongoose models
jest.mock('../models', () => ({
    Ticket: jest.fn(), // Mock the constructor
    Report: {
        findById: jest.fn(),
    },
}));
// To mock the Ticket model constructor and its instance methods like `save`
const mockSave = jest.fn().mockResolvedValue(true);
Ticket.prototype.save = mockSave;
(Ticket as any).findOne = jest.fn();
(Ticket as any).find = jest.fn();
(Ticket as any).findById = jest.fn();


// Mocking utility classes
jest.mock('../utils', () => ({
    BadRequestError: class extends Error { constructor(m: string) { super(m); this.name = 'BadRequestError'; } },
    NotFoundError: class extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError'; } },
}));

// --- TYPE CASTING MOCKS ---
const mockedTicket = Ticket as jest.Mocked<typeof Ticket> & {
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
};
const mockedReport = Report as jest.Mocked<typeof Report>;


// --- TEST SUITE ---
describe('Ticket Services', () => {
    const mockUserId = new Types.ObjectId().toHexString();
    const mockOtherUserId = new Types.ObjectId().toHexString();
    const mockAdminId = new Types.ObjectId().toHexString();
    const mockReportId = new Types.ObjectId().toHexString();
    const mockTicketId = new Types.ObjectId().toHexString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Disconnect mongoose to prevent test timeouts
        await mongoose.disconnect();
    });

    // --- Tests for createUserTicket ---
    describe('createUserTicket', () => {
        it('should create a ticket successfully', async () => {
            const mockReport = { _id: mockReportId, user: mockOtherUserId };
            mockedReport.findById.mockResolvedValue(mockReport);
            mockedTicket.findOne.mockResolvedValue(null);

            const result = await createUserTicket(mockUserId, mockReportId, 'This is a test');

            expect(mockedReport.findById).toHaveBeenCalledWith(mockReportId);
            expect(mockedTicket.findOne).toHaveBeenCalledWith({ report: mockReportId, user: mockUserId });
            expect(Ticket).toHaveBeenCalledWith({
                report: mockReportId,
                user: mockUserId,
                userMessage: 'This is a test',
            });
            expect(mockSave).toHaveBeenCalled();
            expect(result).toBeInstanceOf(Ticket);
        });

        it('should throw BadRequestError for invalid report ID', async () => {
            await expect(createUserTicket(mockUserId, 'invalid-id', 'test')).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError if report not found', async () => {
            mockedReport.findById.mockResolvedValue(null);
            await expect(createUserTicket(mockUserId, mockReportId, 'test')).rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError if user creates ticket for their own report', async () => {
            const mockReport = { _id: mockReportId, user: mockUserId };
            mockedReport.findById.mockResolvedValue(mockReport);
            await expect(createUserTicket(mockUserId, mockReportId, 'test')).rejects.toThrow('You cannot submit a ticket for your own report');
        });

        it('should throw BadRequestError if ticket already exists', async () => {
            const mockReport = { _id: mockReportId, user: mockOtherUserId };
            mockedReport.findById.mockResolvedValue(mockReport);
            mockedTicket.findOne.mockResolvedValue({ _id: 'existing-ticket' }); // Simulate existing ticket
            await expect(createUserTicket(mockUserId, mockReportId, 'test')).rejects.toThrow('You already submitted a ticket for this report');
        });
    });

    // --- Tests for getAllTicketsForAdmin ---
    describe('getAllTicketsForAdmin', () => {
        it('should return all tickets, populated and sorted', async () => {
            const mockTickets = [{ id: 1 }, { id: 2 }];
            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockTickets),
            };
            mockedTicket.find.mockReturnValue(queryMock as any);

            const result = await getAllTicketsForAdmin();

            expect(mockedTicket.find).toHaveBeenCalled();
            expect(queryMock.populate).toHaveBeenCalledWith('user', 'username phoneNumber');
            expect(queryMock.populate).toHaveBeenCalledWith('report', 'title city');
            expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(result).toEqual(mockTickets);
        });
    });

    // --- Tests for respondToTicket ---
    describe('respondToTicket', () => {
        it('should successfully respond to a ticket', async () => {
            // This mock represents the ticket object found in the database
            const mockTicketInstance = {
                _id: mockTicketId,
                admin: undefined,
                adminDecisionNote: null, // Ensure it's not answered yet
                respondedAt: undefined,
                save: jest.fn().mockResolvedValue(true)
            };
            mockedTicket.findById.mockResolvedValue(mockTicketInstance);

            const result = await respondToTicket(mockTicketId, mockAdminId, 'Decision made');

            expect(mockedTicket.findById).toHaveBeenCalledWith(mockTicketId);

            // Assert that the properties were correctly set on the mock instance
            expect(mockTicketInstance.admin).toEqual(new Types.ObjectId(mockAdminId));
            expect(mockTicketInstance.adminDecisionNote).toBe('Decision made');
            expect(mockTicketInstance.respondedAt).toBeInstanceOf(Date);

            // Assert that the save method was called and the service returned the modified object
            expect(mockTicketInstance.save).toHaveBeenCalled();
            expect(result).toBe(mockTicketInstance);
        });

        it('should throw NotFoundError if adminId is not provided', async () => {
            await expect(respondToTicket(mockTicketId, undefined, 'test')).rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError if ticket is not found', async () => {
            mockedTicket.findById.mockResolvedValue(null);
            await expect(respondToTicket(mockTicketId, mockAdminId, 'test')).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequestError if ticket is already answered', async () => {
            const answeredTicket = { adminDecisionNote: 'Already answered' };
            mockedTicket.findById.mockResolvedValue(answeredTicket);
            await expect(respondToTicket(mockTicketId, mockAdminId, 'test')).rejects.toThrow('Ticket has already been answered');
        });
    });

    // --- Tests for getUserTickets ---
    describe('getUserTickets', () => {
        it('should return tickets for a given user', async () => {
            const userTickets = [{ id: 'ticket1' }, { id: 'ticket2' }];
            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(userTickets),
            };
            mockedTicket.find.mockReturnValue(queryMock as any);

            const result = await getUserTickets(mockUserId);

            expect(mockedTicket.find).toHaveBeenCalledWith({ user: mockUserId });
            expect(queryMock.populate).toHaveBeenCalledWith('report', 'title');
            expect(queryMock.populate).toHaveBeenCalledWith('admin', 'username');
            expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(result).toEqual(userTickets);
        });

        it('should throw NotFoundError if userId is not provided', async () => {
            await expect(getUserTickets(undefined)).rejects.toThrow(NotFoundError);
        });
    });
});
