/**
 * Bidirectional Marketplace Reputation System
 *
 * An event-driven, functional reputation scoring algorithm that works for both buyers and sellers
 * in a marketplace, supporting an arbitrary number of metrics with SQLite storage.
 */

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

// Types for our reputation system
type UserRole = "buyer" | "seller";

interface User {
  id: string;
  roles: UserRole[]; // A user can be both a buyer and seller
}

interface MetricConfig {
  name: string;
  description: string;
  minValue: number;
  maxValue: number;
  defaultWeight: number;
  decayFactor?: number; // Optional time decay factor
  applyTo: UserRole[]; // Which user roles this metric applies to
}

interface ReputationConfig {
  metrics: MetricConfig[];
  globalWeights: Record<string, number>; // Global importance of each metric
  roleWeights: Record<UserRole, number>; // Importance multiplier for each role
  recencyBias: number; // 0-1, how much to favor recent reviews
  minTransactions: number; // Minimum transactions before full reliability
  reliabilityScaling: number; // How quickly reliability grows with transactions
}

interface RatingEvent {
  userId: string;
  metricName: string;
  value: number;
  timestamp: Date;
}

// Database init and schema management
export async function initDatabase(dbPath: string): Promise<Database> {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      roles TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics (
      name TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      min_value REAL NOT NULL,
      max_value REAL NOT NULL,
      default_weight REAL NOT NULL,
      decay_factor REAL,
      apply_to TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (metric_name) REFERENCES metrics (name)
    );

    CREATE TABLE IF NOT EXISTS metric_weights (
      user_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (user_id, metric_name),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (metric_name) REFERENCES metrics (name)
    );

    CREATE TABLE IF NOT EXISTS reputation_scores (
      user_id TEXT PRIMARY KEY,
      score REAL NOT NULL,
      last_updated TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

// Config management
export async function saveConfig(
  db: Database,
  config: ReputationConfig,
): Promise<void> {
  const tx = await db.run("BEGIN TRANSACTION");

  try {
    // Clear existing config
    await db.run("DELETE FROM metrics");
    await db.run("DELETE FROM config");

    // Save metrics
    for (const metric of config.metrics) {
      await db.run(
        `INSERT INTO metrics (name, description, min_value, max_value, default_weight, decay_factor, apply_to) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        metric.name,
        metric.description,
        metric.minValue,
        metric.maxValue,
        metric.defaultWeight,
        metric.decayFactor || null,
        JSON.stringify(metric.applyTo),
      );
    }

    // Save other config parts
    await db.run(
      "INSERT INTO config (key, value) VALUES (?, ?)",
      "globalWeights",
      JSON.stringify(config.globalWeights),
    );

    await db.run(
      "INSERT INTO config (key, value) VALUES (?, ?)",
      "roleWeights",
      JSON.stringify(config.roleWeights),
    );

    await db.run(
      "INSERT INTO config (key, value) VALUES (?, ?)",
      "recencyBias",
      config.recencyBias.toString(),
    );

    await db.run(
      "INSERT INTO config (key, value) VALUES (?, ?)",
      "minTransactions",
      config.minTransactions.toString(),
    );

    await db.run(
      "INSERT INTO config (key, value) VALUES (?, ?)",
      "reliabilityScaling",
      config.reliabilityScaling.toString(),
    );

    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

export async function loadConfig(db: Database): Promise<ReputationConfig> {
  // Load metrics
  const metrics = await db.all("SELECT * FROM metrics");

  // Load other config parts
  const configRows = await db.all("SELECT key, value FROM config");
  const configMap = new Map(configRows.map((row) => [row.key, row.value]));

  return {
    metrics: metrics.map((m) => ({
      name: m.name,
      description: m.description,
      minValue: m.min_value,
      maxValue: m.max_value,
      defaultWeight: m.default_weight,
      decayFactor: m.decay_factor,
      applyTo: JSON.parse(m.apply_to),
    })),
    globalWeights: JSON.parse(configMap.get("globalWeights") || "{}"),
    roleWeights: JSON.parse(configMap.get("roleWeights") || "{}"),
    recencyBias: parseFloat(configMap.get("recencyBias") || "0.3"),
    minTransactions: parseInt(configMap.get("minTransactions") || "5", 10),
    reliabilityScaling: parseFloat(
      configMap.get("reliabilityScaling") || "1.5",
    ),
  };
}

// User management
export async function registerUser(
  db: Database,
  userId: string,
  roles: UserRole[],
): Promise<void> {
  // Check if user exists
  const existingUser = await db.get(
    "SELECT id FROM users WHERE id = ?",
    userId,
  );
  if (existingUser) {
    throw new Error(`User ${userId} already exists`);
  }

  // Get all metrics
  const metrics = await db.all(
    "SELECT name, default_weight, apply_to FROM metrics",
  );

  // Start transaction
  const tx = await db.run("BEGIN TRANSACTION");

  try {
    // Insert user
    await db.run(
      "INSERT INTO users (id, roles) VALUES (?, ?)",
      userId,
      JSON.stringify(roles),
    );

    // Insert metric weights for applicable metrics
    for (const metric of metrics) {
      const applyTo = JSON.parse(metric.apply_to);
      if (applyTo.some((role: UserRole) => roles.includes(role))) {
        await db.run(
          "INSERT INTO metric_weights (user_id, metric_name, weight) VALUES (?, ?, ?)",
          userId,
          metric.name,
          metric.default_weight,
        );
      }
    }

    // Initialize reputation score
    await db.run(
      "INSERT INTO reputation_scores (user_id, score, last_updated) VALUES (?, ?, ?)",
      userId,
      0,
      new Date().toISOString(),
    );

    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

export async function getUser(
  db: Database,
  userId: string,
): Promise<User | null> {
  const user = await db.get("SELECT id, roles FROM users WHERE id = ?", userId);
  if (!user) return null;

  return {
    id: user.id,
    roles: JSON.parse(user.roles),
  };
}

// Rating functions
export async function submitRating(
  db: Database,
  userId: string,
  metricName: string,
  value: number,
  timestamp: Date = new Date(),
): Promise<void> {
  // Validate user exists
  const user = await getUser(db, userId);
  if (!user) {
    throw new Error(`User ${userId} does not exist`);
  }

  // Validate metric
  const metric = await db.get(
    "SELECT name, min_value, max_value, apply_to FROM metrics WHERE name = ?",
    metricName,
  );

  if (!metric) {
    throw new Error(`Metric ${metricName} does not exist`);
  }

  // Check if metric applies to user's roles
  const metricApplyTo = JSON.parse(metric.apply_to);
  if (!metricApplyTo.some((role: UserRole) => user.roles.includes(role))) {
    throw new Error(`Metric ${metricName} does not apply to user ${userId}`);
  }

  // Validate rating value
  if (value < metric.min_value || value > metric.max_value) {
    throw new Error(`Rating value outside allowed range for ${metricName}`);
  }

  // Insert rating event
  await db.run(
    "INSERT INTO ratings (user_id, metric_name, value, timestamp) VALUES (?, ?, ?, ?)",
    userId,
    metricName,
    value,
    timestamp.toISOString(),
  );

  // Recalculate reputation
  await calculateUserReputation(db, userId);
}

// Helper function to get all ratings for a user
async function getUserRatings(
  db: Database,
  userId: string,
): Promise<Record<string, { values: number[]; timestamps: string[] }>> {
  const ratings = await db.all(
    "SELECT metric_name, value, timestamp FROM ratings WHERE user_id = ? ORDER BY timestamp ASC",
    userId,
  );

  const result: Record<string, { values: number[]; timestamps: string[] }> = {};

  for (const rating of ratings) {
    if (!result[rating.metric_name]) {
      result[rating.metric_name] = { values: [], timestamps: [] };
    }

    result[rating.metric_name].values.push(rating.value);
    result[rating.metric_name].timestamps.push(rating.timestamp);
  }

  return result;
}

// Reputation calculation
export async function calculateUserReputation(
  db: Database,
  userId: string,
): Promise<number> {
  const user = await getUser(db, userId);
  if (!user) {
    throw new Error(`User ${userId} does not exist`);
  }

  // Load config
  const config = await loadConfig(db);

  // Get user's ratings
  const ratings = await getUserRatings(db, userId);

  // Get user's metric weights
  const weightRows = await db.all(
    "SELECT metric_name, weight FROM metric_weights WHERE user_id = ?",
    userId,
  );

  const metricWeights: Record<string, number> = {};
  for (const row of weightRows) {
    metricWeights[row.metric_name] = row.weight;
  }

  // Get all metrics definitions
  const metrics = await db.all("SELECT * FROM metrics");
  const metricConfigs = new Map(
    metrics.map((m) => [
      m.name,
      {
        minValue: m.min_value,
        maxValue: m.max_value,
        applyTo: JSON.parse(m.apply_to),
      },
    ]),
  );

  let weightedSum = 0;
  let totalWeight = 0;

  // Calculate a reliability factor based on transaction count
  const totalTransactions = Object.values(ratings).reduce(
    (sum, metric) => sum + metric.values.length,
    0,
  );

  const reliabilityFactor = Math.min(
    1,
    (totalTransactions / config.minTransactions) * config.reliabilityScaling,
  );

  // For each metric with ratings
  for (const [metricName, metricData] of Object.entries(ratings)) {
    if (metricData.values.length === 0) continue;

    const metricConfig = metricConfigs.get(metricName);
    if (!metricConfig) continue;

    // Calculate weighted average with recency bias
    let metricValue = 0;
    let totalRecencyWeight = 0;

    for (let i = 0; i < metricData.values.length; i++) {
      // More recent ratings get more weight
      const recencyWeight = Math.pow(
        (i + 1) / metricData.values.length,
        config.recencyBias * 2,
      );

      metricValue += metricData.values[i] * recencyWeight;
      totalRecencyWeight += recencyWeight;
    }

    metricValue = metricValue / totalRecencyWeight;

    // Calculate the normalized value (0-1 scale)
    const normalizedValue =
      (metricValue - metricConfig.minValue) /
      (metricConfig.maxValue - metricConfig.minValue);

    // Calculate the weight for this metric
    let metricWeight = metricWeights[metricName] || 1.0;

    // Apply global weight for this metric if exists
    if (config.globalWeights[metricName]) {
      metricWeight *= config.globalWeights[metricName];
    }

    // Apply role-specific weights
    for (const role of user.roles) {
      if (config.roleWeights[role] && metricConfig.applyTo.includes(role)) {
        metricWeight *= config.roleWeights[role];
      }
    }

    // Apply transaction count reliability scaling
    metricWeight *= reliabilityFactor;

    weightedSum += normalizedValue * metricWeight;
    totalWeight += metricWeight;
  }

  // Calculate the final reputation score (0-100 scale)
  const reputationScore =
    totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  // Update the stored reputation score
  await db.run(
    "UPDATE reputation_scores SET score = ?, last_updated = ? WHERE user_id = ?",
    reputationScore,
    new Date().toISOString(),
    userId,
  );

  return reputationScore;
}

// Get user's reputation score
export async function getUserScore(
  db: Database,
  userId: string,
): Promise<number | null> {
  const scoreRow = await db.get(
    "SELECT score FROM reputation_scores WHERE user_id = ?",
    userId,
  );

  if (!scoreRow) {
    return null;
  }

  return scoreRow.score;
}

// Get user's metrics with their current values
export async function getUserMetrics(
  db: Database,
  userId: string,
): Promise<Record<string, { value: number; count: number }> | null> {
  const user = await getUser(db, userId);
  if (!user) {
    return null;
  }

  const ratings = await getUserRatings(db, userId);
  const result: Record<string, { value: number; count: number }> = {};

  for (const [metricName, data] of Object.entries(ratings)) {
    // Skip if no ratings
    if (data.values.length === 0) continue;

    // Calculate average
    const sum = data.values.reduce((acc, val) => acc + val, 0);
    result[metricName] = {
      value: sum / data.values.length,
      count: data.values.length,
    };
  }

  return result;
}

// Update weights for specific metrics
export async function updateMetricWeights(
  db: Database,
  userId: string,
  weights: Record<string, number>,
): Promise<void> {
  const user = await getUser(db, userId);
  if (!user) {
    throw new Error(`User ${userId} does not exist`);
  }

  const tx = await db.run("BEGIN TRANSACTION");

  try {
    for (const [metricName, weight] of Object.entries(weights)) {
      // Validate metric exists
      const metric = await db.get(
        "SELECT name FROM metrics WHERE name = ?",
        metricName,
      );
      if (!metric) {
        throw new Error(`Metric ${metricName} does not exist`);
      }

      if (weight <= 0) {
        throw new Error(`Weight must be positive for metric ${metricName}`);
      }

      // Update weight
      await db.run(
        `INSERT INTO metric_weights (user_id, metric_name, weight) 
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, metric_name) DO UPDATE SET weight = ?`,
        userId,
        metricName,
        weight,
        weight,
      );
    }

    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }

  // Recalculate reputation after weight update
  await calculateUserReputation(db, userId);
}

// Compare users based on a specific metric or overall reputation
export async function compareUsers(
  db: Database,
  userIds: string[],
  metricName?: string,
): Promise<Array<{ userId: string; score: number }>> {
  const result: Array<{ userId: string; score: number }> = [];

  for (const userId of userIds) {
    if (metricName) {
      // Compare specific metric
      const metrics = await getUserMetrics(db, userId);
      if (metrics && metrics[metricName]) {
        result.push({
          userId,
          score: metrics[metricName].value,
        });
      }
    } else {
      // Compare overall reputation
      const score = await getUserScore(db, userId);
      if (score !== null) {
        result.push({ userId, score });
      }
    }
  }

  // Sort by score in descending order
  return result.sort((a, b) => b.score - a.score);
}

// Get top users based on overall reputation or a specific metric
export async function getTopUsers(
  db: Database,
  limit: number,
  roles?: UserRole[],
  metricName?: string,
): Promise<Array<{ userId: string; score: number }>> {
  let query = "SELECT id FROM users";
  const params: any[] = [];

  // Add roles filter if provided
  if (roles && roles.length > 0) {
    query += " WHERE ";
    const conditions = roles.map(() => "roles LIKE ?");
    query += conditions.join(" OR ");

    // Add parameters for LIKE clause
    params.push(...roles.map((role) => `%${role}%`));
  }

  const users = await db.all(query, ...params);
  const userIds = users.map((u) => u.id);

  // Compare and return top users
  const comparedUsers = await compareUsers(db, userIds, metricName);
  return comparedUsers.slice(0, limit);
}

// Example configuration
export const exampleConfig: ReputationConfig = {
  metrics: [
    {
      name: "communication",
      description: "Quality and timeliness of communication",
      minValue: 1,
      maxValue: 5,
      defaultWeight: 1.0,
      applyTo: ["buyer", "seller"],
    },
    {
      name: "reliability",
      description: "Reliability in completing transactions",
      minValue: 1,
      maxValue: 5,
      defaultWeight: 1.2,
      applyTo: ["buyer", "seller"],
    },
    {
      name: "itemQuality",
      description: "Quality of items sold",
      minValue: 1,
      maxValue: 5,
      defaultWeight: 1.5,
      applyTo: ["seller"],
    },
    {
      name: "paymentSpeed",
      description: "Speed of payment",
      minValue: 1,
      maxValue: 5,
      defaultWeight: 1.3,
      applyTo: ["buyer"],
    },
  ],
  globalWeights: {
    communication: 1.0,
    reliability: 1.5,
    itemQuality: 1.2,
    paymentSpeed: 1.0,
  },
  roleWeights: {
    buyer: 1.0,
    seller: 1.2, // Sellers have slightly more weight
  },
  recencyBias: 0.3, // 30% weight to newest ratings
  minTransactions: 5, // Need 5 transactions for full reliability
  reliabilityScaling: 1.5, // Increase reliability faster with more transactions
};

// Example usage with async/await
export async function demonstrateReputationSystem(): Promise<void> {
  // Create in-memory database for demonstration
  const db = await initDatabase(":memory:");

  // Initialize with example config
  await saveConfig(db, exampleConfig);

  // Register users
  await registerUser(db, "user1", ["buyer"]);
  await registerUser(db, "user2", ["seller"]);
  await registerUser(db, "user3", ["buyer", "seller"]);

  // Submit ratings
  await submitRating(db, "user1", "communication", 4.5);
  await submitRating(db, "user1", "reliability", 5.0);
  await submitRating(db, "user1", "paymentSpeed", 4.8);

  await submitRating(db, "user2", "communication", 3.7);
  await submitRating(db, "user2", "reliability", 4.2);
  await submitRating(db, "user2", "itemQuality", 4.9);

  await submitRating(db, "user3", "communication", 4.0);
  await submitRating(db, "user3", "reliability", 3.8);
  await submitRating(db, "user3", "itemQuality", 4.5);
  await submitRating(db, "user3", "paymentSpeed", 3.2);

  // Get reputation scores
  console.log("User1 Score:", await getUserScore(db, "user1"));
  console.log("User2 Score:", await getUserScore(db, "user2"));
  console.log("User3 Score:", await getUserScore(db, "user3"));

  // Compare top sellers
  console.log("Top Sellers:", await getTopUsers(db, 2, ["seller"]));

  // Compare by specific metric
  console.log(
    "Top by Communication:",
    await getTopUsers(db, 3, undefined, "communication"),
  );

  // Close database
  await db.close();
}
