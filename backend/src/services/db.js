const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Helper to auto-retry database operations when Neon Serverless PostgreSQL cold starts.
 */
async function withRetry(operation, maxRetries = 2, delayMs = 1200) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const msg = error.message || '';
      const isConnError =
        msg.includes("Can't reach database server") ||
        msg.includes("Connection pool") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("ECONNRESET") ||
        msg.includes("socket hang up");

      if (isConnError && attempt <= maxRetries) {
        console.warn(`[DB Retry] Database connection attempt ${attempt} failed (cold start). Retrying in ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

module.exports = prisma;
module.exports.withRetry = withRetry;
