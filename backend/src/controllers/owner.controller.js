const User = require('../models/User');
const Organization = require('../models/Organization');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');

const publicOwnersSchema = {};

async function listOwners(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const users = await User.find({ role: ROLES.TRUCK_OWNER, isActive: true }).select('name email organizationId').lean();
    const orgs = await Organization.find({ ownerId: { $in: users.map((u) => u._id) } }).lean();
    const orgByOwner = orgs.reduce((acc, o) => ((acc[o.ownerId.toString()] = o), acc), {});

    const result = users.map((u) => ({
      ownerId: u._id,
      name: u.name,
      companyName: orgByOwner[u._id.toString()]?.name || '',
      city: orgByOwner[u._id.toString()]?.city || '',
    }));

    res.json(new ApiResponse(200, 'Fleet owners fetched', { owners: result }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listOwners, publicOwnersSchema };
