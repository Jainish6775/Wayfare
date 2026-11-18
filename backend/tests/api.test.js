const assert = require('assert');
const { generateToken, verifyToken } = require('../src/utils/token');
const { hashPassword, comparePassword } = require('../src/utils/hash');
const tripController = require('../src/controllers/trip.controller');
const authController = require('../src/controllers/auth.controller');
const expensesController = require('../src/controllers/expenses.controller');
const communityController = require('../src/controllers/community.controller');
const savedDestinationsController = require('../src/controllers/saved_destinations.controller');
const itineraryController = require('../src/controllers/itinerary.controller');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

(async () => {
  console.log('\n=== RUNNING BACKEND INTEGRATION & LOGIC TESTS ===\n');

  // Test 1: Hash Utilities
  await asyncTest('hashPassword generates valid hash and comparePassword validates', async () => {
    const password = 'SecretPassword123!';
    const hash = await hashPassword(password);
    assert(hash && hash.length > 20, 'Hash should be generated');
    const isValid = await comparePassword(password, hash);
    assert.strictEqual(isValid, true, 'Original password should match');
    const isInvalid = await comparePassword('WrongPassword', hash);
    assert.strictEqual(isInvalid, false, 'Wrong password should fail');
  });

  // Test 2: Token Utilities
  test('generateToken and verifyToken work correctly with payload', () => {
    const payload = { id: 42, email: 'commander@wayfare.os' };
    const token = generateToken(payload);
    assert(typeof token === 'string' && token.length > 20, 'Token must be a string');
    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, 42, 'Decoded ID must match');
    assert.strictEqual(decoded.email, 'commander@wayfare.os', 'Decoded email must match');
  });

  test('verifyToken throws on corrupted token', () => {
    assert.throws(() => {
      verifyToken('invalid.token.signature');
    }, /invalid token/i);
  });

  // Test 3: Auth Controller Input Validation
  await asyncTest('authController.register rejects missing fields', async () => {
    let statusCode = null;
    let jsonResult = null;
    const req = { body: { email: 'test@example.com' } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };
    await authController.register(req, res, () => {});
    assert.strictEqual(statusCode, 400, 'Should reject with status 400');
    assert(jsonResult.error.includes('required'), 'Should indicate missing required fields');
  });

  await asyncTest('authController.login rejects missing password', async () => {
    let statusCode = null;
    let jsonResult = null;
    const req = { body: { email: 'commander@wayfare.os' } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };
    await authController.login(req, res, () => {});
    assert.strictEqual(statusCode, 400, 'Should reject with status 400');
    assert(jsonResult.error.includes('required'), 'Should indicate missing required fields');
  });

  // Test 4: Trip Controller Validation
  await asyncTest('tripController.createTrip rejects missing start/end dates', async () => {
    let statusCode = null;
    let jsonResult = null;
    const req = { user: { id: 1 }, body: { name: 'Expedition to Kyoto' } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };
    await tripController.createTrip(req, res, () => {});
    assert.strictEqual(statusCode, 400, 'Should reject with status 400');
    assert(jsonResult.error.includes('start date, and end date'), 'Should require dates');
  });

  // Test 5: Saved Destinations Controller
  await asyncTest('savedDestinationsController.save rejects missing destination_id', async () => {
    let statusCode = null;
    let jsonResult = null;
    const req = { user: { id: 1 }, body: {} };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; return res; }
    };
    await savedDestinationsController.save(req, res, () => {});
    assert.strictEqual(statusCode, 400, 'Should reject with status 400');
    assert(jsonResult.error.includes('destination_id is required'), 'Should require destination_id');
  });

  // Test 6: Verify all controller exports exist
  test('All controllers have required methods exported', () => {
    assert(typeof tripController.createTrip === 'function');
    assert(typeof tripController.getMyTrips === 'function');
    assert(typeof tripController.getTrip === 'function');
    assert(typeof tripController.updateTrip === 'function');
    assert(typeof tripController.deleteTrip === 'function');
    assert(typeof tripController.duplicateTrip === 'function');
    assert(typeof tripController.shareTrip === 'function');
    assert(typeof tripController.getSharedTrip === 'function');

    assert(typeof expensesController.getBudgetSummary === 'function');
    assert(typeof expensesController.getTripExpenses === 'function');
    assert(typeof expensesController.addExpense === 'function');
    assert(typeof expensesController.updateExpense === 'function');
    assert(typeof expensesController.deleteExpense === 'function');

    assert(typeof communityController.getPublicTrips === 'function');
    assert(typeof communityController.likeTrip === 'function');
    assert(typeof communityController.saveTrip === 'function');
    assert(typeof communityController.copyTrip === 'function');

    assert(typeof itineraryController.getActivitiesForStop === 'function');
    assert(typeof itineraryController.getAccommodationsForStop === 'function');
    assert(typeof itineraryController.getTransportsForStop === 'function');
  });

  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  process.exit(passedTests === totalTests ? 0 : 1);
})();
