import { Document, Schema, Model, Types, model } from 'mongoose';
import { IReport } from '../dto';

const ReportSchema = new Schema<IReport>({
	user: { 
		type: Schema.Types.ObjectId, ref: 'User', required: true 
	},
	title: { 
		type: String, required: true, maxlength: 100 
	},
	description: { 
		type: String, maxlength: 1000 
	},
	approximatePosition: { 
		type: String 
	},
	location: {
		type: {
			type: String,
			enum: ['Point', 'Area'],
			required: true,
			default: 'Point'
		},
		coordinates: {
			type: [Number],
			required: true,
			validate: {
				validator: function(coords: number[]) {
					if (this.location.type === 'Point') {
						return (
							coords.length === 2 &&
							coords[0] >= -180 && coords[0] <= 180 && // longitude
							coords[1] >= -90 && coords[1] <= 90      // latitude
						);
					} else if (this.location.type === 'Area') {
						// For polygons - first and last points must match
						return (
							coords.length >= 6 && // Minimum 3 points (x,y)*3 + closing point
							coords.length % 2 === 0 && // Must be pairs
							coords[0] === coords[coords.length - 2] && // Closed loop
							coords[1] === coords[coords.length - 1]
						);
					}
					return false;
				},
				message: 'Invalid coordinates for location type.'
			}
		}
	},
	city: { 
		type: String, required: true
	},
	category: { 
		type: [String], 
		required: true,
		default: ['Other']
	},
	priority: {
		type: String,
		enum: ['High', 'Medium', 'Low'],
		default: 'Medium'
	},
	images: {
		type: [{ 
			key: { type: String, required: true },
			url: { type: String, required: true },
		}],
		default: [],
		max: 5,
	},
	completionStatus: { 
		type: Number, default: 0
	},
	resolvedAt: { 
		type: Date 
	},
	resolvedBy: { 
		type: Schema.Types.ObjectId, ref: 'User' 
	},
	approvalStatus: { 
		type: Number,
		enum: [0, 1, 2], // 0=Pending, 1=Approved, 2=Rejected
		default: 0,
	},
	status: { 
		type: Number, 
		default: 0 
	},
	score: {
		type: Number,
		default: 0,
		required: true,
	},
	voteScore: { 
		type: Number, default: 0 
	},
	votes: {
		type: [{ 
			user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
			direction: { type: String, enum: ['Up', 'Down']}, 
		}],
		default: [],
	},
	comments: [{
		user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		text: { type: String, required: true, maxlength: 500 }, // change to ini
		date: { type: Date, default: Date.now }
	}]
},{
	timestamps: true,
	toJSON: { 
		virtuals: true,  // to include virtual fields
		transform: function(doc, ret) {
			delete ret.__v;
			return ret;
		}
	},
	toObject: {
		virtuals: true,
		transform: function(doc, ret) {
			delete ret.__v;
			return ret;
		},
	}
});

ReportSchema.index({ 'location.coordinates': '2dsphere' });

// Add text index for searchable fields
ReportSchema.index({
	title: 'text',
	// description: 'text',
	// approximatePosition: 'text',
	city: 'text'
});

// ReportSchema.virtual('formattedAddress').get(function() {
// 	return `${this.approximatePosition}, ${this.city}`;
// });

ReportSchema.virtual('isResolved').get(function() {
	return this.resolvedAt !== undefined;
});

ReportSchema.pre<IReport>('save', function(next) {
	if (this.isModified('location')) {
		if (this.location.type === 'Point' && this.location.coordinates.length !== 2) {
			throw new Error('Point locations require exactly 2 coordinates [longitude, latitude].');
		}
		if (this.location.type === 'Area' && this.location.coordinates.length < 6) {
			throw new Error('Area locations require at least 3 coordinate pairs.');
		}
	}
	next();
});

const Report: Model<IReport> = model<IReport>('Report', ReportSchema);

export default Report;
