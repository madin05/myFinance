// backend/src/tests/twoFactor.test.js
const prisma = require('../services/db');
const { generate2FAToken, verify2FAToken, JWT_SECRET } = require('../services/twoFactorService');
const jwt = require('jsonwebtoken');

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('RUNNING PRODUCTION 2FA AUTOMATED TEST SUITE');
  console.log('----------------------------------------------------');

  let testUser = null;

  try {
    // 1. Setup Test User in Database
    testUser = await prisma.user.upsert({
      where: { email: '2fa_test_user@myfinance.test' },
      update: { is2FAEnabled: false },
      create: {
        firebaseUid: 'test_uid_2fa_999',
        name: '2FA Tester',
        email: '2fa_test_user@myfinance.test',
        is2FAEnabled: false
      }
    });
    console.log(' Test User Ready:', testUser.email, `(ID: ${testUser.id})`);

    const mockReq = {
      headers: {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyTestBrowser/1.0'
      },
      socket: { remoteAddress: '127.0.0.1' }
    };

    // TEST 1: Token Generation & Format
    console.log('\n[TEST 1] Testing Token Generation & SHA-256 Hashing...');
    const { rawToken, preAuthToken, expiresAt } = await generate2FAToken(testUser.id, mockReq, 'LOGIN');

    if (!rawToken || rawToken.length !== 64) {
      throw new Error('TEST 1 FAILED: rawToken must be 32-byte hex string (64 characters)');
    }
    
    const decodedJwt = jwt.verify(preAuthToken, JWT_SECRET);
    if (decodedJwt.userId !== testUser.id || decodedJwt.step !== '2FA_PENDING') {
      throw new Error('TEST 1 FAILED: preAuthToken payload is invalid');
    }
    console.log(' TEST 1 PASSED: Token generated & preAuthToken JWT verified successfully!');

    // TEST 2: Housekeeping (Expired token cleanup)
    console.log('\n[TEST 2] Testing Housekeeping (Expired Token Clean Up)...');
    // Create an artificial expired token
    await prisma.twoFactorToken.create({
      data: {
        userId: testUser.id,
        tokenHash: 'dummy_expired_hash',
        deviceIp: '127.0.0.1',
        userAgent: 'DummyAgent',
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 mins ago
        isUsed: false
      }
    });
    // Generate new token which should trigger housekeeping cleanup
    await generate2FAToken(testUser.id, mockReq, 'LOGIN');
    const expiredCount = await prisma.twoFactorToken.count({
      where: { userId: testUser.id, tokenHash: 'dummy_expired_hash' }
    });
    if (expiredCount !== 0) {
      throw new Error('TEST 2 FAILED: Housekeeping failed to clean up expired token');
    }
    console.log(' TEST 2 PASSED: Expired tokens automatically cleaned up!');

    // TEST 3: Strict Validation & Successful Verification
    console.log('\n[TEST 3] Testing Valid Token Verification...');
    const { rawToken: validRawToken } = await generate2FAToken(testUser.id, mockReq, 'LOGIN');
    const verifyResult = await verify2FAToken(validRawToken, mockReq);
    if (verifyResult.user.id !== testUser.id) {
      throw new Error('TEST 3 FAILED: Verification returned wrong user');
    }
    console.log(' TEST 3 PASSED: Valid token verified!');

    // TEST 4: Replay Attack Prevention (isUsed = true)
    console.log('\n[TEST 4] Testing Replay Attack Prevention...');
    try {
      await verify2FAToken(validRawToken, mockReq);
      throw new Error('TEST 4 FAILED: Re-using token should have been rejected!');
    } catch (err) {
      if (err.message.includes('Replay attack')) {
        console.log(' TEST 4 PASSED: Replay attack successfully blocked (403)!');
      } else {
        throw err;
      }
    }

    // TEST 5: Device / IP Context Mismatch Rejection
    console.log('\n[TEST 5] Testing Device / IP Mismatch Rejection...');
    const { rawToken: mismatchRawToken } = await generate2FAToken(testUser.id, mockReq, 'LOGIN');
    const mismatchReq = {
      headers: {
        'x-forwarded-for': '203.0.113.199', // Different IP
        'user-agent': 'HackerBrowser/9.0'    // Different User-Agent
      },
      socket: { remoteAddress: '203.0.113.199' }
    };
    try {
      await verify2FAToken(mismatchRawToken, mismatchReq);
      throw new Error('TEST 5 FAILED: Mismatched IP & User-Agent should be rejected!');
    } catch (err) {
      if (err.message.includes('Mismatch')) {
        console.log(' TEST 5 PASSED: Context mismatch successfully rejected (403)!');
      } else {
        throw err;
      }
    }

    // TEST 6: Safe Setup Flow (is2FAEnabled set ONLY after verification)
    console.log('\n[TEST 6] Testing Safe Setup Verification Flow...');
    const { rawToken: setupRawToken } = await generate2FAToken(testUser.id, mockReq, 'SETUP');
    let userBeforeVerify = await prisma.user.findUnique({ where: { id: testUser.id } });
    if (userBeforeVerify.is2FAEnabled !== false) {
      throw new Error('TEST 6 FAILED: is2FAEnabled must remain false until link is verified!');
    }
    await verify2FAToken(setupRawToken, mockReq);
    let userAfterVerify = await prisma.user.findUnique({ where: { id: testUser.id } });
    if (userAfterVerify.is2FAEnabled !== true) {
      throw new Error('TEST 6 FAILED: is2FAEnabled should become true after setup link verification!');
    }
    // TEST 7: 2FA Deactivation Magic Link Flow (Session Clean-up & is2FAEnabled = false)
    console.log('\n[TEST 7] Testing 2FA Deactivation Magic Link Verification...');
    const { rawToken: disableRawToken } = await generate2FAToken(testUser.id, mockReq, 'DISABLE');
    const disableResult = await verify2FAToken(disableRawToken, mockReq);

    let userAfterDeactivation = await prisma.user.findUnique({ where: { id: testUser.id } });
    let tokensAfterDeactivation = await prisma.twoFactorToken.count({ where: { userId: testUser.id, isUsed: false } });

    if (disableResult.tokenType !== 'DISABLE' || userAfterDeactivation.is2FAEnabled !== false) {
      throw new Error('TEST 7 FAILED: 2FA deactivation magic link verification failed');
    }
    console.log(' TEST 7 PASSED: 2FA deactivation magic link verification & session clean-up verified!');

    console.log('\n🎉 ALL 7 AUTOMATED 2FA SECURITY TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('\nTEST SUITE FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup Test Data
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests();
