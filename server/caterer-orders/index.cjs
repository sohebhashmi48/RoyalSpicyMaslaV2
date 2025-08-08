const orderActions = require('./orderActions.cjs');
const orderList = require('./orderList.cjs');
const orderStats = require('./orderStats.cjs');
const catererHistory = require('./catererHistory.cjs');

module.exports = {
  ...orderActions,
  ...orderList,
  ...orderStats,
  ...catererHistory,
};