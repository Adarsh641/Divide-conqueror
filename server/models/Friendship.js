const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    establishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so only one friendship record exists per pair
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Static helper to verify if two users are friends
friendshipSchema.statics.areFriends = async function (userIdA, userIdB) {
  const [first, second] = [userIdA.toString(), userIdB.toString()].sort();
  const exists = await this.findOne({ user1: first, user2: second });
  return !!exists;
};

// Static helper to create friendship in canonical order
friendshipSchema.statics.createFriendship = async function (userIdA, userIdB) {
  const [first, second] = [userIdA.toString(), userIdB.toString()].sort();
  return this.findOneAndUpdate(
    { user1: first, user2: second },
    { user1: first, user2: second, establishedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );
};

// Static helper to fetch all friend IDs for a given user
friendshipSchema.statics.getFriendIds = async function (userId) {
  const friendships = await this.find({
    $or: [{ user1: userId }, { user2: userId }],
  });

  return friendships.map((f) =>
    f.user1.toString() === userId.toString() ? f.user2 : f.user1
  );
};

const Friendship = mongoose.model('Friendship', friendshipSchema);

module.exports = Friendship;
