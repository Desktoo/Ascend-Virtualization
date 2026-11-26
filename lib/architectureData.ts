export type GraphMode = "runtime" | "cicd" | "c3";

export type RuntimeNodeId =
  | "browser"
  | "client"
  | "ingress"
  | "nestjs"
  | "postgres"
  | "upstash"
  | "redis"
  | "dynamodb"
  | "mongodb"
  | "socketio";

export type CicdNodeId =
  | "github"
  | "actions"
  | "dockerhub"
  | "argocd"
  | "helm"
  | "sealedsecrets"
  | "gke"
  | "gke_ingress";

export type AnyNodeId = RuntimeNodeId | CicdNodeId;

export interface PodInstanceDef {
  name: string;
  image: string;
  port?: string;
  resources?: string;
  pvc?: string;
  kind?: "pod" | "job";
}

export interface GraphNodeDef {
  id: AnyNodeId;
  mode: GraphMode;
  nodeKind:
    | "client-device"
    | "k8s-deployment"
    | "k8s-gateway"
    | "k8s-job"
    | "managed-db"
    | "pipeline";
  pods?: PodInstanceDef[];
  hpaSummary?: string;
  // Plain-English labels for HRs & Founders
  plainName: string;
  plainTagline: string;
  plainSummary: string;
  plainWhy: string;
  // Technical labels for Engineers
  label: string;
  shortLabel: string;
  subtitle: string;
  layer: string;
  x: number;
  y: number;
  accent: string;
  glow: string;
  badgeText: string;
  repoPath: string;
  whyThisTool: string;
  tradeOff: string;
  keySpecs: string[];
}

export interface GraphEdgeDef {
  id: string;
  mode: GraphMode;
  from: AnyNodeId;
  to: AnyNodeId;
  label: string;
  plainLabel: string;
  protocol: string;
  curveOffset?: number;
}

// ============================================================================
// AUTHENTIC ASCEND GAMIFICATION MATH (Extracted from Desktoo/ascend)
// ============================================================================

export type RankThemeType = "GENERAL";

export const RANK_THEMES: Record<RankThemeType, string[]> = {
  GENERAL: [
    "Beginner",
    "Explorer",
    "Achiever",
    "Specialist",
    "Pro",
    "Expert",
    "Elite",
    "Veteran",
    "Master",
    "Icon",
    "Titan",
    "Apex",
  ],
};

export const TASK_XP = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 30,
} as const;

export type PriorityLevel = keyof typeof TASK_XP;

export function getXpRequiredForNextLevel(level: number): number {
  return Math.floor(100 + level * level * 0.8 + Math.floor(level / 10) * 150);
}

export function getXpMultiplier(level: number): number {
  return 1 + Math.floor(level / 10) * 0.15;
}

export function getTaskXp(level: number, baseXp: number): number {
  return Math.floor(baseXp * getXpMultiplier(level));
}

export function calculateRankFromLevel(
  level: number,
  theme: RankThemeType = "GENERAL",
): string {
  const themeArray = RANK_THEMES[theme] || RANK_THEMES.GENERAL;
  const calculatedIndex = Math.floor((level - 1) / 10);
  const targetIndex = Math.min(Math.max(0, calculatedIndex), themeArray.length - 1);
  return themeArray[targetIndex];
}

export function calculateXpProgression(
  currentLevel: number,
  currentXp: number,
  xpGained: number,
  theme: RankThemeType = "GENERAL",
) {
  let accumulatedXp = currentXp + xpGained;
  let computedLevel = currentLevel;
  let xpTarget = getXpRequiredForNextLevel(computedLevel);

  while (accumulatedXp >= xpTarget) {
    accumulatedXp -= xpTarget;
    computedLevel += 1;
    xpTarget = getXpRequiredForNextLevel(computedLevel);
  }

  const computedRank = calculateRankFromLevel(computedLevel, theme);

  return {
    newLevel: computedLevel,
    newXp: accumulatedXp,
    newRank: computedRank,
    nextLevelTarget: xpTarget,
  };
}

export function calculateNewStabilityScore(
  currentScore: number,
  isCompletedToday: boolean,
): number {
  const K = 0.25;
  const target = isCompletedToday ? 100 : 0;
  const newScore = target * K + currentScore * (1 - K);
  return Math.min(100, Math.max(0, Math.round(newScore)));
}

// ============================================================================
// SPACIOUS 3-ZONE RUNTIME TOPOLOGY (1280 x 640 SVG Space)
// Zone 1: User's Computer -> Zone 2: GKE Cluster (6 min pods) -> Zone 3: Managed DBs
// ============================================================================

