import {
  AnyNodeId,
  GraphMode,
  PriorityLevel,
  TASK_XP,
  calculateNewStabilityScore,
  calculateXpProgression,
  getTaskXp,
  getXpMultiplier,
} from "./architectureData";

export const STORAGE_KEY = "ascend_virtual_cluster_v1";

// ============================================================================
// VIRTUAL CLUSTER STATE TYPES (Mirrors Desktoo/ascend Polyglot Persistence)
// ============================================================================

export interface VirtualUser {
  id: string;
  userName: string;
  email: string;
  timeZone: string;
  dayStartTime: string;
  rank: string;
  level: number;
  xp: number;
  isOnboarded: boolean;
  lastActive: string;
  createdAt: string;
}

export interface VirtualAccount {
  id: string;
  userId: string;
  type: "credentials" | "oauth";
  provider: "CREDENTIALS" | "GOOGLE" | "GITHUB";
  passwordHash: string;
}

export interface VirtualHabit {
  id: string;
  userId: string;
  title: string;
  description: string;
  tag: string;
  daysOfWeek: string[];
  isActive: boolean;
  taskTitle: string;
  taskDueTime: string;
  taskPriority: PriorityLevel;
  currentStreak: number;
  longestStreak: number;
  stabilityScore: number;
}

export interface VirtualHabitMonthlyLog {
  id: string;
  userId: string;
  habitId: string;
  yearMonth: string;
  history: string; // 31-char 'S' / 'D' bitmask string
}

export interface VirtualGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  rewardText: string;
  timeFrame: "WEEKLY" | "MONTHLY";
  weekendsExcluded: boolean;
  configeDaysPerWeek: number;
  targetDays: number;
  completedDays: number;
  currentProgress: number;
  currentVelocity: number;
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;
}

export interface VirtualTask {
  id: string;
  userId: string;
  habitId: string | null;
  goalId: string | null;
  type: "Standard" | "HabitTask" | "GoalTask";
  title: string;
  status: "PENDING" | "DONE" | "ABANDONED";
  priority: PriorityLevel;
  scheduledDate: string;
  dueTime: string;
}

export interface VirtualXpTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface VirtualDynamoItem {
  PK: string;
  SK: string;
  entityType: "TASKLOG" | "HABITLOG" | "REFLECTION";
  id: string;
  timestamp: string;
  GSI1_PK?: string;
  GSI2_PK?: string;
  payload: Record<string, unknown>;
}

export interface VirtualMongoNotification {
  _id: string;
  userId: string;
  type: "RANK_UP" | "XP_GAIN" | "REFLECTION" | "SYSTEM";
  title: string;
  body: string;
  data: Record<string, unknown>;
  ttlExpiresIn: string;
  createdAt: string;
}

export interface VirtualMongoReflectionDoc {
  _id: string;
  userId: string;
  logicalDate: string;
  mood: string;
  energyScore: number;
  tags: string[];
  reflectionText: string;
  metadata: {
    timeZone: string;
    dayStartTime: string;
    wordCount: number;
  };
  createdAt: string;
}

export interface VirtualBullMQJob {
  jobId: string;
  queue: "habits-queue" | "notification-queue" | "xp-calculation-queue";
  name: string;
  status: "completed" | "active" | "delayed";
  data: Record<string, unknown>;
  timestamp: string;
}

