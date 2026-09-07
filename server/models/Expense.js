const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shareAmountMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    amountMinor: {
      type: Number, // In paise/cents (integer)
      required: [true, 'Expense amount is required'],
      min: [1, 'Amount must be at least 1 cent/paise'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor currency units',
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['FOOD', 'TRAVEL', 'STAY', 'ACTIVITIES', 'ENTERTAINMENT', 'SHOPPING', 'SETTLEMENT', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    splitType: {
      type: String,
      enum: ['EQUAL', 'PERCENTAGE', 'EXACT'],
      default: 'EQUAL',
    },
    paidById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    splitBetween: {
      type: [expenseSplitSchema],
      validate: {
        validator: function (splits) {
          return splits && splits.length > 0;
        },
        message: 'Expense must be split between at least one member',
      },
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Timeline query index
expenseSchema.index({ tripId: 1, deletedAt: 1, expenseDate: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