export const RUNTIME_NODES: GraphNodeDef[] = [
  {
    id: "browser",
    mode: "runtime",
    nodeKind: "client-device",
    plainName: "User's Computer",
    plainTagline: "Browser · Cookies · Live WS",
    plainSummary:
      "The user's laptop or phone browser running app.ascendup.online. It sends HTTPS requests, stores HttpOnly XSS-protected cookies, and receives instant Socket.IO updates.",
    plainWhy:
      "Auth tokens live in browser-locked HttpOnly cookies rather than localStorage so malicious JavaScript (XSS) can never read or steal them.",
    label: "Client Browser (User Device)",
    shortLabel: "User Browser",
    subtitle: "app.ascendup.online · HttpOnly Cookies",
    layer: "C1 · User Device",
    x: 112,
    y: 295,
    accent: "#38BDF8",
    glow: "rgba(56, 189, 248, 0.34)",
    badgeText: "Client PC",
    repoPath: "apps/web/core/services/",
    whyThisTool:
      "Browser enforces SameSite=Lax, Secure, and HttpOnly cookie isolation automatically on every credentialed request to api.ascendup.online and keeps a live WebSocket channel open.",
    tradeOff:
      "Cross-subdomain cookies require explicit CORS credentials: true and a shared cookie domain (.ascendup.online).",
    keySpecs: [
      "access_token (15m) & refresh_token (7d) in HttpOnly cookies",
      "XSS-safe: document.cookie cannot read auth tokens",
      "SameSite=Lax + Secure TLS prevents CSRF & sniffing",
    ],
  },
  {
    id: "ingress",
    mode: "runtime",
    nodeKind: "k8s-gateway",
    plainName: "NGINX Ingress",
    plainTagline: "TLS 1.3 · Web & API",
    plainSummary:
      "The entry point to Ascend's Google Cloud cluster. It terminates HTTPS encryption and routes page requests to Next.js pods and API/WebSocket traffic to NestJS pods.",
    plainWhy:
      "Keeps internal Kubernetes pods private behind one encrypted HTTPS endpoint with automatic TLS certificates.",
    label: "NGINX / GCE Ingress",
    shortLabel: "NGINX Ingress",
    subtitle: "TLS · Host Routing",
    layer: "GKE Gateway",
    x: 348,
    y: 295,
    accent: "#38BDF8",
    glow: "rgba(56, 189, 248, 0.34)",
    badgeText: "Gateway",
    repoPath: "helm/templates/ingress.yaml",
    whyThisTool:
      "Terminates HTTPS/TLS via cert-manager (ascend-prod-tls-cert) and cleanly splits host traffic between Next.js pods (:3001) and NestJS API pods (:3000).",
    tradeOff:
      "WebSocket upgrades through L7 Ingress require Redis Pub/Sub coordination so live events always reach the right pod.",
    keySpecs: [
      "Hosts: app.ascendup.online & api.ascendup.online",
      "TLS Secret: ascend-prod-tls-cert",
      "Routes HTTPS + WebSocket upgrades to ClusterIP :3000",
    ],
  },
  {
    id: "client",
    mode: "runtime",
    nodeKind: "k8s-deployment",
    hpaSummary: "min 2 · HPA 2–5",
    pods: [
      { name: "web-1", image: "ascend-web", port: ":3001", resources: "150m · 192Mi" },
      { name: "web-2", image: "ascend-web", port: ":3001", resources: "150m · 192Mi" },
    ],
    plainName: "Next.js Web",
    plainTagline: "2 SSR containers",
    plainSummary:
      "2 running Next.js containers inside GKE that serve the web app and check login cookies at the edge (proxy.ts) before rendering protected pages.",
    plainWhy:
      "Running 2 minimum pods ensures the website stays online during rolling deploys or pod restarts.",
    label: "Next.js 16 Pods",
    shortLabel: "Next.js Web",
    subtitle: "App Router · proxy.ts · SWR",
    layer: "Frontend Pods",
    x: 615,
    y: 122,
    accent: "#E4E4E7",
    glow: "rgba(228, 228, 231, 0.26)",
    badgeText: "2 Pods",
    repoPath: "apps/web/proxy.ts",
    whyThisTool:
      "Next.js 16 App Router handles SSR, edge cookie route protection (proxy.ts), SWR server-state caching, and Zustand UI state — keeping all domain logic and background workers cleanly inside NestJS.",
    tradeOff:
      "HttpOnly cookie auth requires origin-locked CORS (credentials: true) between app.ascendup.online and api.ascendup.online.",
    keySpecs: [
      "Edge cookie check in apps/web/proxy.ts",
      "SWR revalidation + Zod form validation",
      "2–5 HPA pods (150m–500m CPU, 192Mi–384Mi RAM)",
    ],
  },
  {
    id: "nestjs",
    mode: "runtime",
    nodeKind: "k8s-deployment",
    hpaSummary: "min 3 · HPA 3–8",
    pods: [
      { name: "api-1", image: "ascend-backend", port: ":3000", resources: "250m · 256Mi" },
      { name: "api-2", image: "ascend-backend", port: ":3000", resources: "250m · 256Mi" },
      { name: "api-3", image: "ascend-backend", port: ":3000", resources: "250m · 256Mi" },
    ],
    plainName: "NestJS API",
    plainTagline: "3 HA backend containers",
    plainSummary:
      "3 NestJS containers running in parallel inside GKE. They validate inputs, verify JWTs, hash passwords, run timezone cron jobs, and coordinate all four databases.",
    plainWhy:
      "Persistent pods run scheduled jobs, BullMQ workers, and live WebSockets reliably without serverless cold starts.",
    label: "NestJS 11 API",
    shortLabel: "NestJS Backend",
    subtitle: "Auth · Habits · XP · Workers",
    layer: "Backend Pods",
    x: 640,
    y: 300,
    accent: "#FB7185",
    glow: "rgba(251, 113, 133, 0.34)",
    badgeText: "3 Pods",
    repoPath: "apps/backend/src/modules/",
    whyThisTool:
      "Hosts persistent Socket.IO gateways, @nestjs/schedule timezone cron jobs, and long-running BullMQ worker processors inside one strongly-typed DI container.",
    tradeOff:
      "Requires graceful pod shutdown hooks (onModuleDestroy) to flush pending Redis XP batches before Kubernetes replaces a pod.",
    keySpecs: [
      "Global ValidationPipe (whitelist + forbidNonWhitelisted)",
      "AuthGuard JWT verification + Passport OAuth",
      "3–8 HPA pods (250m–500m CPU, 256Mi–512Mi RAM)",
    ],
  },
  {
    id: "postgres",
    mode: "runtime",
    nodeKind: "managed-db",
    plainName: "PostgreSQL",
    plainTagline: "Users, habits, tasks & levels",
    plainSummary:
      "The primary relational database. It stores user accounts, habits, daily tasks, and XP levels with strict rules to prevent duplicate or broken records.",
    plainWhy:
      "Ideal for structured core data where accuracy matters — like ensuring a habit can't award double XP or deleting linked tasks cleanly.",
    label: "PostgreSQL + Prisma",
    shortLabel: "PostgreSQL",
    subtitle: "Users · Habits · 31-Day Bitmask",
    layer: "SQL Database",
    x: 1114,
    y: 122,
    accent: "#60A5FA",
    glow: "rgba(96, 165, 250, 0.36)",
    badgeText: "Primary DB",
    repoPath: "packages/core/db/prisma/schema.prisma",
    whyThisTool:
      "Enforces relational FKs, cascading deletes, composite uniqueness @@unique([habitId, scheduledDate]), and O(1) monthly heatmaps via a 31-char SQL overlay() bitmask.",
    tradeOff:
      "Append-only history logs and disposable alerts are offloaded to DynamoDB and MongoDB to prevent index bloat and VACUUM overhead.",
    keySpecs: [
      "9 Prisma models shared via @day-mark/db",
      "@@unique([habitId, scheduledDate]) idempotency guard",
      "31-char HabitMonthlyLogs.history flipped via raw SQL overlay()",
    ],
  },
  {
    id: "upstash",
    mode: "runtime",
    nodeKind: "managed-db",
    plainName: "Upstash Redis",
    plainTagline: "User info, sessions & XP cache",
    plainSummary:
      "Serverless cloud cache (TLS) that stores core user profiles (24h), refresh tokens (7d), task/habit metadata (48h), live XP buffers, and distributed Redlock locks.",
    plainWhy:
      "Serves user profiles, auth checks, and XP writes in ~3ms without hitting PostgreSQL on every single request.",
    label: "Upstash Redis",
    shortLabel: "Upstash Redis",
    subtitle: "Profiles · Sessions · XP · Redlock",
    layer: "Managed Cache",
    x: 1114,
    y: 258,
    accent: "#2DD4BF",
    glow: "rgba(45, 212, 191, 0.36)",
    badgeText: "Cloud Cache",
    repoPath: "apps/backend/src/common/redis-cache/redis-cache.service.ts",
    whyThisTool:
      "Five dedicated NestJS cache repositories sit over Upstash TLS Redis (ioredis + Redlock) for sub-5ms user profiles, refresh rotation, habit/task metadata, and write-behind XP batching.",
    tradeOff:
      "Serverless pay-per-request pricing is ideal for short cache ops, so blocking BullMQ queues are isolated to the in-cluster Queue Redis pod instead.",
    keySpecs: [
      "user:{id}:profile (Hash · 24h TTL) & refresh:{id} (7d TTL)",
      "task:metadata:{id} (48h), tasks:cache:{id} & user:{id}:habit:{id}:meta",
      "user:gamification:{id} + users:dirty Set + Redlock 10s Postgres flush",
    ],
  },
  {
    id: "redis",
    mode: "runtime",
    nodeKind: "k8s-deployment",
    hpaSummary: "1 Pod · 10Gi PVC",
    pods: [
      {
        name: "redis-0",
        image: "redis:7-alpine",
        port: ":6379",
        resources: "100m · 128Mi",
        pvc: "10Gi PVC",
      },
    ],
    plainName: "Queue Redis",
    plainTagline: "BullMQ queues & WS Pub/Sub",
    plainSummary:
      "Dedicated in-cluster Redis pod with a 10Gi persistent disk that runs BullMQ background job queues and synchronizes Socket.IO events across all 3 API pods.",
    plainWhy:
      "Keeps heavy background workers and real-time broadcasts fast inside GKE without incurring serverless per-command charges on Upstash.",
    label: "Queue Redis (BullMQ)",
    shortLabel: "Queue Redis",
    subtitle: "BullMQ Queues · Socket Pub/Sub",
    layer: "In-Cluster Queue",
    x: 685,
    y: 495,
    accent: "#F87171",
    glow: "rgba(248, 113, 113, 0.36)",
    badgeText: "1 Pod + PVC",
    repoPath: "apps/backend/src/common/local-redis/local-redis.module.ts",
    whyThisTool:
      "BullMQ workers use persistent blocking connections (BRPOPLPUSH) and high-frequency polling — running a dedicated in-cluster Redis pod with a 10Gi Retain PVC eliminates serverless request spikes.",
    tradeOff:
      "Requires managing a Kubernetes StatefulSet/PVC, which is offset by zero per-request queue billing and sub-millisecond in-cluster latency.",
    keySpecs: [
      "BullMQ queues: habits-queue & notification-queue",
      "Socket.IO RedisIOAdapter Pub/Sub across 3–8 NestJS pods",
      "10Gi GCP standard-rwo Persistent Disk (Retain policy)",
    ],
  },
  {
    id: "dynamodb",
    mode: "runtime",
    nodeKind: "managed-db",
    plainName: "AWS DynamoDB",
    plainTagline: "Permanent daily history & logs",
    plainSummary:
      "A high-speed AWS database that stores permanent records of every completed task, habit check-in, and daily reflection over time.",
    plainWhy:
      "Keeps years of historical logs fast to query in single-digit milliseconds without slowing down PostgreSQL.",
    label: "AWS DynamoDB",
    shortLabel: "AWS DynamoDB",
    subtitle: "Day-Mark-Logs · GSI1 & GSI2",
    layer: "NoSQL Ledger",
    x: 1114,
    y: 394,
    accent: "#A78BFA",
    glow: "rgba(167, 139, 250, 0.36)",
    badgeText: "History DB",
    repoPath: "apps/backend/src/common/dynamo-db/",
    whyThisTool:
      "Stores immutable task snapshots (TASKLOG#), habit trails (LOG#HABIT#), and daily reflections (REFLECTION#YYYY-MM-DD) in one table keyed by PK: USER#{id}.",
    tradeOff:
      "Async writes keep user clicks fast, though a transient AWS hiccup can briefly delay historical audit visibility.",
    keySpecs: [
      "Table: Day-Mark-Logs (PK: USER#{userId})",
      "SK Prefixes: TASKLOG#, LOG#HABIT#, REFLECTION#YYYY-MM-DD",
      "GSI1 (Goals velocity) & GSI2 (Habit heatmaps)",
    ],
  },
  {
    id: "mongodb",
    mode: "runtime",
    nodeKind: "managed-db",
    plainName: "MongoDB",
    plainTagline: "Notifications & journal notes",
    plainSummary:
      "Stores flexible daily reflection metadata and temporary in-app notifications that delete immediately when dismissed or auto-expire after 30 days.",
    plainWhy:
      "Great for flexible note fields and frequent notification inserts/deletes that would create extra cleanup work in PostgreSQL.",
    label: "MongoDB",
    shortLabel: "MongoDB",
    subtitle: "Notifications (30d TTL) · Logs",
    layer: "Document DB",
    x: 1114,
    y: 530,
    accent: "#34D399",
    glow: "rgba(52, 211, 153, 0.36)",
    badgeText: "Document DB",
    repoPath: "apps/backend/src/modules/notification/schemas/",
    whyThisTool:
      "Handles bursty notification writes + instant ACK deletes and auto-expires old alerts via a 30-day TTL index (2,592,000s), avoiding PostgreSQL VACUUM churn.",
    tradeOff:
      "Adds an extra database engine to operate, justified by the radically different write/delete lifecycle of ephemeral notifications.",
    keySpecs: [
      "Collection: appnotifications (Mongoose Document)",
      "Auto-expiry TTL index: expires: 2592000 (30 days)",
      "Scoped deleteOne({ _id, userId }) on ACK_NOTIFICATION",
    ],
  },
  {
    id: "socketio",
    mode: "runtime",
    nodeKind: "k8s-gateway",
    plainName: "Socket.IO",
    plainTagline: "Live browser push",
    plainSummary:
      "Maintains a live connection with the user's browser to push XP gains, rank-up badges, and alerts immediately without a page reload.",
    plainWhy:
      "Gives users instant feedback the moment a background job finishes, synchronized across all 3 NestJS pods.",
    label: "Socket.IO Gateway",
    shortLabel: "Socket.IO",
    subtitle: "Redis Pub/Sub · Live Rooms",
    layer: "WebSockets",
    x: 375,
    y: 495,
    accent: "#FACC15",
    glow: "rgba(250, 204, 21, 0.36)",
    badgeText: "Real-Time",
    repoPath: "apps/backend/src/modules/notification/gateways/",
    whyThisTool:
      "Places each user into a private room (user:{id}) synchronized across all Kubernetes server replicas using RedisIOAdapter Pub/Sub.",
    tradeOff:
      "Only reaches open browser tabs, so Ascend pairs it with VAPID Web Push for offline reminders.",
    keySpecs: [
      "Room isolation: client.join(`user:${userId}`)",
      "Multi-pod fan-out via Queue Redis Pub/Sub adapter",
      "Events: NEW_NOTIFICATION (push) & ACK_NOTIFICATION (sweep)",
    ],
  },
];

