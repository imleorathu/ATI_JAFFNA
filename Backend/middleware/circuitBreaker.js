/**
 * Circuit Breaker pattern for external API calls (Groq, etc.)
 * 
 * Prevents cascading failures by stopping calls to failing services
 * and providing fallback responses after a threshold of failures.
 */

import logger from "../lib/logger.js";

const CIRCUIT_STATES = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN"
};

const DEFAULT_OPTIONS = {
  failureThreshold: 5,       // Number of failures before opening circuit
  successThreshold: 3,      // Number of successes before closing circuit
  timeout: 30000,            // Time (ms) to wait before trying again (30s)
  cooldownPeriod: 60000      // Time (ms) to keep circuit open before half-open (60s)
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - The async function to execute
   * @param {Function} fallbackFn - Optional fallback function if circuit is open
   * @returns {Promise<any>}
   */
  async call(fn, fallbackFn = null) {
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime) {
        logger.warn("Circuit breaker OPEN - using fallback", { service: this.name });
        
        if (fallbackFn) {
          return fallbackFn();
        }
        
        throw new Error(`Service ${this.name} is unavailable (circuit breaker open)`);
      }
      
      // Transition to half-open after cooldown
      this.state = CIRCUIT_STATES.HALF_OPEN;
      logger.info("Circuit breaker HALF_OPEN - allowing test request", { service: this.name });
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successCount += 1;
      
      if (this.successCount >= this.options.successThreshold) {
        this.state = CIRCUIT_STATES.CLOSED;
        this.successCount = 0;
        this.nextAttemptTime = null;
        logger.info("Circuit breaker CLOSED - service restored", { service: this.name });
      }
    }
  }

  onFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    this.successCount = 0;
    
    if (this.state === CIRCUIT_STATES.HALF_OPEN || this.failureCount >= this.options.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttemptTime = Date.now() + this.options.cooldownPeriod;
      logger.warn("Circuit breaker OPEN", { 
        service: this.name, 
        failures: this.failureCount,
        cooldownMs: this.options.cooldownPeriod 
      });
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    logger.info("Circuit breaker reset", { service: this.name });
  }
}

// Singleton circuit breakers
const circuitBreakers = new Map();

function getCircuitBreaker(name, options = {}) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name);
}

export { CircuitBreaker, getCircuitBreaker, CIRCUIT_STATES };