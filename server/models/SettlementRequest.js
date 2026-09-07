const mongoose = require('mongoose');

const settlementRequestSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: [1, 'Settlement amount must be greater than 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor units (paise/cents)',
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'],
      default: 'UPI',
    },
    proofOrNote: {
      type: String,
      trim: true,
      maxlength: [200, 'Note or reference cannot exceed 200 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find active pending requests between pair in a trip
settlementRequestSchema.index({ tripId: 1, status: 1 });
settlementRequestSchema.index({ receiverId: 1, status: 1 });

module.exports = mongoose.model('SettlementRequest', settlementRequestSchema);