export const RUNTIME_EDGES: GraphEdgeDef[] = [
  {
    id: "browser-ingress",
    mode: "runtime",
    from: "browser",
    to: "ingress",
    label: "HTTPS / Cookies",
    plainLabel: "HTTPS Request",
    protocol: "HTTPS",
  },
  {
    id: "ingress-client",
    mode: "runtime",
    from: "ingress",
    to: "client",
    label: "UI :3001",
    plainLabel: "Web SSR",
    protocol: "HTTP/1.1",
    curveOffset: -22,
  },
  {
    id: "ingress-nestjs",
    mode: "runtime",
    from: "ingress",
    to: "nestjs",
    label: "API :3000",
    plainLabel: "API Traffic",
    protocol: "HTTP/1.1",
  },
  {
    id: "nestjs-postgres",
    mode: "runtime",
    from: "nestjs",
    to: "postgres",
    label: "Prisma SQL",
    plainLabel: "Core Data",
    protocol: "SQL",
    curveOffset: -24,
  },
  {
    id: "nestjs-upstash",
    mode: "runtime",
    from: "nestjs",
    to: "upstash",
    label: "TLS Cache / Redlock",
    plainLabel: "Cloud Cache",
    protocol: "REDIS",
    curveOffset: -6,
  },
  {
    id: "nestjs-redis",
    mode: "runtime",
    from: "nestjs",
    to: "redis",
    label: "BullMQ Enqueue",
    plainLabel: "Job Queue",
    protocol: "REDIS",
    curveOffset: 0,
  },
  {
    id: "nestjs-dynamodb",
    mode: "runtime",
    from: "nestjs",
    to: "dynamodb",
    label: "Audit Log",
    plainLabel: "History Write",
    protocol: "HTTPS",
    curveOffset: 10,
  },
  {
    id: "nestjs-mongodb",
    mode: "runtime",
    from: "nestjs",
    to: "mongodb",
    label: "BSON Doc",
    plainLabel: "Alert / Note",
    protocol: "TCP",
    curveOffset: 24,
  },
  {
    id: "upstash-postgres",
    mode: "runtime",
    from: "upstash",
    to: "postgres",
    label: "10s Redlock Flush",
    plainLabel: "Batch Save",
    protocol: "TX",
    curveOffset: -22,
  },
  {
    id: "redis-socketio",
    mode: "runtime",
    from: "redis",
    to: "socketio",
    label: "Redis Pub/Sub",
    plainLabel: "Pod Sync",
    protocol: "PUB/SUB",
    curveOffset: 0,
  },
  {
    id: "nestjs-socketio",
    mode: "runtime",
    from: "nestjs",
    to: "socketio",
    label: "Event Emit",
    plainLabel: "Notify",
    protocol: "INTERNAL",
    curveOffset: -18,
  },
  {
    id: "socketio-mongodb",
    mode: "runtime",
    from: "socketio",
    to: "mongodb",
    label: "ACK Delete",
    plainLabel: "Clear Alert",
    protocol: "DELETE",
    curveOffset: 54,
  },
  {
    id: "socketio-browser",
    mode: "runtime",
    from: "socketio",
    to: "browser",
    label: "WSS Push",
    plainLabel: "Live Update",
    protocol: "WS",
    curveOffset: 34,
  },
];