export interface DecodedJwt {
  raw: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

export interface VirtualK8sState {
  cluster: string;
  namespace: string;
  helmRelease: string;
  chartVersion: string;
  commitSha: string;
  lastCommitMessage: string;
  argoSyncStatus: "Synced" | "Syncing";
  sealedSecretsCount: number;
  pods: {
    backend: { ready: number; desired: number; imageTag: string; hpa: string };
    web: { ready: number; desired: number; imageTag: string; hpa: string };
    redis: { ready: number; desired: number; pvc: string };
  };
  lastDeployedAt: string;
}

export interface VirtualClusterState {
  initializedAt: string;
  session: {
    authenticated: boolean;
    activeUserId: string;
    jwt: DecodedJwt | null;
    socketConnected: boolean;
    socketRoom: string;
  };
  postgres: {
    users: VirtualUser[];
    accounts: VirtualAccount[];
    goals: VirtualGoal[];
    habits: VirtualHabit[];
    habitMonthlyLogs: VirtualHabitMonthlyLog[];
    tasks: VirtualTask[];
    xpTransactions: VirtualXpTransaction[];
  };
  redis: {
    upstashKeys: Record<string, { value: unknown; ttl: string }>;
    dirtyUsers: string[];
    redlockStatus: string;
    bullmqJobs: VirtualBullMQJob[];
  };
  dynamodb: {
    tableName: "Day-Mark-Logs";
    items: VirtualDynamoItem[];
  };
  mongodb: {
    appnotifications: VirtualMongoNotification[];
    habit_logs: VirtualMongoReflectionDoc[];
  };
  k8s: VirtualK8sState;
}

// ============================================================================
// TRACE / EXECUTION FLOW TYPES
// ============================================================================

export type JourneyKey =
  | "auth"
  | "task"
  | "goal"
  | "habit"
  | "complete"
  | "reflection"
  | "cicd";

export interface RuleCheckItem {
  id: string;
  label: string;
  category: "Security" | "Database" | "Token" | "Cookie" | "Realtime" | "Infra";
}

export interface TraceStep {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  plainTitle: string;
  plainExplanation: string;
  businessImpact: string;
  ruleChecks: RuleCheckItem[];
  fromNode: AnyNodeId;
  toNode: AnyNodeId;
  activeNode: AnyNodeId;
  protocol: string;
  operationBadge: string;
  latencyMs: number;
  payloadTitle: string;
  payloadLanguage: "http" | "sql" | "redis" | "json" | "yaml" | "jwt" | "ws";
  payloadContent: string;
  jwtBreakdown?: DecodedJwt;
  whyThisTool: string;
  terminalLine: string;
  mutatedStore?: "postgres" | "redis" | "dynamodb" | "mongodb" | "k8s" | "session";
  applyState?: (state: VirtualClusterState) => VirtualClusterState;
}

export interface ExecutionTrace {
  id: string;
  journey: JourneyKey;
  graphMode: GraphMode;
  title: string;
  endpoint: string;
  startedAt: string;
  steps: TraceStep[];
}

// ============================================================================
// DETERMINISTIC HELPERS (Safe for Client Side)
// ============================================================================

function toBase64Url(input: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window
      .btoa(unescape(encodeURIComponent(input)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function deterministicHex(seed: string, length: number): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let out = "";
  let current = hash >>> 0;
  while (out.length < length) {
    current = Math.imul(current ^ (current >>> 15), 2246822519) >>> 0;
    out += current.toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}

export function generateSimulatedJwt(
  user: {
    id: string;
    email: string;
    userName: string;
    rank: string;
  },
  fixedIatSec?: number,
): DecodedJwt {
  const nowSec = fixedIatSec ?? Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: "ascend-prod-rsa-2026-v1",
  };
  const payload = {
    userId: user.id,
    email: user.email,
    userName: user.userName,
    rank: user.rank,
    iss: "https://api.ascendup.online",
    aud: "https://app.ascendup.online",
    iat: nowSec,
    exp: nowSec + 900, // 15 minutes (access_token)
  };
  const h64 = toBase64Url(JSON.stringify(header));
  const p64 = toBase64Url(JSON.stringify(payload));
  const sig = deterministicHex(`${h64}.${p64}.ascend-rs256`, 64);
  return {
    raw: `${h64}.${p64}.${sig}`,
    header,
    payload,
    signature: sig,
  };
}

export function getTodayStrings() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    yearMonth: `${yyyy}-${mm}`,
    dayIndex: now.getDate() - 1, // 0-indexed
    iso: now.toISOString(),
  };
}

function buildSeedMonthlyHistory(dayIndex: number, pattern: "strong" | "steady"): string {
  const chars = Array.from({ length: 31 }, () => "S");
  for (let i = 0; i < dayIndex; i++) {
    if (pattern === "strong") {
      chars[i] = i % 5 === 2 ? "S" : "D";
    } else {
      chars[i] = i % 3 === 1 ? "S" : "D";
    }
  }
  return chars.join("");
}

// ============================================================================
// SEED STATE & LOCALSTORAGE PERSISTENCE
// ============================================================================

export const SEED_DATE_STR = "2026-11-19";
export const SEED_YEAR_MONTH = "2026-11";
export const SEED_DAY_INDEX = 18; // 0-indexed (Day 19)
export const SEED_ISO = "2026-11-19T09:00:00.000Z";
const SEED_IAT_SEC = 1795078800;

export function createSeedClusterState(): VirtualClusterState {
  const dateStr = SEED_DATE_STR;
  const yearMonth = SEED_YEAR_MONTH;
  const dayIndex = SEED_DAY_INDEX;
  const iso = SEED_ISO;
  const userId = "usr_8f4c2a19-9b3e-4d1a-a201";
  const habit1Id = "hab_sysdesign_01";
  const habit2Id = "hab_deepwork_02";
  const task1Id = "tsk_habit_sysdesign_today";
  const task2Id = "tsk_habit_deepwork_today";

  // Seed user at Level 10 with 310/330 XP so completing one HIGH-priority habit (+34 XP)
  // triggers Level 11 AND Rank Up (Beginner -> Explorer) using Ascend's exact math!
  const seedUser: VirtualUser = {
    id: userId,
    userName: "akshat_dev",
    email: "akshat@ascendup.online",
    timeZone: "Asia/Kolkata",
    dayStartTime: "06:00",
    rank: "Beginner",
    level: 10,
    xp: 310,
    isOnboarded: true,
    lastActive: iso,
    createdAt: "2026-08-22T09:00:00.000Z",
  };

  const jwt = generateSimulatedJwt(seedUser, SEED_IAT_SEC);

  return {
    initializedAt: iso,
    session: {
      authenticated: true,
      activeUserId: userId,
      jwt,
      socketConnected: true,
      socketRoom: `user:${userId}`,
    },
    postgres: {
      users: [seedUser],
      accounts: [
        {
          id: "acc_local_01",
          userId,
          type: "credentials",
          provider: "CREDENTIALS",
          passwordHash:
            "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
        },
      ],
      goals: [
        {
          id: "goal_sysdesign_q4",
          userId,
          title: "Master Distributed Systems",
          description: "Complete 20 deep architecture case studies this month.",
          rewardText: "Weekend mountain trip",
          timeFrame: "MONTHLY",
          weekendsExcluded: true,
          configeDaysPerWeek: 5,
          targetDays: 20,
          completedDays: 12,
          currentProgress: 60,
          currentVelocity: 94,
          status: "ACTIVE",
          createdAt: "2026-11-01T06:00:00.000Z",
        },
      ],
      habits: [
        {
          id: habit1Id,
          userId,
          title: "Distributed Systems Architecture",
          description: "Read 1 engineering paper or design doc and sketch failure modes.",
          tag: "ENGINEERING",
          daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
          isActive: true,
          taskTitle: "Study 1 distributed systems architecture doc",
          taskDueTime: "09:30",
          taskPriority: "HIGH",
          currentStreak: 14,
          longestStreak: 21,
          stabilityScore: 84,
        },
        {
          id: habit2Id,
          userId,
          title: "Morning Strength & Mobility",
          description: "45m zone-2 cardio or compound lift session before opening IDE.",
          tag: "HEALTH",
          daysOfWeek: ["MONDAY", "WEDNESDAY", "FRIDAY", "SATURDAY"],
          isActive: true,
          taskTitle: "Complete 45m strength + mobility session",
          taskDueTime: "07:30",
          taskPriority: "MEDIUM",
          currentStreak: 6,
          longestStreak: 12,
          stabilityScore: 72,
        },
      ],
      habitMonthlyLogs: [
        {
          id: "hml_01",
          userId,
          habitId: habit1Id,
          yearMonth,
          history: buildSeedMonthlyHistory(dayIndex, "strong"),
        },
        {
          id: "hml_02",
          userId,
          habitId: habit2Id,
          yearMonth,
          history: buildSeedMonthlyHistory(dayIndex, "steady"),
        },
      ],
      tasks: [
        {
          id: task1Id,
          userId,
          habitId: habit1Id,
          goalId: null,
          type: "HabitTask",
          title: "Study 1 distributed systems architecture doc",
          status: "PENDING",
          priority: "HIGH",
          scheduledDate: dateStr,
          dueTime: `${dateStr}T09:30:00.000Z`,
        },
        {
          id: task2Id,
          userId,
          habitId: habit2Id,
          goalId: null,
          type: "HabitTask",
          title: "Complete 45m strength + mobility session",
          status: "PENDING",
          priority: "MEDIUM",
          scheduledDate: dateStr,
          dueTime: `${dateStr}T07:30:00.000Z`,
        },
      ],
      xpTransactions: [
        {
          id: "xpt_seed_01",
          userId,
          amount: 34,
          reason: "Synchronised session metrics. Level: 10",
          createdAt: "2026-11-18T18:45:00.000Z",
        },
      ],
    },
    redis: {
      upstashKeys: {
        [`refresh:${userId}`]: {
          value: `rt_${deterministicHex(userId, 24)}`,
          ttl: "604800s (7d)",
        },
        [`user:${userId}:profile`]: {
          value: {
            id: userId,
            email: seedUser.email,
            userName: seedUser.userName,
            avatarUrl: "",
            timeZone: seedUser.timeZone,
            dayStartTime: seedUser.dayStartTime,
            isOnboarded: "true",
            hasPassword: "true",
          },
          ttl: "86400s (24h)",
        },
        [`user:gamification:${userId}`]: {
          value: { level: "10", xp: "310", rank: "Beginner" },
          ttl: "PERSIST (Write-Behind)",
        },
        [`user:${userId}:habit:${habit1Id}:meta`]: {
          value: { currentStreak: "14", longestStreak: "21", stabilityScore: "84" },
          ttl: "172800s (48h)",
        },
        [`user:${userId}:habit:${habit1Id}:status:${dateStr}`]: {
          value: "PENDING",
          ttl: "172800s (48h)",
        },
        [`tasks:cache:${userId}`]: {
          value: `[cached: 2 pending tasks for ${dateStr}]`,
          ttl: "3600s (1h)",
        },
      },
      dirtyUsers: [],
      redlockStatus: "UNLOCKED (locks:user-db-sync)",
      bullmqJobs: [
        {
          jobId: `init_window:Asia/Kolkata-H06:${dateStr}`,
          queue: "habits-queue",
          name: "INITIALIZE_TIMEZONE_TASKS",
          status: "completed",
          data: {
            timeZone: "Asia/Kolkata",
            windowStartMinutes: 360,
            windowEndMinutes: 420,
            localDateString: dateStr,
          },
          timestamp: `${dateStr}T00:30:00.000Z`,
        },
      ],
    },
    dynamodb: {
      tableName: "Day-Mark-Logs",
      items: [
        {
          PK: `USER#${userId}`,
          SK: `TASKLOG#2026-11-18#tsk_prev_901`,
          entityType: "TASKLOG",
          id: "dlog_901",
          timestamp: "2026-11-18T09:12:00.000Z",
          GSI2_PK: `HABIT#${habit1Id}`,
          payload: {
            taskTitle: "Study 1 distributed systems architecture doc",
            priority: "HIGH",
            completionStatus: "ON_TIME",
          },
        },
      ],
    },
    mongodb: {
      appnotifications: [
        {
          _id: "673c0f8a1e2b4d9a8c000101",
          userId,
          type: "SYSTEM",
          title: "Cluster Virtualization Ready",
          body: "Complete a HIGH priority habit to trigger Level 11 & Explorer Rank Up!",
          data: { room: `user:${userId}` },
          ttlExpiresIn: "2592000s (30d TTL)",
          createdAt: iso,
        },
      ],
      habit_logs: [],
    },
    k8s: {
      cluster: "gke-ascend-cluster (us-central1-a)",
      namespace: "prod",
      helmRelease: "ascend-prod",
      chartVersion: "0.1.0",
      commitSha: "7c9e2a1",
      lastCommitMessage: "perf(habits): raw SQL overlay() 31-char monthly heatmap",
      argoSyncStatus: "Synced",
      sealedSecretsCount: 18,
      pods: {
        backend: { ready: 3, desired: 3, imageTag: "7c9e2a1", hpa: "3–8 pods @ 70% CPU" },
        web: { ready: 2, desired: 2, imageTag: "7c9e2a1", hpa: "2–5 pods @ 75% CPU" },
        redis: { ready: 1, desired: 1, pvc: "10Gi standard-rwo (Retain)" },
      },
      lastDeployedAt: iso,
    },
  };
}

export function loadClusterState(): VirtualClusterState {
  if (typeof window === "undefined") {
    return createSeedClusterState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedClusterState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as VirtualClusterState;
    if (!parsed?.postgres?.users?.length || !parsed?.k8s || !parsed?.postgres?.goals) {
      const seed = createSeedClusterState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return createSeedClusterState();
  }
}

export function saveClusterState(state: VirtualClusterState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors in private browsing
  }
}

export function resetClusterState(): VirtualClusterState {
  const seed = createSeedClusterState();
  saveClusterState(seed);
  return seed;
}

// ============================================================================
// JOURNEY 1: USER REGISTRATION & AUTH (POST /api/v1/auth/signup & login)
// ============================================================================

export function buildAuthTrace(
  state: VirtualClusterState,
  input: {
    mode: "register" | "login";
    userName: string;
    email: string;
    password: string;
    timeZone: string;
    dayStartTime: string;
  },
): ExecutionTrace {
  const { iso } = getTodayStrings();
  const isRegister = input.mode === "register";
  const activeUser =
    state.postgres.users.find((u) => u.id === state.session.activeUserId) ??
    state.postgres.users[0];

  const newUserId = isRegister
    ? `usr_${deterministicHex(input.email + iso, 16)}`
    : activeUser.id;
  const userName = isRegister ? input.userName.trim() || "builder_01" : activeUser.userName;
  const email = isRegister ? input.email.trim() || "builder@ascendup.online" : input.email || activeUser.email;

  const bcryptHash = `$2b$10$${deterministicHex(input.password + "PEPPER", 22)}.${deterministicHex(email, 31)}`;
  const targetUser: VirtualUser = isRegister
    ? {
        id: newUserId,
        userName,
        email,
        timeZone: input.timeZone,
        dayStartTime: input.dayStartTime,
        rank: "Beginner",
        level: 10,
        xp: 310, // Keep near rank-up so recruiter can test Journey 3 seamlessly!
        isOnboarded: true,
        lastActive: iso,
        createdAt: iso,
      }
    : {
        ...activeUser,
        email,
        timeZone: input.timeZone,
        dayStartTime: input.dayStartTime,
        lastActive: iso,
      };

  const issuedJwt = generateSimulatedJwt(targetUser);
  const refreshToken = `rt_${deterministicHex(issuedJwt.raw, 28)}`;

  const endpoint = isRegister
    ? "POST /api/v1/auth/signup"
    : "POST /api/v1/auth/login";

  const steps: TraceStep[] = [
    {
      id: "auth-1",
      index: 0,
      title: isRegister ? "Form Submit & Zod Validation" : "Credentials Submit",
      subtitle: "User Browser -> NGINX Ingress",
      plainTitle: isRegister
        ? "Sending your sign-up safely"
        : "Sending your login safely",
      plainExplanation:
        "Your browser encrypts the form over HTTPS and sends it through NGINX Ingress before reaching the backend.",
      businessImpact: "Bank-grade HTTPS encryption protects credentials in transit.",
      ruleChecks: [
        { id: "r-auth-tls", label: "HTTPS TLS 1.3 encrypted from User's Browser", category: "Security" },
        { id: "r-auth-cors", label: "Origin-locked CORS verified (app.ascendup.online)", category: "Security" },
      ],
      fromNode: "browser",
      toNode: "ingress",
      activeNode: "ingress",
      protocol: "HTTPS",
      operationBadge: "TLS 1.3",
      latencyMs: 11,
      payloadTitle: `${endpoint} (TLS Request)`,
      payloadLanguage: "http",
      payloadContent: `${endpoint} HTTP/1.1
Host: api.ascendup.online
Origin: https://app.ascendup.online
Content-Type: application/json
X-Forwarded-Proto: https

{
  ${isRegister ? `"userName": "${userName}",\n  "email": "${email}",` : `"identifier": "${email}",`}
  "password": "${"•".repeat(Math.max(8, input.password.length))}",
  "timeZone": "${input.timeZone}",
  "dayStartTime": "${input.dayStartTime}"
}`,
      whyThisTool:
        "NGINX / GCE Ingress terminates TLS using cert-manager (ascend-prod-tls-cert) and enforces strict CORS origin headers required for HttpOnly credentialed cookies.",
      terminalLine: `[INGRESS] TLS 1.3 handshake ok -> routing ${endpoint} to ascend-prod-backend:3000`,
    },
    {
      id: "auth-2",
      index: 1,
      title: "NestJS ValidationPipe & Bcrypt Pepper",
      subtitle: "AuthController -> bcrypt(password + BCRYPT_SECRET_PEPPER, 10)",
      plainTitle: isRegister
        ? "Hashing the password securely"
        : "Verifying the password hash",
      plainExplanation:
        "Ascend never stores plain passwords. The NestJS backend combines the password with a server-side secret key and hashes it with bcrypt.",
      businessImpact: "Even if a database leaked, user passwords remain unreadable.",
      ruleChecks: [
        { id: "r-auth-dto", label: "ValidationPipe whitelisted DTO fields", category: "Security" },
        { id: "r-auth-bcrypt", label: "Password hashed with bcrypt(10) + secret pepper", category: "Security" },
      ],
      fromNode: "ingress",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "HTTP/1.1",
      operationBadge: "BCRYPT 10",
      latencyMs: 68,
      payloadTitle: "NestJS AuthController + Bcrypt Pepper Hash",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          pipe: "ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })",
          controller: isRegister ? "AuthController.signup()" : "AuthController.login()",
          hashing: {
            algorithm: "bcrypt",
            costFactor: 10,
            pepperSource: "Bitnami SealedSecret -> env.BCRYPT_SECRET_PEPPER",
            computedDigest: bcryptHash,
          },
        },
        null,
        2,
      ),
      whyThisTool:
        "Combining bcrypt (cost 10) with an application-level BCRYPT_SECRET_PEPPER stored in Bitnami SealedSecrets protects credentials even if a database dump is compromised.",
      terminalLine: `[NESTJS] DTO whitelisted; bcrypt(cost=10 + pepper) ${isRegister ? "hash generated" : "digest verified"} in 68ms`,
    },
    {
      id: "auth-3",
      index: 2,
      title: isRegister
        ? "PostgreSQL Atomic $transaction (User + Account)"
        : "PostgreSQL Credential Lookup",
      subtitle: "PrismaService -> @day-mark/db",
      plainTitle: isRegister
        ? "Saving the new user in PostgreSQL"
        : "Checking the account in PostgreSQL",
      plainExplanation: isRegister
        ? `Creates the @${targetUser.userName} profile and login credentials together in one PostgreSQL transaction so partial accounts can never be created.`
        : `Looks up @${targetUser.userName} in PostgreSQL and confirms the login credentials match.`,
      businessImpact: "Strict database rules prevent duplicate emails or corrupted sign-ups.",
      ruleChecks: [
        {
          id: "r-auth-pg",
          label: isRegister
            ? "User & Account created atomically in PostgreSQL"
            : "User credentials verified in PostgreSQL",
          category: "Database",
        },
        { id: "r-auth-uniq", label: "Unique email & username constraints satisfied", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "SQL",
      operationBadge: isRegister ? "INSERT TX" : "SELECT JOIN",
      latencyMs: 16,
      payloadTitle: isRegister
        ? "PostgreSQL Prisma $transaction SQL"
        : "PostgreSQL User + Account Lookup SQL",
      payloadLanguage: "sql",
      payloadContent: isRegister
        ? `BEGIN;

INSERT INTO "User" ("id", "userName", "email", "timeZone", "dayStartTime", "rank", "level", "xp")
VALUES ('${targetUser.id}', '${targetUser.userName}', '${targetUser.email}', '${targetUser.timeZone}', '${targetUser.dayStartTime}', 'Beginner', 10, 310)
RETURNING *;

INSERT INTO "Account" ("id", "userId", "type", "provider", "providerAccountId", "password")
VALUES ('acc_${deterministicHex(targetUser.id, 8)}', '${targetUser.id}', 'credentials', 'CREDENTIALS', '${targetUser.id}', '${bcryptHash.slice(0, 29)}...');

COMMIT;`
        : `SELECT u.*, a."provider", a."password"
FROM "User" u
INNER JOIN "Account" a ON a."userId" = u."id"
WHERE (u."email" = '${email}' OR u."userName" = '${userName}')
  AND a."provider" = 'CREDENTIALS'
LIMIT 1;`,
      whyThisTool:
        "PostgreSQL enforces UNIQUE constraints on User.email and User.userName and wraps User + Account creation inside an ACID Prisma $transaction so orphaned identity records can never occur.",
      terminalLine: `[POSTGRES] ${isRegister ? `COMMIT User(${targetUser.userName}) + Account(CREDENTIALS)` : `Verified User(${targetUser.userName})`} [16ms]`,
      mutatedStore: "postgres",
      applyState: (prev) => {
        if (!isRegister) {
          return {
            ...prev,
            postgres: {
              ...prev.postgres,
              users: prev.postgres.users.map((u) =>
                u.id === targetUser.id ? targetUser : u,
              ),
            },
          };
        }
        return {
          ...prev,
          postgres: {
            ...prev.postgres,
            users: [targetUser, ...prev.postgres.users.filter((u) => u.id !== targetUser.id)],
            accounts: [
              {
                id: `acc_${deterministicHex(targetUser.id, 8)}`,
                userId: targetUser.id,
                type: "credentials",
                provider: "CREDENTIALS",
                passwordHash: bcryptHash,
              },
              ...prev.postgres.accounts,
            ],
            // Re-bind seeded goals/habits/tasks if user registered so workflows work smoothly for the new user
            goals: prev.postgres.goals.map((g) => ({ ...g, userId: targetUser.id })),
            habits: prev.postgres.habits.map((h) => ({ ...h, userId: targetUser.id })),
            habitMonthlyLogs: prev.postgres.habitMonthlyLogs.map((l) => ({
              ...l,
              userId: targetUser.id,
            })),
            tasks: prev.postgres.tasks.map((t) => ({ ...t, userId: targetUser.id })),
          },
        };
      },
    },
    {
      id: "auth-4",
      index: 3,
      title: "Upstash Redis Session & User Profile Cache",
      subtitle: `SETEX refresh:${targetUser.id.slice(0, 8)} (7d) · HSET user:profile (24h)`,
      plainTitle: "Caching user info & session in Upstash Redis",
      plainExplanation:
        "Stores the 7-day refresh token and core user profile (email, username, timezone, dayStartTime) in managed Upstash Redis so future reads take ~3ms without hitting PostgreSQL.",
      businessImpact: "Cuts database reads by >80% and enables instant session revocation.",
      ruleChecks: [
        { id: "r-auth-jwts", label: "Both JWTs created (access_token 15m + refresh_token 7d)", category: "Token" },
        { id: "r-auth-redis", label: "Refresh token stored in Upstash Redis (refresh:{id} · 7d TTL)", category: "Token" },
        { id: "r-auth-prof", label: "User profile cached in Upstash Redis (user:{id}:profile · 24h Hash)", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "upstash",
      activeNode: "upstash",
      protocol: "REDIS",
      operationBadge: "UPSTASH CACHE",
      latencyMs: 3,
      payloadTitle: "Upstash Redis — AuthCacheRepo + UserCacheRepo (TLS)",
      payloadLanguage: "redis",
      payloadContent: `# 1. AuthCacheRepository.setRefreshToken() — 7-day rotation
> SET "refresh:${targetUser.id}" "${refreshToken}" EX 604800
OK

# 2. UserCacheRepository.setCoreProfile() — 24h Hash cache
> HSET "user:${targetUser.id}:profile" id "${targetUser.id}" email "${targetUser.email}" userName "${targetUser.userName}" avatarUrl "" timeZone "${targetUser.timeZone}" dayStartTime "${targetUser.dayStartTime}" isOnboarded "true" hasPassword "true"
(integer) 8
> EXPIRE "user:${targetUser.id}:profile" 86400
(integer) 1`,
      whyThisTool:
        "Upstash Redis (TLS) serves both AuthCacheRepository (O(1) refresh-token revocation) and UserCacheRepository (24h Redis Hash of core profile fields so every API call skips PostgreSQL).",
      terminalLine: `[UPSTASH] SET refresh:${targetUser.id.slice(0, 10)} (7d) + HSET user:${targetUser.id.slice(0, 10)}:profile (24h) [3ms]`,
      mutatedStore: "redis",
      applyState: (prev) => ({
        ...prev,
        redis: {
          ...prev.redis,
          upstashKeys: {
            ...prev.redis.upstashKeys,
            [`refresh:${targetUser.id}`]: {
              value: refreshToken,
              ttl: "604800s (7d)",
            },
            [`user:${targetUser.id}:profile`]: {
              value: {
                id: targetUser.id,
                email: targetUser.email,
                userName: targetUser.userName,
                avatarUrl: "",
                timeZone: targetUser.timeZone,
                dayStartTime: targetUser.dayStartTime,
                isOnboarded: "true",
                hasPassword: "true",
              },
              ttl: "86400s (24h)",
            },
          },
        },
      }),
    },
    {
      id: "auth-5",
      index: 4,
      title: "RS256 JWT Issued via HttpOnly Cookies",
      subtitle: "access_token (15m) + refresh_token (7d) returned to Next.js",
      plainTitle: "Issuing a signed JWT login cookie",
      plainExplanation:
        "Returns a signed JWT inside an HttpOnly browser cookie that client-side scripts cannot access.",
      businessImpact: "Keeps users logged in seamlessly while blocking XSS token theft.",
      ruleChecks: [
        { id: "r-auth-httponly", label: "Sent to client browser in HttpOnly cookies (XSS-safe)", category: "Cookie" },
        { id: "r-auth-samesite", label: "Secure + SameSite=Lax flags applied (CSRF-protected)", category: "Cookie" },
        { id: "r-auth-proxy", label: "Browser session ready for Next.js proxy.ts route guard", category: "Cookie" },
      ],
      fromNode: "nestjs",
      toNode: "browser",
      activeNode: "browser",
      protocol: "HTTPS",
      operationBadge: "RS256 JWT",
      latencyMs: 6,
      payloadTitle: "Decoded RS256 JWT & HttpOnly Set-Cookie Headers",
      payloadLanguage: "jwt",
      payloadContent: `HTTP/1.1 ${isRegister ? "201 Created" : "200 OK"}
Set-Cookie: access_token=${issuedJwt.raw.slice(0, 38)}...; Max-Age=900; Path=/; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refresh_token=${refreshToken}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
      jwtBreakdown: issuedJwt,
      whyThisTool:
        "HttpOnly, SameSite=Lax cookies prevent XSS scripts from stealing JWTs (unlike browser localStorage), while short 15m access tokens limit blast radius and pair cleanly with Next.js proxy.ts route guards.",
      terminalLine: `[CLIENT] Authenticated as @${targetUser.userName} · RS256 JWT verified · Socket room user:${targetUser.id.slice(0, 10)} joined`,
      mutatedStore: "session",
      applyState: (prev) => ({
        ...prev,
        session: {
          authenticated: true,
          activeUserId: targetUser.id,
          jwt: issuedJwt,
          socketConnected: true,
          socketRoom: `user:${targetUser.id}`,
        },
      }),
    },
  ];

  return {
    id: `trace_auth_${Date.now()}`,
    journey: "auth",
    graphMode: "runtime",
    title: isRegister
      ? "User Registration & Session Issuance"
      : "User Authentication & JWT Rotation",
    endpoint,
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// JOURNEY 2: CREATE A DAILY HABIT (POST /api/v1/habits/create)
// ============================================================================

export function buildCreateHabitTrace(
  state: VirtualClusterState,
  input: {
    title: string;
    taskTitle: string;
    tag: string;
    priority: PriorityLevel;
    dueTime: string;
    daysOfWeek: string[];
  },
): ExecutionTrace {
  const { dateStr, yearMonth, dayIndex, iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const habitId = `hab_${deterministicHex(input.title + iso, 10)}`;
  const taskId = `tsk_${deterministicHex(input.taskTitle + iso, 10)}`;
  const logId = `hml_${deterministicHex(habitId + yearMonth, 8)}`;

  const newHabit: VirtualHabit = {
    id: habitId,
    userId,
    title: input.title.trim(),
    description: `Scheduled ${input.daysOfWeek.length}d/wk via BullMQ timezone worker.`,
    tag: input.tag,
    daysOfWeek: input.daysOfWeek,
    isActive: true,
    taskTitle: input.taskTitle.trim(),
    taskDueTime: input.dueTime,
    taskPriority: input.priority,
    currentStreak: 0,
    longestStreak: 0,
    stabilityScore: 0,
  };

  const newTask: VirtualTask = {
    id: taskId,
    userId,
    habitId,
    goalId: null,
    type: "HabitTask",
    title: input.taskTitle.trim(),
    status: "PENDING",
    priority: input.priority,
    scheduledDate: dateStr,
    dueTime: `${dateStr}T${input.dueTime}:00.000Z`,
  };

  const blankHistory = "S".repeat(31);
  const newMonthlyLog: VirtualHabitMonthlyLog = {
    id: logId,
    userId,
    habitId,
    yearMonth,
    history: blankHistory,
  };

  const steps: TraceStep[] = [
    {
      id: "habit-1",
      index: 0,
      title: "Authenticated Habit Creation Request",
      subtitle: "Next.js Client sends HttpOnly JWT -> Ingress",
      plainTitle: "Sending the new habit request",
      plainExplanation: `Your browser sends "${newHabit.title}" along with your login cookie over HTTPS through NGINX Ingress.`,
      businessImpact: "Validates inputs before the request even leaves your screen.",
      ruleChecks: [
        { id: "r-hab-cookie", label: "Browser attached HttpOnly access_token cookie over TLS", category: "Cookie" },
      ],
      fromNode: "browser",
      toNode: "ingress",
      activeNode: "ingress",
      protocol: "HTTPS",
      operationBadge: "POST /habits",
      latencyMs: 9,
      payloadTitle: "POST /api/v1/habits/create",
      payloadLanguage: "http",
      payloadContent: `POST /api/v1/habits/create HTTP/1.1
Host: api.ascendup.online
Cookie: access_token=${state.session.jwt?.raw.slice(0, 32) ?? "eyJhbGciOiJSUzI1NiJ9..."}...
Content-Type: application/json

${JSON.stringify(
  {
    title: newHabit.title,
    taskTitle: newHabit.taskTitle,
    selectedTag: newHabit.tag,
    priority: newHabit.taskPriority,
    dueTime: newHabit.taskDueTime,
    selectedDays: newHabit.daysOfWeek,
  },
  null,
  2,
)}`,
      whyThisTool:
        "Next.js validates the form with Zod before sending credentials via HttpOnly cookies through Ingress to the NestJS ClusterIP service.",
      terminalLine: `[INGRESS] POST /api/v1/habits/create -> verifying TLS & forwarding Cookie header`,
    },
    {
      id: "habit-2",
      index: 1,
      title: "NestJS AuthGuard JWT Verification",
      subtitle: "AuthGuard extracts userId -> HabitsController",
      plainTitle: "Verifying the user's JWT token",
      plainExplanation:
        "NestJS verifies the signature on your login cookie to ensure only the account owner can create habits.",
      businessImpact: "Every action is locked strictly to the signed-in owner.",
      ruleChecks: [
        { id: "r-hab-jwt", label: "NestJS AuthGuard verified JWT signature & userId", category: "Security" },
      ],
      fromNode: "ingress",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "HTTP/1.1",
      operationBadge: "JWT GUARD",
      latencyMs: 3,
      payloadTitle: "AuthGuard Verification & HabitsModule Context",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          guard: "AuthGaurd.canActivate()",
          jwtVerified: true,
          attachedContext: { userId },
          handler: "HabitsController.createHabit() -> HabitsService.createHabit()",
          todayWeekdayCheck: `shouldCreateTaskToday = true (${dateStr})`,
        },
        null,
        2,
      ),
      whyThisTool:
        "Route-level AuthGuard verifies the signed JWT signature and attaches req.user.userId so downstream Prisma queries are always strictly tenant-scoped.",
      terminalLine: `[NESTJS] AuthGuard verified token -> userId=${userId.slice(0, 12)} authorized for HabitsModule`,
    },
    {
      id: "habit-3",
      index: 2,
      title: "PostgreSQL Relational Write (1:N Foreign Key)",
      subtitle: "INSERT Habit + nested HabitTask (@@unique([habitId, scheduledDate]))",
      plainTitle: "Saving the habit & today's task in PostgreSQL",
      plainExplanation: `Saves "${newHabit.title}" in PostgreSQL and creates today's linked task — with a unique constraint preventing duplicates.`,
      businessImpact: "Deleting a habit later cleanly removes all linked tasks automatically.",
      ruleChecks: [
        { id: "r-hab-fk", label: "Habit (1:N FK) & today's HabitTask saved in PostgreSQL", category: "Database" },
        { id: "r-hab-uniq", label: "Composite @@unique([habitId, scheduledDate]) enforced", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "SQL",
      operationBadge: "FK 1:N WRITE",
      latencyMs: 14,
      payloadTitle: "PostgreSQL Relational Insert + Composite Unique Guard",
      payloadLanguage: "sql",
      payloadContent: `BEGIN;

INSERT INTO "Habit" ("id", "userId", "title", "tag", "daysOfWeek", "taskTitle", "taskDueTime", "taskPriority")
VALUES ('${habitId}', '${userId}', '${newHabit.title.replace(/'/g, "''")}', '${newHabit.tag}', ARRAY[${newHabit.daysOfWeek.map((d) => `'${d}'`).join(", ")}], '${newHabit.taskTitle.replace(/'/g, "''")}', '${newHabit.taskDueTime}', '${newHabit.taskPriority}');

-- Materializes today's HabitTask immediately (enforces @@unique([habitId, scheduledDate]))
INSERT INTO "Task" ("id", "userId", "habitId", "type", "title", "status", "priority", "scheduledDate", "dueTime")
VALUES ('${taskId}', '${userId}', '${habitId}', 'HabitTask', '${newTask.title.replace(/'/g, "''")}', 'PENDING', '${newTask.priority}', '${dateStr}', '${newTask.dueTime}');

COMMIT;`,
      whyThisTool:
        "PostgreSQL enforces relational integrity between User -> Habit (1:N) -> Task (1:N) with ON DELETE CASCADE and guarantees at-most-once daily task creation via @@unique([habitId, scheduledDate]).",
      terminalLine: `[POSTGRES] INSERT Habit(${habitId}) + HabitTask(${taskId}) committed with FK & unique guard [14ms]`,
      mutatedStore: "postgres",
      applyState: (prev) => ({
        ...prev,
        postgres: {
          ...prev.postgres,
          habits: [newHabit, ...prev.postgres.habits],
          tasks: [newTask, ...prev.postgres.tasks],
          habitMonthlyLogs: [newMonthlyLog, ...prev.postgres.habitMonthlyLogs],
        },
      }),
    },
    {
      id: "habit-4",
      index: 3,
      title: "Redis Cache Hydration, Invalidation & BullMQ Window",
      subtitle: `HSET habit:meta · DEL user:${userId.slice(0, 8)}:tasks · habits-queue`,
      plainTitle: "Refreshing cache & scheduling future days",
      plainExplanation:
        "Clears your old cached task list so the new habit appears right away, and schedules our background worker to auto-create this habit every morning in your timezone.",
      businessImpact: "Habits run on autopilot across global timezones without manual setup.",
      ruleChecks: [
        { id: "r-hab-meta", label: "Habit streak & daily status seeded via Upstash Redis pipeline (48h TTL)", category: "Database" },
        { id: "r-hab-del", label: "Stale Upstash dashboard cache evicted (DEL tasks:cache:{userId})", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "upstash",
      activeNode: "upstash",
      protocol: "REDIS",
      operationBadge: "UPSTASH PIPELINE",
      latencyMs: 4,
      payloadTitle: "Upstash Redis — HabitsCacheRepo Pipeline + TasksCacheRepo",
      payloadLanguage: "redis",
      payloadContent: `# 1. HabitsCacheRepository.initializeHabitCache() -> Upstash Redis pipeline
> HSET "user:${userId}:habit:${habitId}:meta" currentStreak "0" longestStreak "0" stabilityScore "0"
> SET "user:${userId}:habit:${habitId}:status:${dateStr}" "PENDING" EX 172800

# 2. TasksCacheRepository -> Cache routing metadata (48h) & evict dashboard list
> SET "task:metadata:${taskId}" '{"type":"HabitTask","parentId":"${habitId}"}' EX 172800
> DEL "tasks:cache:${userId}"
(integer) 1`,
      whyThisTool:
        "HabitsCacheRepository pipelines streak hashes + 48h daily status keys into Upstash Redis while TasksCacheRepository caches HabitTask routing metadata and evicts stale dashboard reads.",
      terminalLine: `[UPSTASH] Pipeline HSET user:habit:meta + SET status:${dateStr} PENDING + DEL tasks:cache [4ms]`,
      mutatedStore: "redis",
      applyState: (prev) => {
        const nextKeys = { ...prev.redis.upstashKeys };
        delete nextKeys[`tasks:cache:${userId}`];
        nextKeys[`user:${userId}:habit:${habitId}:meta`] = {
          value: { currentStreak: "0", longestStreak: "0", stabilityScore: "0" },
          ttl: "172800s (48h)",
        };
        nextKeys[`user:${userId}:habit:${habitId}:status:${dateStr}`] = {
          value: "PENDING",
          ttl: "172800s (48h)",
        };
        nextKeys[`task:metadata:${taskId}`] = {
          value: { type: "HabitTask", parentId: habitId },
          ttl: "172800s (48h)",
        };
        return {
          ...prev,
          redis: {
            ...prev.redis,
            upstashKeys: nextKeys,
            bullmqJobs: [
              {
                jobId: `init_window:habit_${habitId.slice(-6)}:${dateStr}`,
                queue: "habits-queue",
                name: "INITIALIZE_TIMEZONE_TASKS",
                status: "completed",
                data: { habitId, dueTime: newHabit.taskDueTime, dayIndex },
                timestamp: iso,
              },
              ...prev.redis.bullmqJobs.slice(0, 5),
            ],
          },
        };
      },
    },
  ];

  return {
    id: `trace_habit_${Date.now()}`,
    journey: "habit",
    graphMode: "runtime",
    title: `Create Daily Habit: "${newHabit.title}"`,
    endpoint: "POST /api/v1/habits/create",
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// JOURNEY 3: COMPLETE HABIT, BITMASK OVERLAY, XP WRITE-BEHIND & SOCKET.IO PUSH
// ============================================================================

export function buildCompleteHabitTrace(
  state: VirtualClusterState,
  taskId: string,
): ExecutionTrace {
  const { dateStr, yearMonth, dayIndex, iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const user =
    state.postgres.users.find((u) => u.id === userId) ?? state.postgres.users[0];
  const task =
    state.postgres.tasks.find((t) => t.id === taskId) ?? state.postgres.tasks[0];
  const habit = state.postgres.habits.find((h) => h.id === task.habitId);
  const goal = state.postgres.goals.find((g) => g.id === task.goalId);
  const isHabitTask = task.type === "HabitTask" && Boolean(task.habitId);
  const isGoalTask = task.type === "GoalTask" && Boolean(task.goalId);

  const baseXp = TASK_XP[task.priority] ?? TASK_XP.MEDIUM;
  const multiplier = getXpMultiplier(user.level);
  const xpGained = getTaskXp(user.level, baseXp);
  const progression = calculateXpProgression(user.level, user.xp, xpGained);
  const didRankUp = progression.newRank !== user.rank;
  const didLevelUp = progression.newLevel > user.level;

  const newStreak = (habit?.currentStreak ?? 0) + 1;
  const newLongest = Math.max(habit?.longestStreak ?? 0, newStreak);
  const newStability = calculateNewStabilityScore(habit?.stabilityScore ?? 50, true);

  const existingLog = state.postgres.habitMonthlyLogs.find(
    (l) => l.habitId === task.habitId,
  );
  const targetYearMonth = existingLog?.yearMonth ?? yearMonth;
  const prevHistory = existingLog?.history ?? "S".repeat(31);
  const nextHistoryChars = prevHistory.split("");
  nextHistoryChars[dayIndex] = "D";
  const nextHistory = nextHistoryChars.join("");

  const notifId = deterministicHex(`notif_${task.id}_${iso}`, 24);
  const newNotification: VirtualMongoNotification = {
    _id: notifId,
    userId,
    type: didRankUp ? "RANK_UP" : "XP_GAIN",
    title: didRankUp
      ? `Rank Up: ${progression.newRank}!`
      : didLevelUp
        ? `Level ${progression.newLevel} Reached!`
        : `+${xpGained} XP Earned`,
    body: didRankUp
      ? `You ascended from ${user.rank} to ${progression.newRank} (Lv.${progression.newLevel}) after completing "${task.title}".`
      : `Streak extended to ${newStreak}d (Stability ${newStability}%) for "${habit?.title ?? task.title}".`,
    data: {
      xpGained,
      multiplier,
      newLevel: progression.newLevel,
      newXp: progression.newXp,
      newRank: progression.newRank,
      rankUp: didRankUp,
    },
    ttlExpiresIn: "2592000s (30d TTL)",
    createdAt: iso,
  };

  const steps: TraceStep[] = [
    {
      id: "comp-1",
      index: 0,
      title: `Complete ${task.type} Request`,
      subtitle: `PATCH /api/v1/tasks/${task.id}/complete`,
      plainTitle: isHabitTask
        ? "Marking the habit as complete"
        : isGoalTask
          ? "Marking the goal sprint task complete"
          : "Marking the task as complete",
      plainExplanation: isHabitTask
        ? `Your click reaches the NestJS backend, which identifies "${task.title}" as a recurring habit task and starts the streak + XP flow.`
        : isGoalTask
          ? `Your click reaches the NestJS backend, which links "${task.title}" to objective "${goal?.title ?? "Goal"}" to update progress and velocity.`
          : `Your click reaches the NestJS backend, which starts the completion and XP reward pipeline for "${task.title}".`,
      businessImpact: "Fast Redis routing metadata avoids extra database joins on every click.",
      ruleChecks: [
        { id: "r-cmp-auth", label: "Authenticated PATCH sent from Browser with HttpOnly JWT", category: "Security" },
      ],
      fromNode: "browser",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "HTTPS",
      operationBadge: "PATCH DONE",
      latencyMs: 8,
      payloadTitle: `PATCH /api/v1/tasks/${task.id}/complete`,
      payloadLanguage: "http",
      payloadContent: `PATCH /api/v1/tasks/${task.id}/complete HTTP/1.1
Host: api.ascendup.online
Cookie: access_token=${state.session.jwt?.raw.slice(0, 28) ?? "eyJ..."}...

// NestJS TasksController -> TasksService.completeTask()
// Routing metadata cache hit: { type: "${task.type}", parentId: "${task.habitId ?? task.goalId ?? "none"}" }`,
      whyThisTool:
        "TasksService checks task:meta:{taskId} in Redis to identify parent HabitTask or GoalTask routing without an extra relational join on the hot path.",
      terminalLine: `[NESTJS] PATCH /tasks/${task.id.slice(0, 12)}/complete -> routing to ${task.type} pipeline`,
    },
    {
      id: "comp-2",
      index: 1,
      title: isHabitTask
        ? "PostgreSQL State Update & 31-Char Bitmask Overlay"
        : isGoalTask
          ? "PostgreSQL Task DONE & Goal Progress Update"
          : "PostgreSQL Atomic Task Completion",
      subtitle: isHabitTask
        ? `overlay("HabitMonthlyLogs".history placing 'D' from ${dayIndex + 1} for 1)`
        : isGoalTask
          ? `UPDATE "Goal" completedDays + currentProgress`
          : `UPDATE "Task" SET status = 'DONE'`,
      plainTitle: isHabitTask
        ? "Updating your streak & 31-day calendar strip"
        : isGoalTask
          ? "Updating your objective progress in PostgreSQL"
          : "Marking the task done in PostgreSQL",
      plainExplanation: isHabitTask
        ? `Marks today's task done, boosts your streak to ${newStreak} days, and flips day ${dayIndex + 1} to green inside a compact 31-character calendar strip.`
        : isGoalTask
          ? `Marks "${task.title}" done and updates objective "${goal?.title ?? "Goal"}" to ${(goal?.completedDays ?? 0) + 1}/${goal?.targetDays ?? 20} completed days.`
          : `Updates "${task.title}" from PENDING to DONE atomically in PostgreSQL so it can never award XP twice.`,
      businessImpact: isHabitTask
        ? "Renders a whole monthly heatmap in 1 single lookup instead of 31."
        : "Atomic status check (WHERE status = 'PENDING') prevents accidental double XP.",
      ruleChecks: [
        { id: "r-cmp-pg", label: "Task updated PENDING -> DONE (double-XP prevented)", category: "Database" },
        ...(isHabitTask
          ? [{ id: "r-cmp-bitmask", label: `31-char HabitMonthlyLogs bitmask flipped at day ${dayIndex + 1}`, category: "Database" as const }]
          : isGoalTask
            ? [{ id: "r-cmp-goal", label: `Goal progress updated in PostgreSQL (${(goal?.completedDays ?? 0) + 1}/${goal?.targetDays ?? 20}d)`, category: "Database" as const }]
            : []),
      ],
      fromNode: "nestjs",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "SQL",
      operationBadge: isHabitTask ? "SQL OVERLAY" : isGoalTask ? "GOAL SYNC" : "TASK DONE",
      latencyMs: 13,
      payloadTitle: isHabitTask
        ? "PostgreSQL Task DONE + O(1) Monthly Heatmap Bitmask SQL"
        : isGoalTask
          ? "PostgreSQL GoalTask DONE + Goal Progress SQL"
          : "PostgreSQL Task DONE SQL",
      payloadLanguage: "sql",
      payloadContent: isHabitTask
        ? `-- 1. Atomic Task completion guard (status = 'PENDING' prevents double-XP)
UPDATE "Task"
SET "status" = 'DONE'
WHERE "id" = '${task.id}' AND "userId" = '${userId}' AND "status" = 'PENDING';

-- 2. O(1) 31-character monthly heatmap string overlay (zero row explosion!)
INSERT INTO "HabitMonthlyLogs" ("id", "userId", "habitId", "yearMonth", "history")
VALUES ('hml_${deterministicHex(task.id, 8)}', '${userId}', '${task.habitId}', '${yearMonth}', '${nextHistory}')
ON CONFLICT ("habitId", "yearMonth")
DO UPDATE SET history = overlay("HabitMonthlyLogs".history placing 'D' from ${dayIndex + 1} for 1);

-- 3. Update Habit streak & EMA stability score (K = 0.25)
UPDATE "Habit"
SET "currentStreak" = ${newStreak}, "longestStreak" = ${newLongest}, "stabilityScore" = ${newStability}
WHERE "id" = '${task.habitId}';`
        : isGoalTask
          ? `-- 1. Atomic GoalTask completion
UPDATE "Task"
SET "status" = 'DONE'
WHERE "id" = '${task.id}' AND "userId" = '${userId}' AND "status" = 'PENDING';

-- 2. Update parent Goal progress & velocity
UPDATE "Goal"
SET "completedDays" = "completedDays" + 1,
    "currentProgress" = LEAST(100, ROUND((("completedDays" + 1)::numeric / "targetDays") * 100))
WHERE "id" = '${task.goalId}';`
          : `-- Atomic Standard Task completion guard (prevents double-XP)
UPDATE "Task"
SET "status" = 'DONE'
WHERE "id" = '${task.id}' AND "userId" = '${userId}' AND "status" = 'PENDING';`,
      whyThisTool: isHabitTask
        ? "Instead of storing 31 rows per habit per month, Ascend stores a fixed 31-char string ('SSS...D...') and mutates a single byte atomically with PostgreSQL overlay() — rendering a full monthly heatmap in one O(1) row read."
        : "PostgreSQL guarantees strongly consistent state transitions with WHERE status = 'PENDING' so duplicate clicks never double-count progress or XP.",
      terminalLine: isHabitTask
        ? `[POSTGRES] Task=DONE · HabitMonthlyLogs[${yearMonth}] day ${dayIndex + 1} flipped 'S'->'D' · streak=${newStreak}d`
        : `[POSTGRES] Task(${task.type})=DONE committed atomically [13ms]`,
      mutatedStore: "postgres",
      applyState: (prev) => ({
        ...prev,
        postgres: {
          ...prev.postgres,
          tasks: prev.postgres.tasks.map((t) =>
            t.id === task.id ? { ...t, status: "DONE" } : t,
          ),
          goals: prev.postgres.goals.map((g) => {
            if (g.id !== task.goalId) return g;
            const nextDone = g.completedDays + 1;
            const nextProg = Math.min(
              100,
              Math.round((nextDone / Math.max(1, g.targetDays)) * 100),
            );
            return {
              ...g,
              completedDays: nextDone,
              currentProgress: nextProg,
              status: nextDone >= g.targetDays ? "COMPLETED" : "ACTIVE",
            };
          }),
          habits: isHabitTask
            ? prev.postgres.habits.map((h) =>
                h.id === task.habitId
                  ? {
                      ...h,
                      currentStreak: newStreak,
                      longestStreak: newLongest,
                      stabilityScore: newStability,
                    }
                  : h,
              )
            : prev.postgres.habits,
          habitMonthlyLogs: isHabitTask
            ? prev.postgres.habitMonthlyLogs.some(
                (l) => l.habitId === task.habitId && l.yearMonth === targetYearMonth,
              )
              ? prev.postgres.habitMonthlyLogs.map((l) =>
                  l.habitId === task.habitId && l.yearMonth === targetYearMonth
                    ? { ...l, history: nextHistory }
                    : l,
                )
              : [
                  {
                    id: `hml_${deterministicHex(task.id, 8)}`,
                    userId,
                    habitId: task.habitId ?? "",
                    yearMonth: targetYearMonth,
                    history: nextHistory,
                  },
                  ...prev.postgres.habitMonthlyLogs,
                ]
            : prev.postgres.habitMonthlyLogs,
        },
      }),
    },
    {
      id: "comp-3",
      index: 2,
      title: "Redis Write-Behind XP + BullMQ Queue Dispatch",
      subtitle: `+${xpGained} XP (${baseXp} × ${multiplier.toFixed(2)}x) · SADD dirty_users · notification-queue`,
      plainTitle: `Updating XP (+${xpGained}) in Redis & queuing jobs`,
      plainExplanation: `Applies your ${multiplier.toFixed(2)}x level multiplier immediately in Upstash Redis (user:gamification + users:dirty) and refreshes cached streak metadata.`,
      businessImpact: "Users see instant gratification (<25ms) without hammering PostgreSQL on rapid clicks.",
      ruleChecks: [
        { id: "r-cmp-xp", label: `XP (+${xpGained}) buffered in Upstash Redis (user:gamification + users:dirty)`, category: "Database" },
        { id: "r-cmp-bull", label: "Dashboard cache invalidated (DEL tasks:cache) & BullMQ alert enqueued", category: "Realtime" },
      ],
      fromNode: "nestjs",
      toNode: "upstash",
      activeNode: "upstash",
      protocol: "REDIS",
      operationBadge: "UPSTASH XP",
      latencyMs: 4,
      payloadTitle: "Upstash Redis — GamificationCacheRepo + HabitsCacheRepo",
      payloadLanguage: "redis",
      payloadContent: `# 1. GamificationCacheRepository -> Upstash Redis (instant write-behind)
> HSET "user:gamification:${userId}" level "${progression.newLevel}" xp "${progression.newXp}" rank "${progression.newRank}"
(integer) 3
> SADD "users:dirty" "${userId}"
(integer) 1

# 2. TasksCacheRepo + HabitsCacheRepo -> Evict tasks & refresh streak hash
> DEL "tasks:cache:${userId}"
> HSET "user:${userId}:habit:${task.habitId}:meta" currentStreak "${newStreak}" longestStreak "${newLongest}" stabilityScore "${newStability}"
> SET "user:${userId}:habit:${task.habitId}:status:${dateStr}" "DONE" EX 172800

# 3. Queue Redis (redis-0 pod) -> Enqueue async BullMQ notification job
> XADD "bull:notification-queue:events" * name "send-notification" templateId "${didRankUp ? "RANK_UP" : "XP_GAIN"}" xpGained "${xpGained}"`,
      whyThisTool:
        "GamificationCacheRepository buffers rapid XP gains in Upstash Redis (user:gamification:{id} + SADD users:dirty) while Queue Redis runs the async BullMQ notification worker.",
      terminalLine: `[UPSTASH] HSET user:gamification Lv.${progression.newLevel} (${progression.newRank}) + SADD users:dirty [4ms]`,
      mutatedStore: "redis",
      applyState: (prev) => {
        const nextKeys = { ...prev.redis.upstashKeys };
        delete nextKeys[`tasks:cache:${userId}`];
        nextKeys[`user:gamification:${userId}`] = {
          value: {
            level: String(progression.newLevel),
            xp: String(progression.newXp),
            rank: progression.newRank,
          },
          ttl: "PERSIST (Write-Behind)",
        };
        if (task.habitId) {
          nextKeys[`user:${userId}:habit:${task.habitId}:meta`] = {
            value: {
              currentStreak: String(newStreak),
              longestStreak: String(newLongest),
              stabilityScore: String(newStability),
            },
            ttl: "172800s (48h)",
          };
          nextKeys[`user:${userId}:habit:${task.habitId}:status:${dateStr}`] = {
            value: "DONE",
            ttl: "172800s (48h)",
          };
        }
        return {
          ...prev,
          redis: {
            ...prev.redis,
            upstashKeys: nextKeys,
            dirtyUsers: Array.from(new Set([...prev.redis.dirtyUsers, userId])),
            redlockStatus: "ACQUIRING (locks:user-db-sync · 8000ms)",
            bullmqJobs: [
              {
                jobId: `notif_${notifId.slice(0, 8)}`,
                queue: "notification-queue",
                name: didRankUp ? "RANK_UP_DISPATCH" : "XP_MILESTONE_DISPATCH",
                status: "completed",
                data: { userId, xpGained, newRank: progression.newRank },
                timestamp: iso,
              },
              ...prev.redis.bullmqJobs.slice(0, 5),
            ],
          },
        };
      },
    },
    {
      id: "comp-4",
      index: 3,
      title: "AWS DynamoDB Dual-Ledger Audit Snapshot",
      subtitle: "Day-Mark-Logs: PutItem TASKLOG# (GSI2) + LOG#HABIT#",
      plainTitle: "Saving permanent completion logs to AWS DynamoDB",
      plainExplanation:
        "Writes a permanent timestamped record of this completion to AWS DynamoDB in the background without slowing down the user.",
      businessImpact: "Keeps years of analytics blazing fast without bloating the main database.",
      ruleChecks: [
        {
          id: "r-cmp-ddb",
          label: isGoalTask
            ? "Immutable TASKLOG appended to AWS DynamoDB (indexed on GSI1 Goal)"
            : isHabitTask
              ? "Immutable TASKLOG & HABITLOG appended to AWS DynamoDB (GSI2)"
              : "Immutable TASKLOG snapshot appended to AWS DynamoDB",
          category: "Database",
        },
      ],
      fromNode: "nestjs",
      toNode: "dynamodb",
      activeNode: "dynamodb",
      protocol: "HTTPS",
      operationBadge: "PUT ITEM",
      latencyMs: 11,
      payloadTitle: "AWS DynamoDB PutItem ('Day-Mark-Logs')",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          TableName: "Day-Mark-Logs",
          Items: [
            {
              PK: `USER#${userId}`,
              SK: `TASKLOG#${dateStr}#${task.id}`,
              taskTitle: task.title,
              type: task.type,
              priority: task.priority,
              completionStatus: "ON_TIME",
              ...(isGoalTask && task.goalId
                ? {
                    GSI1_PK: `GOAL#${task.goalId}`,
                    GSI1_SK: `COMPLETED#${dateStr}#${task.id}`,
                  }
                : {}),
              ...(isHabitTask && task.habitId
                ? {
                    GSI2_PK: `HABIT#${task.habitId}`,
                    GSI2_SK: `COMPLETED#${dateStr}#${task.id}`,
                  }
                : {}),
            },
            ...(isHabitTask && task.habitId
              ? [
                  {
                    PK: `USER#${userId}`,
                    SK: `LOG#HABIT#${task.habitId}#${iso}`,
                    status: "COMPLETED",
                    streakAtExecution: newStreak,
                    stabilityScore: newStability,
                  },
                ]
              : []),
          ],
        },
        null,
        2,
      ),
      whyThisTool:
        "Immutable completion snapshots and habit execution trails are written asynchronously off the critical path into DynamoDB's single-table ledger so years of history never degrade PostgreSQL dashboard queries.",
      terminalLine: `[DYNAMODB] PutItem Day-Mark-Logs -> TASKLOG#${dateStr} (${isGoalTask ? "GSI1" : isHabitTask ? "GSI2" : "PK"}) [11ms]`,
      mutatedStore: "dynamodb",
      applyState: (prev) => ({
        ...prev,
        dynamodb: {
          ...prev.dynamodb,
          items: [
            {
              PK: `USER#${userId}`,
              SK: `TASKLOG#${dateStr}#${task.id}`,
              entityType: "TASKLOG",
              id: `dlog_${deterministicHex(task.id + iso, 6)}`,
              timestamp: iso,
              GSI1_PK: isGoalTask && task.goalId ? `GOAL#${task.goalId}` : undefined,
              GSI2_PK: isHabitTask && task.habitId ? `HABIT#${task.habitId}` : undefined,
              payload: {
                taskTitle: task.title,
                priority: task.priority,
                completionStatus: "ON_TIME",
              },
            },
            ...(isHabitTask && task.habitId
              ? [
                  {
                    PK: `USER#${userId}`,
                    SK: `LOG#HABIT#${task.habitId}#${iso}`,
                    entityType: "HABITLOG" as const,
                    id: `hlog_${deterministicHex(task.id + iso, 6)}`,
                    timestamp: iso,
                    payload: {
                      status: "COMPLETED",
                      streakAtExecution: newStreak,
                      stabilityScore: newStability,
                    },
                  },
                ]
              : []),
            ...prev.dynamodb.items,
          ],
        },
      }),
    },
    {
      id: "comp-5",
      index: 4,
      title: "Redlock Distributed Write-Behind Flush -> Postgres",
      subtitle: "GamificationSyncCron acquires locks:user-db-sync -> $transaction",
      plainTitle: "Syncing batched XP & Level to PostgreSQL",
      plainExplanation: `Every 10 seconds, a distributed Redlock on Upstash Redis batches pending XP from users:dirty and writes Level ${progression.newLevel} (${progression.newRank}) permanently into PostgreSQL.`,
      businessImpact: "Prevents server collisions when multiple cloud servers run at once.",
      ruleChecks: [
        { id: "r-cmp-lock", label: "Upstash Redlock acquired across 3 API pods & users:dirty flushed to PostgreSQL", category: "Database" },
      ],
      fromNode: "upstash",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "TX",
      operationBadge: "REDLOCK TX",
      latencyMs: 14,
      payloadTitle: "Upstash Redlock Mutex + Batched Prisma $transaction Flush",
      payloadLanguage: "sql",
      payloadContent: `-- Acquired Upstash Redlock: locks:user-db-sync (TTL: 8000ms) across GKE replicas
BEGIN;

UPDATE "User"
SET "xp" = ${progression.newXp}, "level" = ${progression.newLevel}, "rank" = '${progression.newRank}'
WHERE "id" = '${userId}';

INSERT INTO "XpTransaction" ("id", "userId", "amount", "reason")
VALUES ('xpt_${deterministicHex(iso, 8)}', '${userId}', ${xpGained}, 'Synchronised session metrics. Level: ${progression.newLevel}');

COMMIT;
-- SREM users:dirty "${userId}" & Redlock released cleanly in finally{}`,
      whyThisTool:
        "With 3–8 NestJS pods running on GKE, Redlock prevents duplicate concurrent flushes while batching multiple rapid XP mutations into a single atomic PostgreSQL $transaction every 10 seconds.",
      terminalLine: `[REDLOCK->PG] Flushed dirty_users(1) -> User(Lv.${progression.newLevel}, ${progression.newRank}) + XpTransaction(+${xpGained})`,
      mutatedStore: "postgres",
      applyState: (prev) => ({
        ...prev,
        postgres: {
          ...prev.postgres,
          users: prev.postgres.users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  xp: progression.newXp,
                  level: progression.newLevel,
                  rank: progression.newRank,
                  lastActive: iso,
                }
              : u,
          ),
          xpTransactions: [
            {
              id: `xpt_${deterministicHex(iso, 8)}`,
              userId,
              amount: xpGained,
              reason: `Synchronised session metrics. Level: ${progression.newLevel}`,
              createdAt: iso,
            },
            ...prev.postgres.xpTransactions,
          ],
        },
        redis: {
          ...prev.redis,
          dirtyUsers: prev.redis.dirtyUsers.filter((id) => id !== userId),
          redlockStatus: "RELEASED (locks:user-db-sync)",
        },
      }),
    },
    {
      id: "comp-6",
      index: 5,
      title: "MongoDB Notification Inbox Persist (30d TTL)",
      subtitle: "InAppProvider writes AppNotification -> appnotifications",
      plainTitle: "Saving your celebration alert to the inbox",
      plainExplanation:
        "Drops a temporary notification card into MongoDB so even if you closed your tab, you'll still see your reward next time — and it self-cleans after 30 days.",
      businessImpact: "Keeps temporary alerts completely separate from core user data.",
      ruleChecks: [
        { id: "r-cmp-mongo", label: "Notification persisted to MongoDB with 30-day TTL index", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "mongodb",
      activeNode: "mongodb",
      protocol: "TCP",
      operationBadge: "BSON TTL",
      latencyMs: 7,
      payloadTitle: "MongoDB appnotifications.insertOne() (30-Day TTL)",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(newNotification, null, 2),
      whyThisTool:
        "Persisting burst in-app notifications in MongoDB with a 30-day TTL index guarantees offline users still see rank-ups on next login while avoiding high-churn VACUUM dead tuples in PostgreSQL.",
      terminalLine: `[MONGODB] Inserted AppNotification(${newNotification.type}) _id=${notifId.slice(0, 10)} (expires: 30d)`,
      mutatedStore: "mongodb",
      applyState: (prev) => ({
        ...prev,
        mongodb: {
          ...prev.mongodb,
          appnotifications: [newNotification, ...prev.mongodb.appnotifications],
        },
      }),
    },
    {
      id: "comp-7",
      index: 6,
      title: "Socket.IO Multi-Pod Push (RedisIOAdapter -> Client)",
      subtitle: didRankUp
        ? `emit("NEW_NOTIFICATION" / "rank.up") -> room user:${userId.slice(0, 8)}`
        : `emit("NEW_NOTIFICATION" / "xp.updated") -> room user:${userId.slice(0, 8)}`,
      plainTitle: didRankUp
        ? `Live Update: Ranked up to ${progression.newRank}`
        : "Pushing live XP & streak update via Socket.IO",
      plainExplanation: didRankUp
        ? `Socket.IO broadcasts your promotion from ${user.rank} to ${progression.newRank} directly to your browser — no page reload needed.`
        : "Socket.IO pushes your updated XP bar and streak straight to your browser in 3 milliseconds.",
      businessImpact: "Real-time feedback loops dramatically boost daily user retention.",
      ruleChecks: [
        {
          id: "r-cmp-ws",
          label: didRankUp
            ? `Socket.IO pushed live Rank Up (${progression.newRank}) to User's Browser`
            : "Socket.IO pushed live XP & streak update to User's Browser",
          category: "Realtime",
        },
      ],
      fromNode: "socketio",
      toNode: "browser",
      activeNode: "socketio",
      protocol: "WS",
      operationBadge: didRankUp ? "RANK UP!" : "WS PUSH",
      latencyMs: 3,
      payloadTitle: "Socket.IO WebSocket Frame (via Queue Redis Pub/Sub)",
      payloadLanguage: "ws",
      payloadContent: JSON.stringify(
        {
          transport: "Socket.IO v4 + RedisIOAdapter (Queue Redis Pub/Sub)",
          room: `user:${userId}`,
          events: didRankUp ? ["xp.updated", "rank.up", "NEW_NOTIFICATION"] : ["xp.updated", "NEW_NOTIFICATION"],
          payload: newNotification,
        },
        null,
        2,
      ),
      whyThisTool:
        "RedisIOAdapter fans out Socket.IO room emissions across all GKE NestJS replicas so the client receives live XP & rank badges regardless of which backend pod processed the BullMQ job.",
      terminalLine: `[SOCKET.IO] Pushed ${didRankUp ? "rank.up + " : ""}xp.updated to room user:${userId.slice(0, 10)} [3ms]`,
    },
  ];

  return {
    id: `trace_complete_${Date.now()}`,
    journey: "complete",
    graphMode: "runtime",
    title: didRankUp
      ? `Complete Habit & Rank Up -> ${progression.newRank}!`
      : `Complete Habit (+${xpGained} XP · Streak ${newStreak}d)`,
    endpoint: `PATCH /api/v1/tasks/${task.id}/complete`,
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// JOURNEY 4: DAILY REFLECTION & DUAL NOSQL LEDGER (POST /api/v1/user/self-reflection)
// ============================================================================

export function buildReflectionTrace(
  state: VirtualClusterState,
  input: {
    reflectionText: string;
    mood: string;
    energyScore: number;
    tags: string[];
    tomorrowTaskTitle?: string;
  },
): ExecutionTrace {
  const { dateStr, iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const user =
    state.postgres.users.find((u) => u.id === userId) ?? state.postgres.users[0];
  const reflectionId = `ref_${deterministicHex(input.reflectionText + iso, 12)}`;
  const mongoId = deterministicHex(`mref_${iso}`, 24);
  const tomorrowDate = new Date(Date.now() + 86400_000).toISOString().split("T")[0];

  const mongoDoc: VirtualMongoReflectionDoc = {
    _id: mongoId,
    userId,
    logicalDate: dateStr,
    mood: input.mood,
    energyScore: input.energyScore,
    tags: input.tags,
    reflectionText: input.reflectionText.trim(),
    metadata: {
      timeZone: user.timeZone,
      dayStartTime: user.dayStartTime,
      wordCount: input.reflectionText.trim().split(/\s+/).filter(Boolean).length,
    },
    createdAt: iso,
  };

  const dynamoReflection: VirtualDynamoItem = {
    PK: `USER#${userId}`,
    SK: `REFLECTION#${dateStr}`,
    entityType: "REFLECTION",
    id: reflectionId,
    timestamp: iso,
    payload: {
      submissionDate: dateStr,
      timeZone: user.timeZone,
      mood: input.mood,
      energyScore: input.energyScore,
      reflectionText: input.reflectionText.trim(),
    },
  };

  const hasTomorrowTask = Boolean(input.tomorrowTaskTitle?.trim());
  const tomorrowTaskId = `tsk_tmrw_${deterministicHex(iso, 8)}`;

  const steps: TraceStep[] = [
    {
      id: "ref-1",
      index: 0,
      title: "Submit Daily Self-Reflection & Metadata",
      subtitle: "Next.js Client -> Ingress -> SelfReflectionService",
      plainTitle: "Matching your reflection to your personal day",
      plainExplanation: `Checks your timezone (${user.timeZone}) and personal day-start (${user.dayStartTime}) so late-night reflections still count toward today's streak.`,
      businessImpact: "Real humans don't stop working at midnight — Ascend respects real schedules.",
      ruleChecks: [
        { id: "r-ref-tz", label: `Logical day (${dateStr}) computed from user timeZone & dayStartTime`, category: "Security" },
      ],
      fromNode: "browser",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "HTTPS",
      operationBadge: "POST /logs",
      latencyMs: 9,
      payloadTitle: "POST /api/v1/user/self-reflection (Logical Day Engine)",
      payloadLanguage: "http",
      payloadContent: `POST /api/v1/user/self-reflection HTTP/1.1
Host: api.ascendup.online
Cookie: access_token=${state.session.jwt?.raw.slice(0, 26) ?? "eyJ..."}...

${JSON.stringify(
  {
    dayStartTime: user.dayStartTime,
    timeZone: user.timeZone,
    computedLogicalDate: dateStr,
    mood: input.mood,
    energyScore: input.energyScore,
    tags: input.tags,
    reflectionText: input.reflectionText.trim(),
    tomorrowTasks: hasTomorrowTask
      ? [{ taskTitle: input.tomorrowTaskTitle?.trim(), priority: "HIGH", scheduledDate: tomorrowDate }]
      : [],
  },
  null,
  2,
)}`,
      whyThisTool:
        "SelfReflectionService computes the user's personal logical day via getUserLogicalDate(timeZone, dayStartTime) so finishing a late-night reflection at 1:30 AM still credits today's streak.",
      terminalLine: `[NESTJS] Logical day resolved to ${dateStr} (${user.timeZone}, dayStart=${user.dayStartTime})`,
    },
    {
      id: "ref-upstash",
      index: 1,
      title: "Upstash Redis User Profile Cache Hit",
      subtitle: `HGETALL user:${userId.slice(0, 8)}:profile (timeZone + dayStartTime)`,
      plainTitle: "Reading user timezone from Upstash Redis cache",
      plainExplanation: `Fetches your cached profile (${user.timeZone}, day start ${user.dayStartTime}) from Upstash Redis in 3ms so NestJS resolves your logical day without hitting PostgreSQL.`,
      businessImpact: "Saves a relational database query on every reflection and dashboard call.",
      ruleChecks: [
        { id: "r-ref-upstash", label: "UserCacheRepo hit in Upstash Redis (user:{id}:profile · 0 SQL queries)", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "upstash",
      activeNode: "upstash",
      protocol: "REDIS",
      operationBadge: "CACHE HIT",
      latencyMs: 3,
      payloadTitle: "Upstash Redis — UserCacheRepository.getCoreProfile()",
      payloadLanguage: "redis",
      payloadContent: `> HGETALL "user:${userId}:profile"
1) "id"           "${userId}"
2) "userName"     "${user.userName}"
3) "timeZone"     "${user.timeZone}"
4) "dayStartTime" "${user.dayStartTime}"
5) "isOnboarded"  "true"
-- Cache HIT (TTL remaining: ~23h) -> Skipped PostgreSQL User lookup`,
      whyThisTool:
        "UserCacheRepository caches core user profile fields in a 24-hour Upstash Redis Hash so timezone-sensitive features like SelfReflectionService resolve the logical day in ~3ms.",
      terminalLine: `[UPSTASH] CACHE HIT user:${userId.slice(0, 8)}:profile -> tz=${user.timeZone} [3ms]`,
    },
    {
      id: "ref-2",
      index: 2,
      title: "MongoDB Unstructured Journal & Mood Metadata",
      subtitle: "db.habit_logs.insertOne() — Flexible nested reflection schema",
      plainTitle: "Saving your mood, tags & rich journal entry",
      plainExplanation: `Stores your "${input.mood}" mood, energy score (${input.energyScore}/10), and tags in MongoDB, which handles evolving journal fields effortlessly.`,
      businessImpact: "Product teams can add new mood or journal prompts without slow database migrations.",
      ruleChecks: [
        { id: "r-ref-mongo", label: "Flexible mood, energy & tags saved in MongoDB (habit_logs)", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "mongodb",
      activeNode: "mongodb",
      protocol: "TCP",
      operationBadge: "MONGO DOC",
      latencyMs: 8,
      payloadTitle: "MongoDB Flexible Document Insert (habit_logs)",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(mongoDoc, null, 2),
      whyThisTool:
        "Reflections carry variable nested metadata (mood tags, energy ratings, free-form journal fields) that evolve rapidly without requiring rigid PostgreSQL schema migrations.",
      terminalLine: `[MONGODB] habit_logs.insertOne(_id=${mongoId.slice(0, 10)}, mood="${input.mood}", tags=${input.tags.length}) [8ms]`,
      mutatedStore: "mongodb",
      applyState: (prev) => ({
        ...prev,
        mongodb: {
          ...prev.mongodb,
          habit_logs: [mongoDoc, ...prev.mongodb.habit_logs],
        },
      }),
    },
    {
      id: "ref-3",
      index: 3,
      title: "AWS DynamoDB Single-Table Reflection & Time-Series Event",
      subtitle: `PK: USER#${userId.slice(0, 8)} · SK: REFLECTION#${dateStr}`,
      plainTitle: "Saving the reflection to AWS DynamoDB",
      plainExplanation: `Appends a date-indexed reflection entry for ${dateStr} into AWS DynamoDB so querying months of past reflections takes milliseconds.`,
      businessImpact: "Consistent single-digit millisecond speed even with millions of users.",
      ruleChecks: [
        { id: "r-ref-ddb", label: `Immutable reflection written to AWS DynamoDB (SK: REFLECTION#${dateStr})`, category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "dynamodb",
      activeNode: "dynamodb",
      protocol: "HTTPS",
      operationBadge: "DYNAMO PUT",
      latencyMs: 9,
      payloadTitle: "AWS DynamoDB Single-Table Write ('Day-Mark-Logs')",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          TableName: "Day-Mark-Logs",
          ConditionExpression: "attribute_not_exists(SK)",
          Item: {
            PK: dynamoReflection.PK,
            SK: dynamoReflection.SK,
            id: reflectionId,
            userId,
            submissionDate: dateStr,
            submittedAt: iso,
            timeZone: user.timeZone,
            mood: input.mood,
            energyScore: input.energyScore,
            reflectionText: input.reflectionText.trim(),
          },
        },
        null,
        2,
      ),
      whyThisTool:
        "Keying reflections by PK=USER#<id> and SK=REFLECTION#<YYYY-MM-DD> delivers single-digit millisecond range queries across months of history and enforces one immutable entry per logical day.",
      terminalLine: `[DYNAMODB] PutItem Day-Mark-Logs PK=USER#${userId.slice(0, 8)} SK=REFLECTION#${dateStr} [9ms]`,
      mutatedStore: "dynamodb",
      applyState: (prev) => ({
        ...prev,
        dynamodb: {
          ...prev.dynamodb,
          items: [
            dynamoReflection,
            ...prev.dynamodb.items.filter((i) => i.SK !== dynamoReflection.SK),
          ],
        },
      }),
    },
    ...(hasTomorrowTask
      ? [
          {
            id: "ref-4",
            index: 4,
            title: "PostgreSQL Spawn Tomorrow's Planned Task",
            subtitle: `INSERT INTO "Task" (scheduledDate = ${tomorrowDate})`,
            plainTitle: "Adding tomorrow's task to PostgreSQL",
            plainExplanation: `Saves "${input.tomorrowTaskTitle!.trim()}" into PostgreSQL so it shows up on your dashboard tomorrow morning.`,
            businessImpact: "Turns evening reflection directly into tomorrow's momentum.",
            ruleChecks: [
              { id: "r-ref-pg", label: `Tomorrow's task created in PostgreSQL (${tomorrowDate})`, category: "Database" as const },
            ],
            fromNode: "nestjs" as AnyNodeId,
            toNode: "postgres" as AnyNodeId,
            activeNode: "postgres" as AnyNodeId,
            protocol: "SQL",
            operationBadge: "SPAWN TASK",
            latencyMs: 11,
            payloadTitle: "PostgreSQL Tomorrow Task Creation (TasksService)",
            payloadLanguage: "sql" as const,
            payloadContent: `INSERT INTO "Task" ("id", "userId", "type", "title", "status", "priority", "scheduledDate", "dueTime")
VALUES ('${tomorrowTaskId}', '${userId}', 'Standard', '${input.tomorrowTaskTitle!.trim().replace(/'/g, "''")}', 'PENDING', 'HIGH', '${tomorrowDate}', '${tomorrowDate}T09:00:00.000Z');`,
            whyThisTool:
              "Actionable tasks planned during evening reflection go straight into PostgreSQL's relational Task table so they appear immediately on tomorrow's SWR dashboard.",
            terminalLine: `[POSTGRES] Spawned tomorrow's planned task "${input.tomorrowTaskTitle!.trim()}" for ${tomorrowDate}`,
            mutatedStore: "postgres" as const,
            applyState: (prev: VirtualClusterState) => ({
              ...prev,
              postgres: {
                ...prev.postgres,
                tasks: [
                  ...prev.postgres.tasks,
                  {
                    id: tomorrowTaskId,
                    userId,
                    habitId: null,
                    goalId: null,
                    type: "Standard" as const,
                    title: input.tomorrowTaskTitle!.trim(),
                    status: "PENDING" as const,
                    priority: "HIGH" as const,
                    scheduledDate: tomorrowDate,
                    dueTime: `${tomorrowDate}T09:00:00.000Z`,
                  },
                ],
              },
            }),
          },
        ]
      : []),
  ];

  return {
    id: `trace_reflection_${Date.now()}`,
    journey: "reflection",
    graphMode: "runtime",
    title: "Daily Self-Reflection & Dual NoSQL Ledger",
    endpoint: "POST /api/v1/user/self-reflection",
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// BONUS: WEBSOCKET ACK_NOTIFICATION SWEEP (Client -> Socket.IO -> MongoDB)
// ============================================================================

export function buildAckNotificationTrace(
  state: VirtualClusterState,
  notificationId: string,
): ExecutionTrace {
  const { iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const notif = state.mongodb.appnotifications.find((n) => n._id === notificationId);

  return {
    id: `trace_ack_${Date.now()}`,
    journey: "complete",
    graphMode: "runtime",
    title: "WebSocket ACK_NOTIFICATION Inbox Sweep",
    endpoint: "WS emit('ACK_NOTIFICATION')",
    startedAt: iso,
    steps: [
      {
        id: "ack-1",
        index: 0,
        title: "Client Emits ACK_NOTIFICATION over Socket.IO",
        subtitle: `NotificationGateway receives _id=${notificationId.slice(0, 10)}`,
        plainTitle: "Telling the server you saw this alert",
        plainExplanation:
          "Your browser sends a tiny instant signal over the live WebSocket channel confirming you dismissed the notification.",
        businessImpact: "No extra page loads or heavy API calls required.",
        ruleChecks: [
          { id: "r-ack-ws", label: "Browser sent ACK_NOTIFICATION over active Socket.IO connection", category: "Realtime" },
        ],
        fromNode: "browser",
        toNode: "socketio",
        activeNode: "socketio",
        protocol: "WS",
        operationBadge: "WS ACK",
        latencyMs: 3,
        payloadTitle: "Socket.IO Client -> Server Frame",
        payloadLanguage: "ws",
        payloadContent: JSON.stringify(
          {
            event: "ACK_NOTIFICATION",
            socketRoom: `user:${userId}`,
            payload: { notificationId, title: notif?.title },
          },
          null,
          2,
        ),
        whyThisTool:
          "Acknowledging over the existing WebSocket avoids extra REST roundtrips and lets the gateway clean up ephemeral alerts in real time.",
        terminalLine: `[SOCKET.IO] Received ACK_NOTIFICATION(_id=${notificationId.slice(0, 10)}) from user:${userId.slice(0, 8)}`,
      },
      {
        id: "ack-2",
        index: 1,
        title: "MongoDB User-Scoped Immediate Delete",
        subtitle: "notificationModel.deleteOne({ _id, userId })",
        plainTitle: "Cleaning the read alert out of MongoDB",
        plainExplanation:
          "Immediately removes the dismissed notification from your private inbox so it never pops up again on another device.",
        businessImpact: "Keeps database storage tiny and costs near zero.",
        ruleChecks: [
          { id: "r-ack-del", label: "Dismissed notification deleted from MongoDB (userId-scoped)", category: "Database" },
        ],
        fromNode: "socketio",
        toNode: "mongodb",
        activeNode: "mongodb",
        protocol: "DELETE",
        operationBadge: "MONGO DEL",
        latencyMs: 6,
        payloadTitle: "MongoDB Immediate Inbox Sweep",
        payloadLanguage: "json",
        payloadContent: JSON.stringify(
          {
            collection: "appnotifications",
            operation: "deleteOne",
            filter: {
              _id: notificationId,
              userId, // Ownership guard from NotificationGateway
            },
            result: { acknowledged: true, deletedCount: 1 },
          },
          null,
          2,
        ),
        whyThisTool:
          "Immediate deletion on ACK keeps the MongoDB inbox tiny while the 30-day TTL index acts as an automatic garbage collector for offline users.",
        terminalLine: `[MONGODB] deleteOne({ _id: "${notificationId.slice(0, 10)}", userId }) -> deletedCount: 1 [6ms]`,
        mutatedStore: "mongodb",
        applyState: (prev) => ({
          ...prev,
          mongodb: {
            ...prev.mongodb,
            appnotifications: prev.mongodb.appnotifications.filter(
              (n) => n._id !== notificationId,
            ),
          },
        }),
      },
    ],
  };
}

// ============================================================================
// JOURNEY 5: INFRASTRUCTURE & CI/CD GKE GITOPS DEPLOYMENT PIPELINE
// ============================================================================

export function buildCicdDeployTrace(
  state: VirtualClusterState,
  input: {
    commitMessage: string;
    changedService: "both" | "backend" | "web";
  },
): ExecutionTrace {
  const { iso } = getTodayStrings();
  const newSha = deterministicHex(input.commitMessage + iso, 7);
  const bumpVersion = (() => {
    const parts = state.k8s.chartVersion.split(".").map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join(".");
  })();

  const backendChanged = input.changedService !== "web";
  const webChanged = input.changedService !== "backend";

  const steps: TraceStep[] = [
    {
      id: "cicd-1",
      index: 0,
      title: "Git Push to main (Desktoo/Ascend)",
      subtitle: `Commit ${newSha}: "${input.commitMessage}"`,
      plainTitle: "Code is saved on GitHub",
      plainExplanation: `A developer pushes "${input.commitMessage}" to GitHub. A safety queue makes sure two updates never clash with each other.`,
      businessImpact: "Keeps releases organized so fast updates never break each other.",
      ruleChecks: [
        { id: "r-ci-git", label: `New update (${newSha}) saved on GitHub & queued safely`, category: "Infra" },
      ],
      fromNode: "github",
      toNode: "actions",
      activeNode: "github",
      protocol: "GIT",
      operationBadge: `SHA ${newSha}`,
      latencyMs: 120,
      payloadTitle: "GitHub Push Webhook -> .github/workflows/deploy.yml",
      payloadLanguage: "yaml",
      payloadContent: `ref: refs/heads/main
repository: Desktoo/Ascend
commit: ${newSha}
message: "${input.commitMessage}"
concurrency:
  group: deploy-main
  cancel-in-progress: false`,
      whyThisTool:
        "Setting cancel-in-progress: false on deploy-main prevents a rapid second push from interrupting an active Helm upgrade or Prisma database migration halfway through.",
      terminalLine: `[GITHUB] Push main@${newSha} triggered workflow "Build & Deploy"`,
    },
    {
      id: "cicd-2",
      index: 1,
      title: "GitHub Actions Path Filter & Docker Buildx",
      subtitle: `dorny/paths-filter -> backend:${backendChanged} web:${webChanged} (GHA cache)`,
      plainTitle: "GitHub Actions builds only what changed",
      plainExplanation:
        "GitHub Actions checks which folders changed so it skips untouched code, packs the app into containers, and logs into Google Cloud without password files.",
      businessImpact: "Cuts build times in half and avoids storing risky cloud passwords.",
      ruleChecks: [
        { id: "r-ci-build", label: "Only changed app parts built & signed into Google Cloud safely", category: "Security" },
      ],
      fromNode: "actions",
      toNode: "dockerhub",
      activeNode: "actions",
      protocol: "OCI",
      operationBadge: "BUILD",
      latencyMs: 340,
      payloadTitle: "GitHub Actions Parallel Docker Buildx & GCP OIDC",
      payloadLanguage: "yaml",
      payloadContent: `# Step 1: detect-changes (~3s)
outputs:
  backend: "${backendChanged}"
  web: "${webChanged}"

# Step 2: Parallel Docker Buildx (type=gha,mode=max)
build_targets:
${backendChanged ? `  - apps/backend -> ascend-backend:${newSha}` : "  # backend skipped (unchanged)"}
${webChanged ? `  - apps/web -> ascend-web:${newSha}` : "  # web skipped (unchanged)"}

# Step 3: Keyless GCP Workload Identity Federation (OIDC)
auth: google-github-actions/auth@v2 -> gke-ascend-cluster (us-central1-a)`,
      whyThisTool:
        "Monorepo path filtering skips unchanged service builds, GHA layer caching cuts Docker build times dramatically, and Workload Identity OIDC eliminates static GCP JSON keys.",
      terminalLine: `[ACTIONS] Built changed containers (${newSha}) & authenticated via keyless OIDC`,
    },
    {
      id: "cicd-3",
      index: 2,
      title: "Docker Hub Versioned Image Registry",
      subtitle: `Pushed ascend-backend:${newSha} & ascend-web:${newSha}`,
      plainTitle: "App packages are stored on Docker Hub",
      plainExplanation:
        "The ready-to-run app packages are uploaded to Docker Hub with a unique version tag so Google Cloud servers can download the exact same build.",
      businessImpact: "Every server runs the exact same tested package — zero surprises.",
      ruleChecks: [
        { id: "r-ci-docker", label: `Versioned app images (${newSha}) uploaded to Docker Hub`, category: "Infra" },
      ],
      fromNode: "actions",
      toNode: "dockerhub",
      activeNode: "dockerhub",
      protocol: "OCI",
      operationBadge: "IMAGES READY",
      latencyMs: 160,
      payloadTitle: "Docker Hub OCI Image Manifests",
      payloadLanguage: "yaml",
      payloadContent: `registry: docker.io/desktooondocker
pushed_tags:
${backendChanged ? `  - desktooondocker/ascend-backend:${newSha} (linux/amd64)\n  - desktooondocker/ascend-backend:latest` : "  # backend image reused from previous release"}
${webChanged ? `  - desktooondocker/ascend-web:${newSha} (linux/amd64)\n  - desktooondocker/ascend-web:latest` : "  # web image reused from previous release"}
status: Immutable digest verified`,
      whyThisTool:
        "Tagging each container image with its Git commit SHA makes rollbacks instant and guarantees every Kubernetes pod runs identical immutable code.",
      terminalLine: `[DOCKER HUB] Published versioned OCI images for tag ${newSha}`,
    },
    {
      id: "cicd-4",
      index: 3,
      title: "ArgoCD GitOps Reconciliation",
      subtitle: "argoproj.io/v1alpha1 Application/ascend detects desired state",
      plainTitle: "ArgoCD spots the new version",
      plainExplanation:
        "ArgoCD watches GitHub and compares it with what is live in Google Cloud. As soon as it sees a new version, it kicks off the update automatically.",
      businessImpact: "Every live change is tracked in Git and can be rolled back in one click.",
      ruleChecks: [
        { id: "r-ci-argo", label: "ArgoCD spotted the new release & started automatic cloud sync", category: "Infra" },
      ],
      fromNode: "dockerhub",
      toNode: "argocd",
      activeNode: "argocd",
      protocol: "GITOPS",
      operationBadge: "AUTO SYNC",
      latencyMs: 95,
      payloadTitle: "argocd/application.yaml Reconciliation Loop",
      payloadLanguage: "yaml",
      payloadContent: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ascend
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/Desktoo/Ascend
    targetRevision: main
    path: helm
    helm:
      releaseName: ascend-prod
      valueFiles: [values-prod.yaml]
  destination:
    namespace: prod
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers: [/spec/replicas, /spec/template/spec/containers/0/image]`,
      whyThisTool:
        "ArgoCD continuously reconciles Git against GKE while ignoreDifferences prevents HorizontalPodAutoscaler replica count changes from causing false drift alerts.",
      terminalLine: `[ARGOCD] Application/ascend reconciling helm/ (values-prod.yaml) -> namespace: prod`,
    },
    {
      id: "cicd-5",
      index: 4,
      title: "Helm Release & Post-Upgrade Prisma Migration Job",
      subtitle: `helm upgrade --install ascend-prod (v${bumpVersion}) + db-migrate hook`,
      plainTitle: "Helm updates the app & database safely",
      plainExplanation: `Helm rolls out version v${bumpVersion} and runs any database updates one time before the new servers take traffic.`,
      businessImpact: "Stops multiple servers from clashing when updating database tables.",
      ruleChecks: [
        { id: "r-ci-helm", label: `Helm release v${bumpVersion} applied & database tables updated once`, category: "Database" },
      ],
      fromNode: "argocd",
      toNode: "helm",
      activeNode: "helm",
      protocol: "SYNC",
      operationBadge: `HELM v${bumpVersion}`,
      latencyMs: 210,
      payloadTitle: "Helm Upgrade + Post-Upgrade Prisma Migration Job",
      payloadLanguage: "yaml",
      payloadContent: `$ helm upgrade --install ascend-prod ./helm \\
    -f ./helm/values-prod.yaml \\
    --namespace prod --create-namespace \\
    --set backend.image.tag="${backendChanged ? newSha : state.k8s.pods.backend.imageTag}" \\
    --set web.image.tag="${webChanged ? newSha : state.k8s.pods.web.imageTag}"

# Post-Upgrade Hook Job (helm/templates/job.yaml)
kind: Job
metadata:
  name: ascend-prod-db-migrate
  annotations:
    helm.sh/hook: post-install,post-upgrade
    helm.sh/hook-delete-policy: before-hook-creation
status: Complete (prisma migrate deploy -> 0 pending migrations)`,
      whyThisTool:
        "Running Prisma migrations as a Helm post-upgrade Job guarantees schema updates execute once per release inside the VPC with automatic retries (backoffLimit: 3) rather than racing across 3+ booting backend pods.",
      terminalLine: `[HELM] Release ascend-prod v${bumpVersion} applied · Job/ascend-prod-db-migrate succeeded`,
    },
    {
      id: "cicd-6",
      index: 5,
      title: "Bitnami SealedSecrets In-Cluster Unsealing",
      subtitle: "SealedSecret/ascend-prod-secrets -> K8s Secret (18 encrypted keys)",
      plainTitle: "Passwords unlock only inside Google Cloud",
      plainExplanation:
        "All 18 secret keys (database URLs, login keys, API tokens) stay locked in GitHub and unlock only inside Google Cloud when the app starts.",
      businessImpact: "No readable passwords ever touch GitHub or developer laptops.",
      ruleChecks: [
        { id: "r-ci-seal", label: "All 18 secret keys unlocked safely inside Google Cloud", category: "Security" },
      ],
      fromNode: "helm",
      toNode: "sealedsecrets",
      activeNode: "sealedsecrets",
      protocol: "KMS",
      operationBadge: "UNLOCK 18",
      latencyMs: 32,
      payloadTitle: "Bitnami SealedSecret Controller Decryption",
      payloadLanguage: "yaml",
      payloadContent: `apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: ascend-prod-secrets
  namespace: prod
status:
  unsealedTo: Secret/ascend-prod-secrets
  injectedEnvKeys:
    - DATABASE_URL (PostgreSQL)
    - UPSTASH_REDIS_URL & QUEUE_REDIS_URL
    - MONGODB_URI
    - AWS_IAM_ACCESS_KEY & AWS_REGION
    - JWT_ACCESS_SECRET & JWT_REFRESH_SECRET
    - BCRYPT_SECRET_PEPPER
    - VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY`,
      whyThisTool:
        "Bitnami SealedSecrets uses asymmetric cluster-bound RSA encryption so encrypted secrets can be safely committed in Git and decrypted exclusively by the in-cluster controller.",
      terminalLine: `[SEALED-SECRETS] Unsealed 18 production keys into Secret/ascend-prod-secrets (ns: prod)`,
    },
    {
      id: "cicd-7",
      index: 6,
      title: "GKE Autopilot Rolling Pod Cutover",
      subtitle: "3× Backend (HPA 3–8) · 2× Web (HPA 2–5) · 1× Queue Redis (10Gi PVC)",
      plainTitle: "New cloud servers start one by one",
      plainExplanation:
        "Google Cloud starts fresh copies of the app (3 API, 2 Web, 1 Queue Redis) and checks that each one is healthy before turning off the old copies.",
      businessImpact: "Auto-scales up during busy hours and keeps the app online if a server crashes.",
      ruleChecks: [
        { id: "r-ci-pods", label: "All 6 cloud server pods healthy (3 API · 2 Web · 1 Queue Redis)", category: "Infra" },
      ],
      fromNode: "sealedsecrets",
      toNode: "gke",
      activeNode: "gke",
      protocol: "K8S",
      operationBadge: "6 PODS READY",
      latencyMs: 185,
      payloadTitle: "GKE Autopilot Deployment Rollout & Health Probes",
      payloadLanguage: "yaml",
      payloadContent: `$ kubectl rollout status deployment/ascend-prod-backend deployment/ascend-prod-web -n prod

POD                                    READY   STATUS    IMAGE TAG   RESOURCES
ascend-prod-backend-7f9b8c-x91k        1/1     Running   ${backendChanged ? newSha : state.k8s.pods.backend.imageTag}     250m CPU / 256Mi
ascend-prod-backend-7f9b8c-p2m4        1/1     Running   ${backendChanged ? newSha : state.k8s.pods.backend.imageTag}     250m CPU / 256Mi
ascend-prod-backend-7f9b8c-q8v2        1/1     Running   ${backendChanged ? newSha : state.k8s.pods.backend.imageTag}     250m CPU / 256Mi
ascend-prod-web-5d2a1f-k4n9            1/1     Running   ${webChanged ? newSha : state.k8s.pods.web.imageTag}     150m CPU / 192Mi
ascend-prod-web-5d2a1f-w7r3            1/1     Running   ${webChanged ? newSha : state.k8s.pods.web.imageTag}     150m CPU / 192Mi
ascend-prod-redis-0                    1/1     Running   7-alpine    PVC 10Gi (standard-rwo)`,
      whyThisTool:
        "GKE Autopilot right-sizes pod billing automatically while HPA scales NestJS pods from 3 to 8 at 70% CPU and preserves BullMQ job state across restarts via a Retained 10Gi GCP Persistent Disk.",
      terminalLine: `[GKE] Rolling update complete: 3/3 backend, 2/2 web, 1/1 redis-pvc healthy`,
      mutatedStore: "k8s",
      applyState: (prev) => ({
        ...prev,
        k8s: {
          ...prev.k8s,
          chartVersion: bumpVersion,
          commitSha: newSha,
          lastCommitMessage: input.commitMessage,
          argoSyncStatus: "Synced",
          pods: {
            backend: {
              ...prev.k8s.pods.backend,
              imageTag: backendChanged ? newSha : prev.k8s.pods.backend.imageTag,
            },
            web: {
              ...prev.k8s.pods.web,
              imageTag: webChanged ? newSha : prev.k8s.pods.web.imageTag,
            },
            redis: prev.k8s.pods.redis,
          },
          lastDeployedAt: iso,
        },
      }),
    },
    {
      id: "cicd-8",
      index: 7,
      title: "Ingress Zero-Downtime Traffic Cutover",
      subtitle: "https://app.ascendup.online & https://api.ascendup.online LIVE",
      plainTitle: "Users switch over with zero downtime",
      plainExplanation: `The Load Balancer smoothly sends live users at app.ascendup.online to version ${newSha} — no loading errors and nobody gets logged out.`,
      businessImpact: "Ship new features any time of day without maintenance downtime.",
      ruleChecks: [
        { id: "r-ci-live", label: "Live users switched to new version with zero downtime", category: "Infra" },
      ],
      fromNode: "gke",
      toNode: "gke_ingress",
      activeNode: "gke_ingress",
      protocol: "HTTPS",
      operationBadge: "LIVE 200 OK",
      latencyMs: 18,
      payloadTitle: "GCE / NGINX Ingress Live Routing Table",
      payloadLanguage: "yaml",
      payloadContent: `Ingress: ascend-prod-ingress (TLS: ascend-prod-tls-cert)
Routes:
  https://ascendup.online     -> ascend-prod-web:3001      [200 OK · 2 endpoints]
  https://app.ascendup.online -> ascend-prod-web:3001      [200 OK · 2 endpoints]
  https://api.ascendup.online -> ascend-prod-backend:3000  [200 OK · 3 endpoints]
  wss://api.ascendup.online   -> Socket.IO RedisIOAdapter  [UPGRADED]`,
      whyThisTool:
        "Health checks against /health ensure traffic shifts smoothly onto new Autopilot pods with zero dropped requests or broken WebSocket rooms.",
      terminalLine: `[INGRESS] Production traffic live on commit ${newSha} (ascendup.online / api.ascendup.online)`,
    },
  ];

  return {
    id: `trace_cicd_${Date.now()}`,
    journey: "cicd",
    graphMode: "cicd",
    title: `Production GitOps Rollout (${newSha})`,
    endpoint: `git push origin main (${newSha})`,
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// JOURNEY: CREATE STANDARD TASK (POST /api/v1/tasks/create)
// ============================================================================

export function buildCreateTaskTrace(
  state: VirtualClusterState,
  input: {
    title: string;
    priority: PriorityLevel;
    dueTime: string;
  },
): ExecutionTrace {
  const { dateStr, iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const user =
    state.postgres.users.find((u) => u.id === userId) ?? state.postgres.users[0];
  const taskId = `tsk_std_${deterministicHex(input.title + iso, 10)}`;

  const newTask: VirtualTask = {
    id: taskId,
    userId,
    habitId: null,
    goalId: null,
    type: "Standard",
    title: input.title.trim(),
    status: "PENDING",
    priority: input.priority,
    scheduledDate: dateStr,
    dueTime: `${dateStr}T${input.dueTime}:00.000Z`,
  };

  const steps: TraceStep[] = [
    {
      id: "task-1",
      index: 0,
      title: "Browser Sends Task Request + Timezone Header",
      subtitle: `POST /api/v1/tasks/create (x-user-timezone: ${user.timeZone})`,
      plainTitle: "Sending your new task with your local timezone",
      plainExplanation: `Your browser sends "${newTask.title}" over HTTPS with your HttpOnly login cookie and timezone header (${user.timeZone}).`,
      businessImpact: "Due times automatically align with your local clock wherever you travel.",
      ruleChecks: [
        { id: "r-tsk-https", label: "HTTPS request sent with HttpOnly cookie & x-user-timezone header", category: "Cookie" },
      ],
      fromNode: "browser",
      toNode: "ingress",
      activeNode: "ingress",
      protocol: "HTTPS",
      operationBadge: "POST /tasks",
      latencyMs: 8,
      payloadTitle: "POST /api/v1/tasks/create",
      payloadLanguage: "http",
      payloadContent: `POST /api/v1/tasks/create HTTP/1.1
Host: api.ascendup.online
Cookie: access_token=${state.session.jwt?.raw.slice(0, 28) ?? "eyJ..."}...
x-user-timezone: ${user.timeZone}
Content-Type: application/json

${JSON.stringify(
  {
    title: newTask.title,
    priority: newTask.priority,
    type: "Standard",
    scheduledDate: dateStr,
    dueTime: newTask.dueTime,
  },
  null,
  2,
)}`,
      whyThisTool:
        "Passing x-user-timezone alongside HttpOnly cookies lets NestJS parse deadlines accurately against the user's IANA timezone without trusting client clock drift.",
      terminalLine: `[INGRESS] POST /api/v1/tasks/create (tz=${user.timeZone}) -> routing to NestJS API pod`,
    },
    {
      id: "task-2",
      index: 1,
      title: "NestJS AuthGuard & TasksService Validation",
      subtitle: "AuthGuard -> ValidationPipe -> TasksService.createTask()",
      plainTitle: "Verifying your login & validating task rules",
      plainExplanation:
        "NestJS verifies your JWT signature, checks the task fields, and converts the due time into UTC using your personal timezone.",
      businessImpact: "Bad inputs are rejected immediately before touching the database.",
      ruleChecks: [
        { id: "r-tsk-guard", label: "AuthGuard verified JWT & ValidationPipe sanitized TaskDTO", category: "Security" },
      ],
      fromNode: "ingress",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "HTTP/1.1",
      operationBadge: "TASK DTO",
      latencyMs: 4,
      payloadTitle: "TasksController.createTask() Context",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          guard: "AuthGaurd -> req.user.userId verified",
          service: "TasksService.createTask()",
          resolvedTimeZone: user.timeZone,
          taskType: "Standard",
          priorityXpWeight: TASK_XP[newTask.priority],
        },
        null,
        2,
      ),
      whyThisTool:
        "Centralizing DTO validation and timezone conversion inside TasksService guarantees consistent UTC timestamps across web, mobile, and cron jobs.",
      terminalLine: `[NESTJS] TasksService validated Standard task "${newTask.title}" (${newTask.priority})`,
    },
    {
      id: "task-3",
      index: 2,
      title: "PostgreSQL Indexed Task Insert",
      subtitle: 'INSERT INTO "Task" (indexed on userId, scheduledDate)',
      plainTitle: "Saving the task in PostgreSQL",
      plainExplanation: `Inserts "${newTask.title}" into PostgreSQL under your user account, indexed by today's date (${dateStr}) for fast dashboard queries.`,
      businessImpact: "Composite indexes keep daily task lists fast even with millions of rows.",
      ruleChecks: [
        { id: "r-tsk-pg", label: "Task row saved in PostgreSQL (indexed on userId + scheduledDate)", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "SQL",
      operationBadge: "INSERT TASK",
      latencyMs: 11,
      payloadTitle: "PostgreSQL Task Insert SQL",
      payloadLanguage: "sql",
      payloadContent: `INSERT INTO "Task" ("id", "userId", "type", "title", "status", "priority", "scheduledDate", "dueTime")
VALUES ('${taskId}', '${userId}', 'Standard', '${newTask.title.replace(/'/g, "''")}', 'PENDING', '${newTask.priority}', '${dateStr}', '${newTask.dueTime}')
RETURNING *;
-- Uses @@index([userId, scheduledDate]) for O(log n) dashboard lookups`,
      whyThisTool:
        "PostgreSQL enforces foreign key ownership (ON DELETE CASCADE) and indexes (userId, scheduledDate) so fetching today's tasks and abandoned past tasks stays fast.",
      terminalLine: `[POSTGRES] INSERT Task(${taskId}) type=Standard scheduledDate=${dateStr} [11ms]`,
      mutatedStore: "postgres",
      applyState: (prev) => ({
        ...prev,
        postgres: {
          ...prev.postgres,
          tasks: [newTask, ...prev.postgres.tasks],
        },
      }),
    },
    {
      id: "task-4",
      index: 3,
      title: "Upstash Redis Task Metadata & Dashboard Cache Eviction",
      subtitle: `SET task:metadata:${taskId.slice(0, 10)} (48h) · DEL tasks:cache`,
      plainTitle: "Caching task metadata in Upstash Redis",
      plainExplanation:
        "Caches this task's routing type in managed Upstash Redis for 48 hours and clears the old dashboard list so the new task appears immediately.",
      businessImpact: "Completing this task later requires zero extra SQL joins to inspect its type.",
      ruleChecks: [
        { id: "r-tsk-redis", label: "task:metadata cached in Upstash Redis (48h TTL) & tasks:cache evicted", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "upstash",
      activeNode: "upstash",
      protocol: "REDIS",
      operationBadge: "UPSTASH SET",
      latencyMs: 3,
      payloadTitle: "Upstash Redis — TasksCacheRepository (TLS)",
      payloadLanguage: "redis",
      payloadContent: `# TasksCacheRepository.setTaskMetaData() (48h TTL)
> SET "task:metadata:${taskId}" '{"type":"Standard"}' EX 172800
OK

# TasksCacheRepository.invalidateUserDashboardCache()
> DEL "tasks:cache:${userId}"
(integer) 1`,
      whyThisTool:
        "TasksCacheRepository caches task routing metadata in Upstash Redis (48h TTL) so TasksService.completeTask() knows whether a task is Standard, HabitTask, or GoalTask in ~3ms.",
      terminalLine: `[UPSTASH] SET task:metadata:${taskId.slice(0, 10)} (48h) + DEL tasks:cache:${userId.slice(0, 8)} [3ms]`,
      mutatedStore: "redis",
      applyState: (prev) => {
        const nextKeys = { ...prev.redis.upstashKeys };
        delete nextKeys[`tasks:cache:${userId}`];
        nextKeys[`task:metadata:${taskId}`] = {
          value: { type: "Standard" },
          ttl: "172800s (48h)",
        };
        return {
          ...prev,
          redis: { ...prev.redis, upstashKeys: nextKeys },
        };
      },
    },
  ];

  return {
    id: `trace_task_${Date.now()}`,
    journey: "task",
    graphMode: "runtime",
    title: `Create Task: "${newTask.title}"`,
    endpoint: "POST /api/v1/tasks/create",
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// JOURNEY: CREATE OBJECTIVE / GOAL (POST /api/v1/goals/create)
// ============================================================================

export function buildCreateGoalTrace(
  state: VirtualClusterState,
  input: {
    title: string;
    description: string;
    rewardText: string;
    timeFrame: "WEEKLY" | "MONTHLY";
    configeDaysPerWeek: number;
    weekendsExcluded: boolean;
    firstTaskTitle: string;
  },
): ExecutionTrace {
  const { dateStr, iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const goalId = `goal_${deterministicHex(input.title + iso, 10)}`;
  const taskId = `tsk_goal_${deterministicHex(input.firstTaskTitle + iso, 10)}`;
  const targetDays =
    input.timeFrame === "WEEKLY"
      ? input.configeDaysPerWeek
      : input.configeDaysPerWeek * 4;

  const newGoal: VirtualGoal = {
    id: goalId,
    userId,
    title: input.title.trim(),
    description: input.description.trim() || "Turn long-term milestone into daily execution.",
    rewardText: input.rewardText.trim() || "Celebrate milestone completion",
    timeFrame: input.timeFrame,
    weekendsExcluded: input.weekendsExcluded,
    configeDaysPerWeek: input.configeDaysPerWeek,
    targetDays,
    completedDays: 0,
    currentProgress: 0,
    currentVelocity: 100,
    status: "ACTIVE",
    createdAt: iso,
  };

  const initialGoalTask: VirtualTask = {
    id: taskId,
    userId,
    habitId: null,
    goalId,
    type: "GoalTask",
    title: input.firstTaskTitle.trim() || `Day 1 sprint: ${newGoal.title}`,
    status: "PENDING",
    priority: "HIGH",
    scheduledDate: dateStr,
    dueTime: `${dateStr}T18:00:00.000Z`,
  };

  const steps: TraceStep[] = [
    {
      id: "goal-1",
      index: 0,
      title: "Submit Objective / Goal Blueprint",
      subtitle: `POST /api/v1/goals/create (${newGoal.timeFrame} · ${targetDays} target days)`,
      plainTitle: "Sending your new objective & sprint plan",
      plainExplanation: `Your browser submits "${newGoal.title}" (${newGoal.timeFrame.toLowerCase()}, ${targetDays} target execution days) over HTTPS to NGINX Ingress.`,
      businessImpact: "Breaks ambitious goals directly into concrete daily action items.",
      ruleChecks: [
        { id: "r-goal-https", label: "Goal blueprint sent over HTTPS with HttpOnly JWT cookie", category: "Cookie" },
      ],
      fromNode: "browser",
      toNode: "ingress",
      activeNode: "ingress",
      protocol: "HTTPS",
      operationBadge: "POST /goals",
      latencyMs: 9,
      payloadTitle: "POST /api/v1/goals/create",
      payloadLanguage: "http",
      payloadContent: `POST /api/v1/goals/create HTTP/1.1
Host: api.ascendup.online
Cookie: access_token=${state.session.jwt?.raw.slice(0, 28) ?? "eyJ..."}...
Content-Type: application/json

${JSON.stringify(
  {
    title: newGoal.title,
    description: newGoal.description,
    rewardText: newGoal.rewardText,
    timeFrame: newGoal.timeFrame,
    configeDaysPerWeek: newGoal.configeDaysPerWeek,
    weekendsExcluded: newGoal.weekendsExcluded,
    targetDays,
    firstTaskTitle: initialGoalTask.title,
  },
  null,
  2,
)}`,
      whyThisTool:
        "Validates goal horizon (WEEKLY or MONTHLY), active days per week, and weekend exclusions before invoking GoalsService.",
      terminalLine: `[INGRESS] POST /api/v1/goals/create (${newGoal.timeFrame}, ${targetDays}d) -> NestJS API pod`,
    },
    {
      id: "goal-2",
      index: 1,
      title: "NestJS AuthGuard & GoalsService Blueprint Calculation",
      subtitle: "AuthGuard -> GoalsService computes targetDays & initial GoalTask",
      plainTitle: "Calculating your goal schedule & velocity target",
      plainExplanation: `NestJS verifies your identity and turns "${newGoal.title}" into a ${targetDays}-day sprint blueprint with a starting 100% velocity baseline.`,
      businessImpact: "Eliminates 'someday' goals by generating Day 1's actionable task immediately.",
      ruleChecks: [
        { id: "r-goal-auth", label: "AuthGuard verified JWT & GoalsService computed sprint targets", category: "Security" },
      ],
      fromNode: "ingress",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "HTTP/1.1",
      operationBadge: "GOAL ENGINE",
      latencyMs: 5,
      payloadTitle: "GoalsService Sprint Calculation",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          controller: "GoalsController.createGoal()",
          timeFrame: newGoal.timeFrame,
          targetDays,
          weekendsExcluded: newGoal.weekendsExcluded,
          initialVelocity: "100%",
          spawnsInitialTask: initialGoalTask.title,
        },
        null,
        2,
      ),
      whyThisTool:
        "GoalsService coordinates directly with TasksService so every newly created Goal automatically spawns an actionable GoalTask for today.",
      terminalLine: `[NESTJS] GoalsService computed ${targetDays} target days (${newGoal.timeFrame}) + Day-1 GoalTask`,
    },
    {
      id: "goal-3",
      index: 2,
      title: "PostgreSQL Atomic Transaction (Goal + Initial GoalTask)",
      subtitle: 'BEGIN -> INSERT "Goal" + INSERT "Task" (type = GoalTask, FK goalId)',
      plainTitle: "Saving your objective & Day-1 task in PostgreSQL",
      plainExplanation: `Saves "${newGoal.title}" and its linked Day-1 task "${initialGoalTask.title}" together in one PostgreSQL transaction with a foreign key link.`,
      businessImpact: "Deleting or archiving the objective cleanly cascades to all linked tasks.",
      ruleChecks: [
        { id: "r-goal-pg", label: "Goal & linked GoalTask saved atomically in PostgreSQL (1:N FK)", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "SQL",
      operationBadge: "GOAL + TASK TX",
      latencyMs: 15,
      payloadTitle: "PostgreSQL Atomic Goal + GoalTask Transaction",
      payloadLanguage: "sql",
      payloadContent: `BEGIN;

INSERT INTO "Goal" ("id", "userId", "title", "description", "rewardText", "timeFrame", "weekendsExcluded", "configeDaysPerWeek", "targetDays", "status")
VALUES ('${goalId}', '${userId}', '${newGoal.title.replace(/'/g, "''")}', '${newGoal.description.replace(/'/g, "''")}', '${newGoal.rewardText.replace(/'/g, "''")}', '${newGoal.timeFrame}', ${newGoal.weekendsExcluded}, ${newGoal.configeDaysPerWeek}, ${targetDays}, 'ACTIVE');

INSERT INTO "Task" ("id", "userId", "goalId", "type", "title", "status", "priority", "scheduledDate", "dueTime")
VALUES ('${taskId}', '${userId}', '${goalId}', 'GoalTask', '${initialGoalTask.title.replace(/'/g, "''")}', 'PENDING', 'HIGH', '${dateStr}', '${initialGoalTask.dueTime}');

COMMIT;`,
      whyThisTool:
        "PostgreSQL enforces relational ownership between User -> Goal -> GoalTask with ON DELETE CASCADE and keeps progress/velocity counters strongly consistent.",
      terminalLine: `[POSTGRES] COMMIT Goal(${goalId}) + GoalTask(${taskId}) [15ms]`,
      mutatedStore: "postgres",
      applyState: (prev) => ({
        ...prev,
        postgres: {
          ...prev.postgres,
          goals: [newGoal, ...prev.postgres.goals],
          tasks: [initialGoalTask, ...prev.postgres.tasks],
        },
      }),
    },
    {
      id: "goal-4",
      index: 3,
      title: "Upstash Redis GoalTask Routing Metadata & Cache Eviction",
      subtitle: `SET task:metadata:${taskId.slice(0, 10)} (parentId: goalId) · DEL tasks:cache`,
      plainTitle: "Caching the goal link in Upstash Redis",
      plainExplanation:
        "Stores the link between this task and its parent objective in managed Upstash Redis for 48 hours so checking it off later triggers goal progress updates immediately.",
      businessImpact: "Keeps task completion fast by avoiding extra relational parent lookups.",
      ruleChecks: [
        { id: "r-goal-redis", label: "GoalTask parentId cached in Upstash Redis (48h) & tasks:cache cleared", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "upstash",
      activeNode: "upstash",
      protocol: "REDIS",
      operationBadge: "UPSTASH META",
      latencyMs: 3,
      payloadTitle: "Upstash Redis — TasksCacheRepository (GoalTask Routing)",
      payloadLanguage: "redis",
      payloadContent: `# TasksCacheRepository.setTaskMetaData() (48h TTL)
> SET "task:metadata:${taskId}" '{"type":"GoalTask","parentId":"${goalId}"}' EX 172800
OK

# TasksCacheRepository.invalidateUserDashboardCache()
> DEL "tasks:cache:${userId}"
(integer) 1`,
      whyThisTool:
        "TasksCacheRepository caches { type: 'GoalTask', parentId: goalId } in Upstash Redis so completing the task automatically triggers GoalsService.calculateGoalVelocity().",
      terminalLine: `[UPSTASH] Cached GoalTask routing -> parentId=${goalId.slice(0, 12)} + DEL tasks:cache [3ms]`,
      mutatedStore: "redis",
      applyState: (prev) => {
        const nextKeys = { ...prev.redis.upstashKeys };
        delete nextKeys[`tasks:cache:${userId}`];
        nextKeys[`task:metadata:${taskId}`] = {
          value: { type: "GoalTask", parentId: goalId },
          ttl: "172800s (48h)",
        };
        return {
          ...prev,
          redis: { ...prev.redis, upstashKeys: nextKeys },
        };
      },
    },
    {
      id: "goal-5",
      index: 4,
      title: "AWS DynamoDB GSI1 Velocity Index Partition Ready",
      subtitle: `Day-Mark-Logs · GSI1_PK: GOAL#${goalId.slice(0, 12)}`,
      plainTitle: "Preparing DynamoDB GSI1 for goal velocity tracking",
      plainExplanation:
        "Every time you complete a task for this objective, Ascend writes a snapshot under DynamoDB's Goal index (GSI1) so velocity analytics load in single-digit milliseconds.",
      businessImpact: "Goal progress charts stay fast even after hundreds of sprint days.",
      ruleChecks: [
        { id: "r-goal-gsi1", label: `AWS DynamoDB GSI1 partition (GOAL#${goalId.slice(0, 10)}) ready for velocity logs`, category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "dynamodb",
      activeNode: "dynamodb",
      protocol: "HTTPS",
      operationBadge: "GSI1 READY",
      latencyMs: 7,
      payloadTitle: "AWS DynamoDB GSI1 Goal Velocity Query Pattern",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          TableName: "Day-Mark-Logs",
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1_PK = :pk AND begins_with(GSI1_SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `GOAL#${goalId}`,
            ":sk": "COMPLETED#",
          },
          usedBy: "GoalsService.calculateGoalVelocity(historicalLogs)",
        },
        null,
        2,
      ),
      whyThisTool:
        "Using GSI1 on Day-Mark-Logs lets Ascend query all historical completions for a single goal directly without scanning the whole user partition or PostgreSQL.",
      terminalLine: `[DYNAMODB] GSI1 partition GOAL#${goalId.slice(0, 12)} ready for velocity tracking [7ms]`,
    },
  ];

  return {
    id: `trace_goal_${Date.now()}`,
    journey: "goal",
    graphMode: "runtime",
    title: `Create Objective: "${newGoal.title}"`,
    endpoint: "POST /api/v1/goals/create",
    startedAt: iso,
    steps,
  };
}

// ============================================================================
// JOURNEY: HOURLY TIMEZONE-AWARE HABIT CRON + BULLMQ WORKER PIPELINE
// Extracted from apps/backend/src/modules/habits/habits.service.ts (@Cron '0 * * * *')
// ============================================================================

export function buildHabitCronTrace(
  state: VirtualClusterState,
  input: {
    targetTimeZone: string;
    simulatedUtcLabel: string;
    localWindowLabel: string;
  },
): ExecutionTrace {
  const { dateStr, iso } = getTodayStrings();
  const userId = state.session.activeUserId;
  const activeHabits = state.postgres.habits.filter((h) => h.isActive);
  const sampleHabit = activeHabits[0];
  const tz = input.targetTimeZone;
  const hourStr = input.localWindowLabel.slice(0, 2);
  const windowStartMinutes = Number(hourStr) * 60;
  const windowEndMinutes = windowStartMinutes + 60;
  const jobId = `init_window:${tz}-H${hourStr}:${dateStr}`;
  const spawnedTaskId = `tsk_cron_${deterministicHex(tz + iso, 8)}`;

  // Compare how 3 global timezones look at this EXACT same UTC instant
  const tzComparison = [
    {
      timeZone: "Asia/Kolkata",
      localTime: tz === "Asia/Kolkata" ? input.localWindowLabel : "19:30",
      dayStartTime: "06:00",
      inWindow: tz === "Asia/Kolkata",
    },
    {
      timeZone: "Europe/London",
      localTime: tz === "Europe/London" ? input.localWindowLabel : "00:30",
      dayStartTime: "06:00",
      inWindow: tz === "Europe/London",
    },
    {
      timeZone: "America/Los_Angeles",
      localTime: tz === "America/Los_Angeles" ? input.localWindowLabel : "16:30",
      dayStartTime: "06:00",
      inWindow: tz === "America/Los_Angeles",
    },
  ];

  const steps: TraceStep[] = [
    {
      id: "cron-1",
      index: 0,
      title: "HabitsCron (@Cron('0 * * * *')) Queries Distinct Timezones",
      subtitle: 'SELECT DISTINCT "timeZone" FROM "User" (No Full-Table Scan!)',
      plainTitle: "Hourly cron wakes up & fetches only distinct timezones",
      plainExplanation:
        "At the top of every hour, NestJS asks PostgreSQL ONLY for the list of unique user timezones (e.g. 3 zones) instead of scanning every user row in the database.",
      businessImpact: "Scales effortlessly to millions of users without spiking database CPU.",
      ruleChecks: [
        { id: "r-cron-distinct", label: "Hourly @Cron('0 * * * *') queried DISTINCT timeZone (no full-table scan)", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "SQL",
      operationBadge: "CRON 0 * * * *",
      latencyMs: 6,
      payloadTitle: "HabitsService.handleDailyOrchestration() SQL",
      payloadLanguage: "sql",
      payloadContent: `-- Runs once per hour via @Cron('0 * * * *') inside NestJS
SELECT DISTINCT "timeZone"
FROM "User"
WHERE "isAppPaused" = false;

-- Result (3 distinct IANA zones instead of scanning all user rows):
-- 1. 'Asia/Kolkata'
-- 2. 'Europe/London'
-- 3. 'America/Los_Angeles'`,
      whyThisTool:
        "A naive cron running every minute across all users collapses at scale. Querying DISTINCT IANA timezones reduces millions of users down to at most ~40 timezone buckets per hour.",
      terminalLine: `[HABITS-CRON] @Cron('0 * * * *') @ ${input.simulatedUtcLabel} -> found 3 distinct IANA timezones [6ms]`,
    },
    {
      id: "cron-2",
      index: 1,
      title: "IANA TZDate & DST Window Evaluation",
      subtitle: `Target match: ${tz} is in ${input.localWindowLabel}–${String((Number(hourStr) + 1) % 24).padStart(2, "0")}:00 window`,
      plainTitle: `Checking local clocks & Daylight Saving Time across zones`,
      plainExplanation: `At ${input.simulatedUtcLabel}, it is ${input.localWindowLabel} in ${tz} — matching users' dayStartTime window — while users in other timezones are skipped until their own morning arrives.`,
      businessImpact: "Users in India, London, and San Francisco each get fresh habits at their own morning — even across Daylight Saving shifts.",
      ruleChecks: [
        { id: "r-cron-tz", label: `TZDate evaluated DST-safe local window [${windowStartMinutes}m–${windowEndMinutes}m] for ${tz}`, category: "Security" },
      ],
      fromNode: "postgres",
      toNode: "nestjs",
      activeNode: "nestjs",
      protocol: "INTERNAL",
      operationBadge: "IANA + DST",
      latencyMs: 3,
      payloadTitle: "Timezone Bucket Evaluation (TZDate + Intl.DateTimeFormat)",
      payloadLanguage: "json",
      payloadContent: JSON.stringify(
        {
          utcClock: input.simulatedUtcLabel,
          engine: "@date-fns/tz TZDate (Automatic IANA Daylight Saving Time)",
          evaluatedTimezones: tzComparison,
          matchedWindow: {
            timeZone: tz,
            windowStartMinutes,
            windowEndMinutes,
            localDateString: dateStr,
          },
        },
        null,
        2,
      ),
      whyThisTool:
        "Using IANA timezone names (like America/Los_Angeles) instead of fixed UTC offsets automatically handles Daylight Saving Time (DST) transitions without breaking streaks.",
      terminalLine: `[NESTJS] Matched window ${tz} (${input.localWindowLabel}) · skipped off-window zones`,
    },
    {
      id: "cron-3",
      index: 2,
      title: "Enqueue Timezone Batch to BullMQ (habits-queue)",
      subtitle: `jobId: "${jobId}" (Deterministic Deduplication + 3x Backoff)`,
      plainTitle: "Queuing the timezone batch into Redis & BullMQ",
      plainExplanation: `Pushes a background job for ${tz} into BullMQ (redis-0 with 10Gi persistent disk) using a unique date-stamped job ID so retries never duplicate the batch.`,
      businessImpact: "Offloads heavy task generation off web servers and survives pod restarts safely.",
      ruleChecks: [
        { id: "r-cron-bull", label: `Deterministic BullMQ jobId (${jobId}) queued in redis-0 (10Gi PVC)`, category: "Infra" },
      ],
      fromNode: "nestjs",
      toNode: "redis",
      activeNode: "redis",
      protocol: "REDIS",
      operationBadge: "BULLMQ JOB",
      latencyMs: 5,
      payloadTitle: "BullMQ habits-queue Job Enqueue (redis-0 · 10Gi PVC)",
      payloadLanguage: "redis",
      payloadContent: `# Queue Redis (10Gi GCP Persistent Disk) -> habits-queue
> XADD "bull:habits-queue:events" * \\
    name "INITIALIZE_TIMEZONE_TASKS" \\
    jobId "${jobId}" \\
    attempts "3" \\
    backoff "exponential:2000ms"

Payload:
${JSON.stringify(
  {
    timeZone: tz,
    windowStartMinutes,
    windowEndMinutes,
    localDateString: dateStr,
  },
  null,
  2,
)}`,
      whyThisTool:
        "BullMQ runs on a dedicated Redis pod backed by a 10Gi Retained Persistent Disk with deterministic jobIds so a pod crash mid-hour never double-schedules a timezone.",
      terminalLine: `[BULLMQ] Enqueued habits-queue job "${jobId}" (3x exp backoff) [5ms]`,
      mutatedStore: "redis",
      applyState: (prev) => ({
        ...prev,
        redis: {
          ...prev.redis,
          bullmqJobs: [
            {
              jobId,
              queue: "habits-queue",
              name: "INITIALIZE_TIMEZONE_TASKS",
              status: "completed",
              data: {
                timeZone: tz,
                windowStartMinutes,
                windowEndMinutes,
                localDateString: dateStr,
              },
              timestamp: iso,
            },
            ...prev.redis.bullmqJobs.slice(0, 6),
          ],
        },
      }),
    },
    {
      id: "cron-4",
      index: 3,
      title: "HabitTaskProcessor Materializes Daily Tasks in PostgreSQL",
      subtitle: "Idempotent insert guarded by @@unique([habitId, scheduledDate])",
      plainTitle: "Worker creates today's habit tasks safely in PostgreSQL",
      plainExplanation: `The BullMQ worker finds active habits scheduled for today's weekday in ${tz} and creates their daily tasks — while PostgreSQL's unique rule guarantees zero duplicates even if a worker retries.`,
      businessImpact: "At-least-once background retries + unique SQL constraints = zero duplicate tasks.",
      ruleChecks: [
        { id: "r-cron-pg", label: "HabitTaskProcessor materialized tasks with @@unique([habitId, scheduledDate])", category: "Database" },
      ],
      fromNode: "redis",
      toNode: "postgres",
      activeNode: "postgres",
      protocol: "TX",
      operationBadge: "MATERIALIZE",
      latencyMs: 14,
      payloadTitle: "HabitTaskProcessor -> PostgreSQL Idempotent Task Insert",
      payloadLanguage: "sql",
      payloadContent: `-- 1. Fetch active habits matching timezone (${tz}), local weekday & dayStartTime window
SELECT h.* FROM "Habit" h
JOIN "User" u ON u."id" = h."userId"
WHERE u."timeZone" = '${tz}'
  AND u."dayStartTime" >= '${input.localWindowLabel}'
  AND h."isActive" = true;

-- 2. Materialize daily HabitTask (composite unique guard prevents duplicates on retry)
INSERT INTO "Task" ("id", "userId", "habitId", "type", "title", "status", "priority", "scheduledDate")
VALUES ('${spawnedTaskId}', '${userId}', '${sampleHabit?.id ?? "hab_01"}', 'HabitTask', '${(sampleHabit?.taskTitle ?? "Daily habit execution").replace(/'/g, "''")}', 'PENDING', '${sampleHabit?.taskPriority ?? "HIGH"}', '${dateStr}')
ON CONFLICT ("habitId", "scheduledDate") DO NOTHING;`,
      whyThisTool:
        "BullMQ uses at-least-once delivery; combining deterministic job IDs with PostgreSQL's @@unique([habitId, scheduledDate]) makes task generation 100% idempotent without slow distributed locks.",
      terminalLine: `[WORKER->PG] Materialized daily HabitTasks for ${tz} (idempotent ON CONFLICT guard) [14ms]`,
    },
    {
      id: "cron-5",
      index: 4,
      title: "Hydrate task:meta & Evict Stale User Dashboard Cache",
      subtitle: `SETEX task:meta:* · DEL user:${userId.slice(0, 8)}:tasks`,
      plainTitle: "Clearing old caches so users wake up to fresh habits",
      plainExplanation: `Clears cached dashboard lists in Redis for users in ${tz} so the moment they open Ascend in the morning, today's fresh habit tasks appear immediately.`,
      businessImpact: "Users never see yesterday's stale tasks after their personal day rolls over.",
      ruleChecks: [
        { id: "r-cron-cache", label: "Dashboard caches evicted & task:meta hydrated for waking users", category: "Database" },
      ],
      fromNode: "nestjs",
      toNode: "redis",
      activeNode: "redis",
      protocol: "REDIS",
      operationBadge: "CACHE EVICT",
      latencyMs: 4,
      payloadTitle: "Post-Materialization Cache Eviction",
      payloadLanguage: "redis",
      payloadContent: `> SETEX "task:meta:${spawnedTaskId}" 86400 '{"type":"HabitTask","parentId":"${sampleHabit?.id ?? "hab_01"}"}'
OK

> DEL "user:${userId}:tasks"
(integer) 1`,
      whyThisTool:
        "Evicting user:{id}:tasks right after worker materialization guarantees the user's first SWR fetch of the morning always gets the newly generated HabitTasks.",
      terminalLine: `[REDIS] Hydrated task:meta & evicted stale dashboard cache for ${tz} [4ms]`,
      mutatedStore: "redis",
      applyState: (prev) => {
        const nextKeys = { ...prev.redis.upstashKeys };
        delete nextKeys[`user:${userId}:tasks`];
        nextKeys[`cron:last_window:${tz}`] = {
          value: { jobId, status: "MATERIALIZED", utc: input.simulatedUtcLabel },
          ttl: "3600s (1h)",
        };
        return {
          ...prev,
          redis: { ...prev.redis, upstashKeys: nextKeys },
        };
      },
    },
  ];

  return {
    id: `trace_cron_${Date.now()}`,
    journey: "habit",
    graphMode: "runtime",
    title: `Hourly Timezone Cron (${tz} · ${input.localWindowLabel})`,
    endpoint: `@Cron('0 * * * *') -> BullMQ habits-queue`,
    startedAt: iso,
    steps,
  };
}
