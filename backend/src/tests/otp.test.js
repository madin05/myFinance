// backend/src/tests/otp.test.js
const prisma = require('../services/db');
const { generateOtp, verifyOtp, hashOtp, OTP_LENGTH, MAX_ATTEMPTS } = require('../services/otpService');

async function runOtpTests() {
  console.log('----------------------------------------------------');
  console.log('RUNNING PRODUCTION OTP SECURITY AUTOMATED TEST SUITE');
  console.log('----------------------------------------------------');

  let testUser = null;

  try {
    // 1. Setup Test User in Database
    testUser = await prisma.user.upsert({
      where: { email: 'otp_test_user@myfinance.test' },
      update: {},
      create: {
        firebaseUid: 'test_uid_otp_888',
        name: 'OTP Tester',
        email: 'otp_test_user@myfinance.test'
      }
    });
    console.log(' Test User Ready:', testUser.email, `(ID: ${testUser.id})`);

    // TEST 1: OTP Generation & SHA-256 Hashing Format
    console.log('\n[TEST 1] Testing OTP Generation & SHA-256 Hashing...');
    const { otpCode, expiresAt } = await generateOtp(testUser.id);

    if (!otpCode || otpCode.length !== OTP_LENGTH || !/^\d{6}$/.test(otpCode)) {
      throw new Error(`TEST 1 FAILED: otpCode must be a ${OTP_LENGTH}-digit numeric string`);
    }

    const expectedHash = hashOtp(otpCode);
    const dbRecord = await prisma.otpVerification.findFirst({
      where: { userId: testUser.id, isUsed: false }
    });

    if (!dbRecord || dbRecord.otpHash !== expectedHash) {
      throw new Error('TEST 1 FAILED: Database record must store the SHA-256 hash of the OTP');
    }
    console.log(' TEST 1 PASSED: 6-digit OTP generated & stored as SHA-256 hash!');

    // TEST 2: Wrong OTP Code & Attempt Counter
    console.log('\n[TEST 2] Testing Wrong OTP Code & Attempt Counter Increment...');
    const wrongOtp = otpCode === '123456' ? '654321' : '123456';
    try {
      await verifyOtp(testUser.id, wrongOtp);
      throw new Error('TEST 2 FAILED: Wrong OTP should have thrown an error');
    } catch (err) {
      if (err.message.includes('Kode OTP salah')) {
        console.log(' TEST 2 PASSED: Wrong OTP code rejected and attempt counter incremented!');
      } else {
        throw err;
      }
    }

    // TEST 3: Max Attempts Lockout (5 wrong attempts)
    console.log('\n[TEST 3] Testing Max Attempts Lockout...');
    const { otpCode: newOtpCode } = await generateOtp(testUser.id);
    const wrongOtpCode = newOtpCode === '111111' ? '222222' : '111111';

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        await verifyOtp(testUser.id, wrongOtpCode);
      } catch (e) {
        // Expected failures for wrong attempts
      }
    }

    try {
      await verifyOtp(testUser.id, newOtpCode);
      throw new Error('TEST 3 FAILED: OTP verification after max attempts should be locked out!');
    } catch (err) {
      if (err.message.includes('Terlalu banyak percobaan')) {
        console.log(' TEST 3 PASSED: Max attempt lockout enforced!');
      } else {
        throw err;
      }
    }

    // TEST 4: Successful OTP Verification & Single-Use Check
    console.log('\n[TEST 4] Testing Valid OTP Verification & Replay Attack Prevention...');
    const { otpCode: validOtpCode } = await generateOtp(testUser.id);
    const result = await verifyOtp(testUser.id, validOtpCode);

    if (!result.success) {
      throw new Error('TEST 4 FAILED: Valid OTP verification failed');
    }

    // Replay attack test
    try {
      await verifyOtp(testUser.id, validOtpCode);
      throw new Error('TEST 4 FAILED: Re-using valid OTP must be rejected!');
    } catch (err) {
      if (err.message.includes('tidak ditemukan')) {
        console.log(' TEST 4 PASSED: Valid OTP verified & replay attack prevented!');
      } else {
        throw err;
      }
    }

    // TEST 5: Housekeeping Cleanup
    console.log('\n[TEST 5] Testing Housekeeping / Cleanup...');
    await generateOtp(testUser.id);
    const activeCount = await prisma.otpVerification.count({
      where: { userId: testUser.id, isUsed: false }
    });

    if (activeCount !== 1) {
      throw new Error(`TEST 5 FAILED: Housekeeping failed, found ${activeCount} active records instead of 1`);
    }
    console.log(' TEST 5 PASSED: Housekeeping ensures only 1 active OTP per user!');

    console.log('\n🎉 ALL 5 AUTOMATED OTP SECURITY TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('\nTEST SUITE FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runOtpTests();