// ============================================================================
// SPACIOUS CI/CD & CLOUD DEPLOYMENT TOPOLOGY (1200 x 620 SVG Space)
// ============================================================================

export const CICD_NODES: GraphNodeDef[] = [
  {
    id: "github",
    mode: "cicd",
    nodeKind: "pipeline",
    plainName: "GitHub",
    plainTagline: "Source & Git push",
    plainSummary:
      "Stores the frontend, backend, database schema, and deployment files in one repository so every update stays aligned.",
    plainWhy:
      "Keeps frontend, backend, and database changes in sync under a single commit version.",
    label: "GitHub (main)",
    shortLabel: "GitHub",
    subtitle: "Desktoo/Ascend Monorepo",
    layer: "Source Control",
    x: 155,
    y: 170,
    accent: "#E4E4E7",
    glow: "rgba(228, 228, 231, 0.28)",
    badgeText: "Source",
    repoPath: ".github/workflows/deploy.yml",
    whyThisTool:
      "Turborepo monorepo versions apps/web, apps/backend, @day-mark/db Prisma schema, and helm/ charts atomically under one Git SHA.",
    tradeOff:
      "Needs smart path filtering so editing docs or UI doesn't waste time rebuilding backend containers.",
    keySpecs: [
      "Branch trigger: push to main (paths-ignore docs/**)",
      "Concurrency group: deploy-main (prevents race deploys)",
      "Single commit SHA tags images & Helm release",
    ],
  },
  {
    id: "actions",
    mode: "cicd",
    nodeKind: "pipeline",
    plainName: "GitHub Actions",
    plainTagline: "Docker build & OIDC",
    plainSummary:
      "Checks which parts of the codebase changed, builds only those container images in parallel, and connects securely to Google Cloud.",
    plainWhy:
      "Cuts deployment time in half and removes manual build steps.",
    label: "GitHub Actions",
    shortLabel: "GitHub Actions",
    subtitle: "Path Filter · Docker Buildx",
    layer: "CI Pipeline",
    x: 450,
    y: 170,
    accent: "#38BDF8",
    glow: "rgba(56, 189, 248, 0.34)",
    badgeText: "CI Build",
    repoPath: ".github/workflows/deploy.yml",
    whyThisTool:
      "dorny/paths-filter detects changed services in ~3s, runs parallel Docker Buildx with GHA layer cache, and authenticates via keyless GCP OIDC.",
    tradeOff:
      "Multi-stage Dockerfiles must keep dependency layers lean to fit GHA cache limits.",
    keySpecs: [
      "detect-changes -> parallel build-backend & build-web",
      "google-github-actions/auth@v2 (keyless OIDC)",
      "Scoped GHA layer cache for pnpm + Prisma",
    ],
  },
  {
    id: "dockerhub",
    mode: "cicd",
    nodeKind: "pipeline",
    plainName: "Docker Hub",
    plainTagline: "Container images",
    plainSummary:
      "Stores version-tagged container snapshots of the frontend and backend so the cloud can deploy or roll back cleanly.",
    plainWhy:
      "Ensures the exact tested build runs in production and makes rollbacks fast.",
    label: "Docker Registry",
    shortLabel: "Docker Hub",
    subtitle: "desktooondocker/ascend-*",
    layer: "Image Registry",
    x: 745,
    y: 170,
    accent: "#60A5FA",
    glow: "rgba(96, 165, 250, 0.34)",
    badgeText: "Registry",
    repoPath: "apps/backend/Dockerfile",
    whyThisTool:
      "Stores immutable SHA-tagged multi-stage OCI images (ascend-backend:{sha} & ascend-web:{sha}) alongside :latest.",
    tradeOff:
      "pullPolicy: Always checks registry manifests on every restart to ensure freshness.",
    keySpecs: [
      "desktooondocker/ascend-backend:${github.sha}",
      "desktooondocker/ascend-web:${github.sha}",
      "Build-time env NEXT_PUBLIC_API_URL injection",
    ],
  },
  {
    id: "argocd",
    mode: "cicd",
    nodeKind: "pipeline",
    plainName: "ArgoCD",
    plainTagline: "GitOps cluster sync",
    plainSummary:
      "Watches GitHub and keeps the live Google Cloud cluster matched to the deployment configuration stored in Git.",
    plainWhy:
      "Eliminates manual server changes and creates a full Git audit trail for every release.",
    label: "ArgoCD GitOps",
    shortLabel: "ArgoCD",
    subtitle: "Declarative Drift Sync",
    layer: "GitOps",
    x: 1040,
    y: 170,
    accent: "#FB923C",
    glow: "rgba(251, 146, 60, 0.36)",
    badgeText: "GitOps",
    repoPath: "argocd/application.yaml",
    whyThisTool:
      "Reconciles helm/ (values-prod.yaml) against GKE prod namespace while RespectIgnoreDifferences lets HPA scale replicas freely.",
    tradeOff:
      "Ignoring container image pointers requires coordination between Helm CLI upgrades and ArgoCD.",
    keySpecs: [
      "Application: ascend (argocd -> prod)",
      "valueFiles: [values-prod.yaml]",
      "ignoreDifferences for HPA /spec/replicas",
    ],
  },
  {
    id: "helm",
    mode: "cicd",
    nodeKind: "k8s-job",
    hpaSummary: "Migrate Job",
    pods: [
      {
        name: "db-migrate-job",
        image: "ascend-backend",
        resources: "prisma migrate",
        kind: "job",
      },
    ],
    plainName: "Helm Release",
    plainTagline: "Upgrades app & schema",
    plainSummary:
      "Applies the release as one coordinated update and runs a one-time database migration job before new servers take traffic.",
    plainWhy:
      "Prevents multiple servers from running duplicate migrations and supports 1-command rollbacks.",
    label: "Helm + Migrate Job",
    shortLabel: "Helm Release",
    subtitle: "ascend-prod · Prisma Hook",
    layer: "Orchestration",
    x: 1040,
    y: 445,
    accent: "#A78BFA",
    glow: "rgba(167, 139, 250, 0.36)",
    badgeText: "Release",
    repoPath: "helm/templates/job.yaml",
    whyThisTool:
      "Bundles Deployments, HPAs, Services, 10Gi Redis PVC, and a post-upgrade Prisma migration Job (backoffLimit: 3) into one release.",
    tradeOff:
      "Migrations must remain backward-compatible while older pods finish serving in-flight requests.",
    keySpecs: [
      "helm upgrade --install ascend-prod ./helm -f values-prod.yaml",
      "Hook Job: ascend-prod-db-migrate",
      "10Gi GCP Persistent Disk for BullMQ Redis",
    ],
  },
  {
    id: "sealedsecrets",
    mode: "cicd",
    nodeKind: "k8s-gateway",
    plainName: "SealedSecrets",
    plainTagline: "18 encrypted secrets",
    plainSummary:
      "Encrypts all 18 production secrets so they can be stored safely in Git and decrypted only inside the Google Cloud cluster.",
    plainWhy:
      "Prevents plain-text credentials from ever being exposed in code repositories.",
    label: "Bitnami SealedSecrets",
    shortLabel: "SealedSecrets",
    subtitle: "18 RSA-Encrypted Keys",
    layer: "Secrets",
    x: 745,
    y: 445,
    accent: "#34D399",
    glow: "rgba(52, 211, 153, 0.36)",
    badgeText: "Security",
    repoPath: "helm/templates/sealed-secrets.yaml",
    whyThisTool:
      "Uses kubeseal asymmetric encryption so DATABASE_URL, JWT secrets, BCRYPT_SECRET_PEPPER, AWS IAM, and VAPID keys only decrypt inside GKE.",
    tradeOff:
      "Key rotation requires re-sealing manifests against the cluster's public cert.",
    keySpecs: [
      "Kind: bitnami.com/v1alpha1 SealedSecret",
      "Unsealed in-cluster to Secret/ascend-prod-secrets",
      "Protects DB, Redis, AWS, JWT, OAuth & VAPID keys",
    ],
  },
  {
    id: "gke",
    mode: "cicd",
    nodeKind: "k8s-deployment",
    hpaSummary: "6 min pods",
    pods: [
      { name: "api-1", image: "ascend-backend", port: ":3000" },
      { name: "api-2", image: "ascend-backend", port: ":3000" },
      { name: "api-3", image: "ascend-backend", port: ":3000" },
      { name: "web-1", image: "ascend-web", port: ":3001" },
      { name: "web-2", image: "ascend-web", port: ":3001" },
      { name: "redis-0", image: "redis:7-alpine", port: ":6379", pvc: "10G" },
    ],
    plainName: "GKE Prod Pods",
    plainTagline: "Auto-scaling cloud servers",
    plainSummary:
      "Runs multiple copies of Ascend on Google Cloud Kubernetes (GKE Autopilot) and scales up automatically during traffic spikes.",
    plainWhy:
      "Keeps the app online if a server fails and saves cloud cost when traffic is low.",
    label: "GKE Autopilot Pods",
    shortLabel: "GKE Autopilot",
    subtitle: "3–8 API · 2–5 Web · Redis PVC",
    layer: "Cloud Compute",
    x: 450,
    y: 445,
    accent: "#FB7185",
    glow: "rgba(251, 113, 133, 0.36)",
    badgeText: "GKE Cloud",
    repoPath: "helm/values-prod.yaml",
    whyThisTool:
      "Autopilot manages underlying nodes automatically while HPA scales NestJS (3->8 @ 70% CPU) and Next.js (2->5) with a Retained 10Gi disk for Redis.",
    tradeOff:
      "Pod CPU/RAM requests directly govern Autopilot billing and scaling thresholds.",
    keySpecs: [
      "Backend HPA: 3–8 pods (250m–500m CPU, 256Mi–512Mi)",
      "Web HPA: 2–5 pods (150m–500m CPU, 192Mi–384Mi)",
      "BullMQ Redis: 10Gi ext4 GCP Persistent Disk",
    ],
  },
  {
    id: "gke_ingress",
    mode: "cicd",
    nodeKind: "k8s-gateway",
    plainName: "Load Balancer",
    plainTagline: "Zero-downtime HTTPS",
    plainSummary:
      "Shifts users at app.ascendup.online over to the new release only after every health check passes — with zero downtime.",
    plainWhy:
      "Allows frequent updates throughout the day without interrupting active users.",
    label: "Public Ingress LB",
    shortLabel: "Ingress LB",
    subtitle: "app & api.ascendup.online",
    layer: "Public Edge",
    x: 155,
    y: 445,
    accent: "#FACC15",
    glow: "rgba(250, 204, 21, 0.36)",
    badgeText: "Live Edge",
    repoPath: "helm/templates/ingress.yaml",
    whyThisTool:
      "Global HTTP(S) Load Balancer with TLS termination (ascend-prod-tls-cert) and zero-downtime rolling endpoint cutovers.",
    tradeOff:
      "Health checks (/health) must stay fast so rolling restarts never stall.",
    keySpecs: [
      "https://ascendup.online -> ascend-prod-web:3001",
      "https://app.ascendup.online -> ascend-prod-web:3001",
      "https://api.ascendup.online -> ascend-prod-backend:3000",
    ],
  },
];

