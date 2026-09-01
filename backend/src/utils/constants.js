const ROLES = {
  CUSTOMER: 'CUSTOMER',
  TRUCK_OWNER: 'TRUCK_OWNER',
  ADMIN: 'ADMIN',
};

const REQUEST_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  QUOTED: 'quoted',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const QUOTATION_STATUS = {
  SENT: 'sent',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
};

const SHIPMENT_STATUS = {
  CONFIRMED: 'confirmed',
  ASSIGNED: 'assigned',
  PICKUP: 'pickup',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
};

const PAYMENT_METHOD = {
  BANK_TRANSFER: 'bank_transfer',
  UPI: 'upi',
  CHEQUE: 'cheque',
  MOCK: 'mock',
};

const TRUCK_TYPE = ['light', 'medium', 'heavy', 'flatbed', 'tanker', 'container'];

const CARGO_TYPE = ['Machinery', 'Electronics', 'Chemicals', 'FMCG', 'Containers', 'Agriculture', 'Other'];

const ORG_TYPE = ['fleet_owner', 'business'];

const VEHICLE_TYPE = ['light', 'medium', 'heavy', 'flatbed', 'tanker'];

const DOCUMENT_TYPE = ['invoice', 'pod', 'manifest', 'lr'];

const ROLE_LIST = Object.values(ROLES);

module.exports = {
  ROLES,
  ROLE_LIST,
  REQUEST_STATUS,
  QUOTATION_STATUS,
  SHIPMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  TRUCK_TYPE,
  CARGO_TYPE,
  ORG_TYPE,
  VEHICLE_TYPE,
  DOCUMENT_TYPE,
};