export const CICD_EDGES: GraphEdgeDef[] = [
  {
    id: "github-actions",
    mode: "cicd",
    from: "github",
    to: "actions",
    label: "Webhook",
    plainLabel: "Triggers Build",
    protocol: "GIT",
  },
  {
    id: "actions-dockerhub",
    mode: "cicd",
    from: "actions",
    to: "dockerhub",
    label: "Buildx Push",
    plainLabel: "Uploads Images",
    protocol: "OCI",
  },
  {
    id: "dockerhub-argocd",
    mode: "cicd",
    from: "dockerhub",
    to: "argocd",
    label: "New SHA",
    plainLabel: "Ready to Sync",
    protocol: "GITOPS",
  },
  {
    id: "argocd-helm",
    mode: "cicd",
    from: "argocd",
    to: "helm",
    label: "helm upgrade",
    plainLabel: "Starts Release",
    protocol: "SYNC",
  },
  {
    id: "helm-sealedsecrets",
    mode: "cicd",
    from: "helm",
    to: "sealedsecrets",
    label: "Unseal Keys",
    plainLabel: "Decrypts Keys",
    protocol: "KMS",
  },
  {
    id: "sealedsecrets-gke",
    mode: "cicd",
    from: "sealedsecrets",
    to: "gke",
    label: "Mount Env",
    plainLabel: "Updates Servers",
    protocol: "K8S",
  },
  {
    id: "gke-ingress",
    mode: "cicd",
    from: "gke",
    to: "gke_ingress",
    label: "Cutover",
    plainLabel: "Goes Live",
    protocol: "HTTPS",
  },
];

export const ALL_NODES: Record<AnyNodeId, GraphNodeDef> = [
  ...RUNTIME_NODES,
  ...CICD_NODES,
].reduce(
  (acc, node) => {
    acc[node.id] = node;
    return acc;
  },
  {} as Record<AnyNodeId, GraphNodeDef>,
);

// ============================================================================
// POLYGLOT STORAGE MATRIX
// ============================================================================

export const STORAGE_MATRIX = [
  {
    engine: "PostgreSQL + Prisma",
    plainName: "PostgreSQL (Core Data)",
    role: "Accounts, active habits, tasks & levels",
    accent: "#60A5FA",
    pattern: "Strict accuracy, zero duplicates, instant 31-day calendar heatmap",
    lifecycle: "Permanent primary database",
  },
  {
    engine: "AWS DynamoDB",
    plainName: "AWS DynamoDB (History Logs)",
    role: "Completed tasks & daily reflections",
    accent: "#A78BFA",
    pattern: "Write-once historical logs that stay fast even after years of data",
    lifecycle: "Permanent append-only history",
  },
  {
    engine: "MongoDB + Mongoose",
    plainName: "MongoDB (Notifications & Notes)",
    role: "Flexible journals & live notifications",
    accent: "#34D399",
    pattern: "High-churn notifications deleted immediately on dismiss (or auto-deleted in 30 days)",
    lifecycle: "Auto-expires after 30 days",
  },
  {
    engine: "Upstash Redis (TLS)",
    plainName: "Upstash Redis (Cloud Cache)",
    role: "User profiles (24h), refresh tokens (7d), task/habit meta (48h) & XP buffer",
    accent: "#2DD4BF",
    pattern: "5 typed NestJS cache repos + Redlock distributed locks (~3ms reads)",
    lifecycle: "TTL-scoped cache (24h–7d) + 10s XP flush",
  },
  {
    engine: "Queue Redis + BullMQ",
    plainName: "Queue Redis (GKE Pod · 10Gi PVC)",
    role: "habits-queue, notification-queue & multi-pod Socket.IO Pub/Sub",
    accent: "#F87171",
    pattern: "In-cluster blocking queues isolated from Upstash per-request billing",
    lifecycle: "Persistent 10Gi job streams",
  },
];

// ============================================================================
// AUTHENTIC SCHEMAS & MANIFESTS EXTRACTED FROM Desktoo/ascend
// ============================================================================

export interface RealSchemaDoc {
  id: string;
  title: string;
  filePath: string;
  language: string;
  badge: string;
  summary: string;
  content: string;
}

export const REAL_SCHEMAS: RealSchemaDoc[] = [
  {
    id: "prisma",
    title: "Prisma Schema",
    filePath: "packages/core/db/prisma/schema.prisma",
    language: "prisma",
    badge: "PostgreSQL",
    summary:
      "Real database schema from Desktoo/ascend defining Users, Accounts, Goals, Habits, 31-char HabitMonthlyLogs, Tasks, and XP transactions.",
    content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id                     String                  @id @default(uuid())
  userName               String                  @unique
  email                  String                  @unique
  avatar_url             String?
  timeZone               String                  @default("UTC")
  dayStartTime           String                  @default("09:00")
  isOnboarded            Boolean                 @default(false)

  accounts               Account[]
  rank                   String                  @default("Beginner")
  level                  Int                     @default(1)
  xp                     Int                     @default(0)

  habits                 Habit[]
  goals                  Goal[]
  tasks                  Task[]
  xpTransactions         XpTransaction[]
  habitMonthlyLogs       HabitMonthlyLogs[]

  theme                  ThemePreference         @default(GENERAL)
  isAppPaused            Boolean                 @default(false)
  notificationPreference NotificationPreference?
  pushSubscriptions      PushSubscription[]

  lastActive             DateTime                @default(now())
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt
}

model Account {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String   // "credentials" | "oauth"
  provider          Provider // GOOGLE | GITHUB | CREDENTIALS
  providerAccountId String
  password          String?  // bcrypt(password + BCRYPT_SECRET_PEPPER, 10)
}

model Habit {
  id             String             @id @default(uuid())
  userId         String
  title          String
  description    String
  tag            String
  daysOfWeek     String[]
  isActive       Boolean            @default(true)

  taskTitle      String
  taskDueTime    String
  taskPriority   PriorityLevel      @default(MEDIUM)

  currentStreak  Int                @default(0)
  longestStreak  Int                @default(0)
  stabilityScore Int                @default(0)
  createdAt      DateTime           @default(now())

  user           User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks          Task[]
  logs           HabitMonthlyLogs[]

  @@index([userId])
  @@index([id, userId])
}

model HabitMonthlyLogs {
  id        String @id @default(uuid())
  userId    String
  habitId   String
  yearMonth String // Format: "2026-11"
  // 31 'S' (Skipped) chars; flipped to 'D' via SQL overlay() for O(1) heatmaps
  history   String @default("SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS")

  habit     Habit  @relation(fields: [habitId], references: [id], onDelete: Cascade)
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([habitId, yearMonth])
  @@index([yearMonth])
}

model Task {
  id            String        @id @default(uuid())
  userId        String
  goalId        String?
  habitId       String?
  type          TaskType      @default(Standard)
  title         String
  status        TaskStatus    @default(PENDING)
  priority      PriorityLevel @default(MEDIUM)
  scheduledDate String        @default("")
  dueTime       DateTime?     @db.Timestamptz()

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal          Goal?         @relation(fields: [goalId], references: [id], onDelete: Cascade)
  habit         Habit?        @relation(fields: [habitId], references: [id], onDelete: Cascade)

  createdAt     DateTime      @db.Timestamptz() @default(now())

  @@index([userId, scheduledDate])
  @@unique([habitId, scheduledDate])
}

model XpTransaction {
  id        String   @id @default(uuid())
  userId    String
  amount    Int
  reason    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}`,
  },
  {
    id: "dynamodb",
    title: "DynamoDB Ledger",
    filePath: "apps/backend/src/modules/tasks/task-logs/task-logs.service.ts",
    language: "typescript",
    badge: "AWS DynamoDB",
    summary:
      "Single-table DynamoDB schema ('Day-Mark-Logs') storing immutable task completions, habit logs, and daily reflections.",
    content: `// Table: "Day-Mark-Logs"
// PK: USER#<userId>
// SK: TASKLOG#... | LOG#HABIT#... | REFLECTION#YYYY-MM-DD
// GSI1 (Goals velocity) | GSI2 (Habit heatmaps)

export interface TaskLogItem {
  PK: \`USER#\${string}\`;
  SK: \`TASKLOG#\${string}#\${string}\`;
  taskTitle: string;
  type: 'Standard' | 'HabitTask' | 'GoalTask';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completedDate: string;
  completionStatus: 'ON_TIME' | 'LATE';
  GSI1_PK?: \`GOAL#\${string}\`;
  GSI2_PK?: \`HABIT#\${string}\`;
}

export interface SelfReflectionItem {
  PK: \`USER#\${string}\`;
  SK: \`REFLECTION#\${string}\`;
  id: string;
  userId: string;
  reflectionText: string;
  submissionDate: string; // Logical Date (respects dayStartTime)
  submittedAt: string;
  timeZone: string;
}`,
  },
  {
    id: "mongodb",
    title: "MongoDB & Live WS",
    filePath: "apps/backend/src/modules/notification/schemas/notification.schema.ts",
    language: "typescript",
    badge: "MongoDB + WS",
    summary:
      "Auto-expiring 30-day MongoDB notification inbox paired with Socket.IO instant ACK deletion.",
    content: `@Schema({ timestamps: true })
export class AppNotification extends Document {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  type!: string; // 'RANK_UP' | 'REMINDER' | 'SYSTEM'

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: Object, default: {} })
  data!: Record<string, any>;

  // 30-day TTL index: MongoDB automatically cleans up expired alerts
  @Prop({ type: Date, default: Date.now, expires: 2592000 })
  createdAt!: Date;
}

// NotificationGateway -> Instant delete when user dismisses alert
@SubscribeMessage('ACK_NOTIFICATION')
async handleAcknowledgment(client: Socket, payload: { notificationId: string }) {
  const userId = client.handshake.query.userId as string;
  await this.notificationModel.deleteOne({ _id: payload.notificationId, userId });
}`,
  },
  {
    id: "upstash",
    title: "Upstash Redis Cache",
    filePath: "apps/backend/src/common/redis-cache/redis-cache.service.ts",
    language: "typescript",
    badge: "Upstash TLS",
    summary:
      "5 dedicated NestJS cache repositories over managed Upstash Redis (TLS + Redlock) caching user profiles, refresh tokens, task/habit metadata, and XP buffers.",
    content: `// Connected via UPSTASH_REDIS_URL (ioredis TLS + Redlock)
// 1. UserCacheRepository (apps/backend/src/modules/user/repos/user-cache.repo.ts)
//    Key: user:{userId}:profile   | Type: Hash | TTL: 86400s (24h)
//    Fields: id, email, userName, avatarUrl, timeZone, dayStartTime, isOnboarded, hasPassword

// 2. AuthCacheRepository (apps/backend/src/modules/auth/repos/auth-cache.repo.ts)
//    Key: refresh:{userId}        | Type: String | TTL: 604800s (7d)

// 3. TasksCacheRepository (apps/backend/src/modules/tasks/repos/task-cache.repo.ts)
//    Key: task:metadata:{taskId}  | Type: JSON String | TTL: 172800s (48h)
//         { type: 'Standard' | 'HabitTask' | 'GoalTask', parentId?: string }
//    Key: tasks:cache:{userId}    | Invalidated via DEL on task/goal/habit writes

// 4. HabitsCacheRepository (apps/backend/src/modules/habits/repos/habit-cache.repo.ts)
//    Key: user:{userId}:habit:{habitId}:meta            | Hash: currentStreak, longestStreak, stabilityScore
//    Key: user:{userId}:habit:{habitId}:status:{date}   | String: PENDING | DONE (TTL: 172800s / 48h)

// 5. GamificationCacheRepository (apps/backend/src/common/gamification/repos/gamification-cache.repo.ts)
//    Key: user:gamification:{userId} | Hash: level, xp, rank (HINCRBY / HSET)
//    Key: users:dirty                | Set: userIds awaiting 10s Redlock flush to PostgreSQL`,
  },
  {
    id: "gitops",
    title: "GKE, Helm & ArgoCD",
    filePath: "argocd/application.yaml + helm/values-prod.yaml",
    language: "yaml",
    badge: "Kubernetes",
    summary:
      "Real Kubernetes GitOps configuration: ArgoCD Application, Helm autoscaling values, and Bitnami SealedSecrets.",
    content: `# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
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
---
# helm/values-prod.yaml
backend:
  replicaCount: 3
  autoscaling: { enabled: true, minReplicas: 3, maxReplicas: 8, targetCPU: 70% }
web:
  replicaCount: 2
  autoscaling: { enabled: true, minReplicas: 2, maxReplicas: 5, targetCPU: 75% }
persistence:
  bullmq: { capacity: 10Gi, storageClassName: standard-rwo, reclaimPolicy: Retain }
---
# helm/templates/sealed-secrets.yaml (18 RSA-encrypted production secrets)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: ascend-prod-secrets
  namespace: prod`,
  },
];

// ============================================================================
// C4 LEVEL 3 — NESTJS INTERNAL COMPONENTS (From Desktoo/ascend/docs/ARCHITECTURE.md)
// ============================================================================

export type C3IconKey =
  | "shield"
  | "key"
  | "route"
  | "radio"
  | "lock"
  | "list"
  | "flame"
  | "trophy"
  | "book"
  | "clock"
  | "layers"
  | "zap"
  | "bell"
  | "database"
  | "cpu"
  | "history"
  | "file";

export interface C3ComponentItem {
  id: string;
  plainName: string;
  plainTagline: string;
  name: string;
  role: string;
  detail: string;
  repoPath: string;
  icon: C3IconKey;
  journeyTags: ("auth" | "task" | "goal" | "habit" | "complete" | "reflection" | "cicd")[];
}

export interface C3LayerDef {
  id: string;
  stepNum: number;
  plainTitle: string;
  plainSubtitle: string;
  title: string;
  subtitle: string;
  accent: string;
  items: C3ComponentItem[];
}

export const C4_LEVEL3_LAYERS: C3LayerDef[] = [
  {
    id: "entry",
    stepNum: 1,
    plainTitle: "Entry & Security",
    plainSubtitle: "Checks requests & routes them",
    title: "1. Guards & Controllers",
    subtitle: "HTTP & WebSocket boundary",
    accent: "#38BDF8",
    items: [
      {
        id: "validation-pipe",
        plainName: "Input Check",
        plainTagline: "Blocks bad fields",
        name: "ValidationPipe",
        role: "DTO whitelist & type check",
        detail:
          "Strips unexpected properties and rejects malformed payloads before they ever reach business logic or a database.",
        repoPath: "apps/backend/src/main.ts",
        icon: "shield",
        journeyTags: ["auth", "task", "goal", "habit", "complete", "reflection"],
      },
      {
        id: "auth-guard",
        plainName: "Login Guard",
        plainTagline: "Verifies JWT cookie",
        name: "AuthGuard + Passport",
        role: "RS256 cookie & OAuth verify",
        detail:
          "Reads the HttpOnly access_token cookie, checks the cryptographic signature, and attaches the verified userId to the request.",
        repoPath: "apps/backend/src/modules/auth/guards/",
        icon: "key",
        journeyTags: ["auth", "task", "goal", "habit", "complete", "reflection"],
      },
      {
        id: "api-controllers",
        plainName: "API Routes",
        plainTagline: "Auth, Tasks, Goals & Habits",
        name: "REST Controllers",
        role: "/auth · /tasks · /goals · /habits · /user",
        detail:
          "Thin HTTP controllers that parse URL params and cookies, then immediately delegate work to the matching domain service.",
        repoPath: "apps/backend/src/modules/*/*.controller.ts",
        icon: "route",
        journeyTags: ["auth", "task", "goal", "habit", "complete", "reflection"],
      },
      {
        id: "ws-gateway",
        plainName: "Live Socket",
        plainTagline: "Pushes instant alerts",
        name: "NotificationGateway",
        role: "user:{id} WebSocket rooms",
        detail:
          "Keeps a persistent Socket.IO channel open per user so rank-ups and reminders appear immediately without refreshing.",
        repoPath: "apps/backend/src/modules/notification/gateways/",
        icon: "radio",
        journeyTags: ["complete"],
      },
    ],
  },
  {
    id: "domain",
    stepNum: 2,
    plainTitle: "Core Logic",
    plainSubtitle: "Applies rules & XP math",
    title: "2. Domain Services",
    subtitle: "Business rules & caching",
    accent: "#FB7185",
    items: [
      {
        id: "auth-svc",
        plainName: "Auth & Sessions",
        plainTagline: "Passwords & token rotation",
        name: "AuthService",
        role: "bcrypt+pepper · 15m/7d tokens",
        detail:
          "Hashes passwords with bcrypt + secret pepper, rotates 7-day refresh tokens in Redis, and sets XSS-safe HttpOnly cookies.",
        repoPath: "apps/backend/src/modules/auth/auth.service.ts",
        icon: "lock",
        journeyTags: ["auth"],
      },
      {
        id: "tasks-svc",
        plainName: "Tasks & Goals",
        plainTagline: "Plans & progress tracking",
        name: "Tasks & GoalsService",
        role: "CRUD, sprints & velocity",
        detail:
          "Manages standalone tasks, Goal milestone sprints, and routes completed items to XP, habit, or goal side-effects.",
        repoPath: "apps/backend/src/modules/tasks/tasks.service.ts",
        icon: "list",
        journeyTags: ["task", "goal", "habit", "complete"],
      },
      {
        id: "habits-svc",
        plainName: "Habits & Streaks",
        plainTagline: "Streaks & 31-day grid",
        name: "HabitsService",
        role: "EMA stability (K=0.25) & bitmask",
        detail:
          "Updates current/longest streaks, recalculates habit stability with exponential moving average, and flips the 31-day SQL calendar string.",
        repoPath: "apps/backend/src/modules/habits/habits.service.ts",
        icon: "flame",
        journeyTags: ["habit", "complete"],
      },
      {
        id: "gamification-svc",
        plainName: "XP & Ranks",
        plainTagline: "Multipliers & level-ups",
        name: "GamificationService",
        role: "XP math, ranks & dirty buffer",
        detail:
          "Computes priority XP × streak multiplier, buffers rapid updates in Redis, and detects level-ups and rank promotions.",
        repoPath: "apps/backend/src/modules/gamification/",
        icon: "trophy",
        journeyTags: ["complete"],
      },
      {
        id: "reflection-svc",
        plainName: "Reflections",
        plainTagline: "Timezone-aware journals",
        name: "SelfReflectionService",
        role: "Logical day engine",
        detail:
          "Maps late-night reflections to the user's logical day using their IANA timeZone and custom dayStartTime.",
        repoPath: "apps/backend/src/modules/user/self-reflection/",
        icon: "book",
        journeyTags: ["reflection"],
      },
    ],
  },
  {
    id: "workers",
    stepNum: 3,
    plainTitle: "Background Jobs",
    plainSubtitle: "Heavy work off main thread",
    title: "3. Crons & BullMQ",
    subtitle: "Async queues & batch sync",
    accent: "#FB923C",
    items: [
      {
        id: "habits-cron",
        plainName: "Hourly Habit Cron",
        plainTagline: "Matches user timezones",
        name: "HabitsCron (0 * * * *)",
        role: "Hourly timezone fan-out",
        detail:
          "Runs at minute :00 every hour, finds every timezone entering a new local day, and queues daily habit generation.",
        repoPath: "apps/backend/src/modules/habits/habits.cron.ts",
        icon: "clock",
        journeyTags: ["habit"],
      },
      {
        id: "habit-worker",
        plainName: "Habit Queue Worker",
        plainTagline: "Creates daily habit tasks",
        name: "HabitTaskProcessor",
        role: "BullMQ habits-queue worker",
        detail:
          "Consumes jobs from Queue Redis and safely creates each user's daily HabitTask using a unique constraint to avoid duplicates.",
        repoPath: "apps/backend/src/modules/habits/processors/",
        icon: "layers",
        journeyTags: ["habit"],
      },
      {
        id: "gamification-cron",
        plainName: "XP Batch Sync",
        plainTagline: "Saves XP every 10 seconds",
        name: "GamificationSyncCron",
        role: "Redlock 10s Postgres flush",
        detail:
          "Acquires a distributed Redlock across the 3 API pods and writes buffered Redis XP totals cleanly into PostgreSQL.",
        repoPath: "apps/backend/src/modules/gamification/cron/",
        icon: "zap",
        journeyTags: ["complete"],
      },
      {
        id: "notif-worker",
        plainName: "Alert Dispatcher",
        plainTagline: "Sends rank-ups & pushes",
        name: "NotificationProcessor",
        role: "MongoDB + WS + Web Push",
        detail:
          "Saves notifications to MongoDB (30-day TTL) and broadcasts instant alerts via Socket.IO and VAPID Web Push.",
        repoPath: "apps/backend/src/modules/notification/processors/",
        icon: "bell",
        journeyTags: ["complete"],
      },
    ],
  },
  {
    id: "adapters",
    stepNum: 4,
    plainTitle: "Databases",
    plainSubtitle: "Connects to 5 data stores",
    title: "4. Storage Adapters",
    subtitle: "Typed polyglot drivers",
    accent: "#34D399",
    items: [
      {
        id: "prisma-svc",
        plainName: "PostgreSQL",
        plainTagline: "Accounts, habits & levels",
        name: "PrismaService",
        role: "ACID SQL & overlay() bitmask",
        detail:
          "Primary relational database for Users, Accounts, Goals, Habits, Tasks, XP transactions, and 31-day HabitMonthlyLogs.",
        repoPath: "packages/core/db/prisma/schema.prisma",
        icon: "database",
        journeyTags: ["auth", "task", "goal", "habit", "complete", "reflection"],
      },
      {
        id: "upstash-cache-svc",
        plainName: "Upstash Redis",
        plainTagline: "User profile, sessions & XP",
        name: "RedisCacheService",
        role: "5 cache repos + Redlock",
        detail:
          "Managed cloud TLS Redis caching user:{id}:profile (24h), refresh:{id} (7d), task:metadata:{id} (48h), habit meta, user:gamification:{id}, and users:dirty with Redlock.",
        repoPath: "apps/backend/src/common/redis-cache/redis-cache.service.ts",
        icon: "zap",
        journeyTags: ["auth", "task", "goal", "habit", "complete", "reflection"],
      },
      {
        id: "queue-redis-svc",
        plainName: "Queue Redis",
        plainTagline: "BullMQ queues & WS Pub/Sub",
        name: "LocalRedis + RedisIO",
        role: "In-cluster 10Gi PVC pod",
        detail:
          "Self-hosted Redis pod inside GKE dedicated to blocking BullMQ queues (habits-queue, notification-queue) and multi-pod Socket.IO broadcasting.",
        repoPath: "apps/backend/src/common/local-redis/local-redis.module.ts",
        icon: "cpu",
        journeyTags: ["habit", "complete", "cicd"],
      },
      {
        id: "dynamo-svc",
        plainName: "AWS DynamoDB",
        plainTagline: "Permanent daily history",
        name: "DynamoDbService",
        role: "Day-Mark-Logs (GSI1/GSI2)",
        detail:
          "Append-only single-table ledger storing completed tasks, habit check-ins, and reflections for millisecond timeline queries.",
        repoPath: "apps/backend/src/common/dynamo-db/",
        icon: "history",
        journeyTags: ["goal", "complete", "reflection"],
      },
      {
        id: "mongo-adapter",
        plainName: "MongoDB",
        plainTagline: "30-day alerts & notes",
        name: "Mongoose Adapter",
        role: "AppNotification (30d TTL)",
        detail:
          "Stores high-churn in-app notifications with instant ACK delete and automatic 30-day TTL expiration, plus flexible reflection metadata.",
        repoPath: "apps/backend/src/modules/notification/schemas/",
        icon: "file",
        journeyTags: ["complete", "reflection"],
      },
    ],
  },
];
