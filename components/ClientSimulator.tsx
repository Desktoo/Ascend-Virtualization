"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  CloudUpload,
  Compass,
  Flame,
  Globe2,
  KeyRound,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  PriorityLevel,
  TASK_XP,
  getTaskXp,
  getXpRequiredForNextLevel,
} from "@/lib/architectureData";
import {
  JourneyKey,
  SEED_DAY_INDEX,
  VirtualClusterState,
} from "@/lib/simulationEngine";
import { AudienceMode } from "./ArchitectureGraph";

export type DockPanelKey = JourneyKey | "profile";

interface ClientSimulatorProps {
  clusterState: VirtualClusterState;
  audienceMode: AudienceMode;
  openPanel: DockPanelKey | null;
  completedJourneys: Set<JourneyKey>;
  onTogglePanel: (panel: DockPanelKey) => void;
  onClosePanel: () => void;
  onStartTour: () => void;
  onTriggerAuth: (input: {
    mode: "register" | "login";
    userName: string;
    email: string;
    password: string;
    timeZone: string;
    dayStartTime: string;
  }) => void;
  onTriggerCreateTask: (input: {
    title: string;
    priority: PriorityLevel;
    dueTime: string;
  }) => void;
  onTriggerCreateGoal: (input: {
    title: string;
    description: string;
    rewardText: string;
    timeFrame: "WEEKLY" | "MONTHLY";
    configeDaysPerWeek: number;
    weekendsExcluded: boolean;
    firstTaskTitle: string;
  }) => void;
  onTriggerCreateHabit: (input: {
    title: string;
    taskTitle: string;
    tag: string;
    priority: PriorityLevel;
    dueTime: string;
    daysOfWeek: string[];
  }) => void;
  onTriggerHabitCron: (input: {
    targetTimeZone: string;
    simulatedUtcLabel: string;
    localWindowLabel: string;
  }) => void;
  onTriggerCompleteTask: (taskId: string) => void;
  onTriggerReflection: (input: {
    reflectionText: string;
    mood: string;
    energyScore: number;
    tags: string[];
    tomorrowTaskTitle?: string;
  }) => void;
  onTriggerAckNotification: (notificationId: string) => void;
  onTriggerCicdDeploy: (input: {
    commitMessage: string;
    changedService: "both" | "backend" | "web";
  }) => void;
}

const MOODS = ["Focused", "Energized", "Reflective", "Stretched"] as const;

const CRON_TIMEZONE_SCENARIOS = [
  {
    tz: "Asia/Kolkata",
    label: "India (IST)",
    utc: "00:30 UTC",
    localWindow: "06:00",
    others: "London 00:30 · SF 16:30 (skipped)",
  },
  {
    tz: "Europe/London",
    label: "London (GMT)",
    utc: "06:00 UTC",
    localWindow: "06:00",
    others: "India 11:30 · SF 22:00 (skipped)",
  },
  {
    tz: "America/Los_Angeles",
    label: "San Francisco (PT)",
    utc: "14:00 UTC",
    localWindow: "06:00",
    others: "India 19:30 · London 14:00 (skipped)",
  },
] as const;

const DOCK_ITEMS: {
  key: JourneyKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { key: "auth", label: "Sign Up", icon: ShieldCheck, accent: "text-sky-400" },
  { key: "task", label: "Task", icon: CheckSquare, accent: "text-cyan-400" },
  { key: "goal", label: "Goal", icon: Target, accent: "text-indigo-400" },
  { key: "habit", label: "Habit + Cron", icon: Clock, accent: "text-orange-400" },
  { key: "complete", label: "Check Off", icon: Flame, accent: "text-amber-400" },
  { key: "reflection", label: "Reflect", icon: BookOpen, accent: "text-violet-400" },
  { key: "cicd", label: "Deploy", icon: Rocket, accent: "text-emerald-400" },
];

export function ClientSimulator({
  clusterState,
  audienceMode,
  openPanel,
  completedJourneys,
  onTogglePanel,
  onClosePanel,
  onStartTour,
  onTriggerAuth,
  onTriggerCreateTask,
  onTriggerCreateGoal,
  onTriggerCreateHabit,
  onTriggerHabitCron,
  onTriggerCompleteTask,
  onTriggerReflection,
  onTriggerAckNotification,
  onTriggerCicdDeploy,
}: ClientSimulatorProps) {
  const activeUser =
    clusterState.postgres.users.find(
      (u) => u.id === clusterState.session.activeUserId,
    ) ?? clusterState.postgres.users[0];

  const xpTarget = getXpRequiredForNextLevel(activeUser.level);
  const xpPercent = Math.min(100, Math.round((activeUser.xp / xpTarget) * 100));
  const scheduledDayNum = Number(
    clusterState.postgres.tasks[0]?.scheduledDate?.split("-")[2] ??
      SEED_DAY_INDEX + 1,
  );
  const dayIndex = Number.isFinite(scheduledDayNum)
    ? Math.min(30, Math.max(0, scheduledDayNum - 1))
    : SEED_DAY_INDEX;

  // 1. Auth form state
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [userName, setUserName] = useState("alex_founder");
  const [email, setEmail] = useState("alex@company.com");
  const [password, setPassword] = useState("AscendProd#2026");
  const [timeZone, setTimeZone] = useState("America/Los_Angeles");
  const [dayStartTime] = useState("06:00");

  // 2. Standard Task form state
  const [taskTitle, setTaskTitle] = useState("Finalize Q4 architecture review deck");
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>("HIGH");
  const [taskDueTime, setTaskDueTime] = useState("17:00");

  // 3. Objective / Goal form state
  const [goalTitle, setGoalTitle] = useState("Ship V2 Mobile Offline Sync");
  const goalDescription =
    "Design conflict resolution and complete 20 focused engineering sprints.";
  const [goalReward, setGoalReward] = useState("Team celebration dinner");
  const [goalTimeFrame, setGoalTimeFrame] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [goalDaysPerWeek, setGoalDaysPerWeek] = useState<number>(5);
  const [goalWeekendsExcluded, setGoalWeekendsExcluded] = useState<boolean>(true);
  const [goalFirstTask, setGoalFirstTask] = useState(
    "Draft offline queue retry contract",
  );

  // 4. Habit + Timezone Cron state
  const [habitSubTab, setHabitSubTab] = useState<"create" | "cron">("create");
  const [habitTitle, setHabitTitle] = useState("Deep Work Architecture");
  const [habitTaskTitle, setHabitTaskTitle] = useState(
    "Review system design & key metrics",
  );
  const [habitPriority, setHabitPriority] = useState<PriorityLevel>("HIGH");
  const [habitDueTime] = useState("10:00");
  const [selectedCronTz, setSelectedCronTz] = useState<string>("Asia/Kolkata");

  // 6. Reflection state
  const [reflectionText, setReflectionText] = useState(
    "Strong focus session today. Ready to ship the performance update tomorrow morning.",
  );
  const [mood, setMood] = useState<string>("Focused");
  const [energyScore, setEnergyScore] = useState<number>(8);
  const [tomorrowTask, setTomorrowTask] = useState(
    "Review weekly growth & latency dashboard",
  );

  // 7. CI/CD state
  const [commitMessage, setCommitMessage] = useState(
    "feat: speed up streak heatmap & scale servers",
  );
  const [changedService, setChangedService] = useState<"both" | "backend" | "web">(
    "both",
  );

  const userTasks = clusterState.postgres.tasks;
  const userHabits = clusterState.postgres.habits;
  const userGoals = clusterState.postgres.goals;
  const unreadNotifs = clusterState.mongodb.appnotifications;

  const activeCronScenario =
    CRON_TIMEZONE_SCENARIOS.find((s) => s.tz === selectedCronTz) ??
    CRON_TIMEZONE_SCENARIOS[0];

  const pendingTaskCount = userTasks.filter((t) => t.status === "PENDING").length;

  return (
    <>
      {/* FLOATING POP-UP ACTION CARD (Opens when user clicks any item on the bottom dock) */}
      <AnimatePresence>
        {openPanel && (
          <motion.div
            key={`dock-card-${openPanel}`}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed bottom-[86px] left-1/2 -translate-x-1/2 z-40 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-175px)] flex flex-col rounded-2xl border border-white/[0.14] bg-[#0D111C]/96 shadow-[0_28px_90px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden"
          >
            {/* Floating Card Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
              <div className="text-sm font-semibold text-white">
                {openPanel === "profile" && "User Profile & Live Alerts"}
                {openPanel === "auth" && "Sign Up or Log In"}
                {openPanel === "task" && "Create a Standard Task"}
                {openPanel === "goal" && "Create an Objective (Goal)"}
                {openPanel === "habit" && "Habits & Hourly Timezone Cron"}
                {openPanel === "complete" && "Check Off Tasks for XP"}
                {openPanel === "reflection" && "Write a Daily Reflection"}
                {openPanel === "cicd" && "Ship an Update to Cloud"}
              </div>
              <button
                type="button"
                onClick={onClosePanel}
                title="Close card"
                className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Floating Card Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {/* PROFILE & NOTIFICATIONS POPOVER */}
              {openPanel === "profile" && (
                <div className="space-y-3.5">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/25 flex items-center justify-center text-base font-semibold text-sky-200">
                          {activeUser.userName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            @{activeUser.userName}
                          </div>
                          <div className="inline-flex items-center gap-1 text-xs text-amber-300 font-medium">
                            <Award className="h-3.5 w-3.5" />
                            {activeUser.rank} · Level {activeUser.level}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-400">
                        <div className="text-white font-semibold">
                          {activeUser.xp} / {xpTarget} XP
                        </div>
                        <div className="text-[11px]">{activeUser.timeZone}</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-white/[0.07] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                        initial={false}
                        animate={{ width: `${xpPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-medium text-zinc-200">
                        Live MongoDB Notification Inbox (30d TTL)
                      </span>
                      <span>{unreadNotifs.length} unread</span>
                    </div>
                    {unreadNotifs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-zinc-500">
                        Inbox clean — complete a habit to trigger a live Rank Up alert!
                      </div>
                    ) : (
                      unreadNotifs.map((notif) => (
                        <div
                          key={notif._id}
                          className={`flex items-start justify-between gap-2.5 rounded-xl border p-3 text-xs ${
                            notif.type === "RANK_UP"
                              ? "border-amber-400/35 bg-amber-500/12 text-amber-100"
                              : "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100"
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-300" />
                            <div>
                              <div className="font-semibold">{notif.title}</div>
                              <div className="text-[11px] opacity-80 mt-0.5 leading-snug">
                                {notif.body}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onTriggerAckNotification(notif._id)}
                            className="shrink-0 rounded-lg bg-black/40 hover:bg-black/70 px-2 py-1 text-[11px] font-medium text-white cursor-pointer"
                          >
                            ACK
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 1. AUTH */}
              {openPanel === "auth" && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {audienceMode === "plain"
                      ? "Fill in details and submit to watch Ascend hash your password, save the account in PostgreSQL, cache the session in Redis, and return XSS-safe HttpOnly cookies."
                      : "POST /api/v1/auth/signup -> Bcrypt(10)+pepper -> Prisma $transaction -> Redis 7d SETEX -> RS256 HttpOnly JWT cookies."}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/35 p-1 border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        authMode === "register"
                          ? "bg-white/12 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      New Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        authMode === "login"
                          ? "bg-white/12 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Sign In
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onTriggerAuth({
                        mode: authMode,
                        userName,
                        email,
                        password,
                        timeZone,
                        dayStartTime,
                      });
                    }}
                    className="space-y-2.5"
                  >
                    {authMode === "register" && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Username
                        </label>
                        <input
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Your Timezone (Used by Daily Cron)
                      </label>
                      <select
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0D1018] px-3 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                      >
                        <option value="America/Los_Angeles">San Francisco (PT)</option>
                        <option value="America/New_York">New York (ET)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4" />
                      {authMode === "register"
                        ? "Create Account & Watch Flow"
                        : "Sign In & Watch Flow"}
                    </button>
                  </form>
                </div>
              )}

              {/* 2. CREATE STANDARD TASK */}
              {openPanel === "task" && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {audienceMode === "plain"
                      ? "Creates a one-off task aligned to your local timezone in PostgreSQL and updates the Redis cache."
                      : "POST /api/v1/tasks/create (x-user-timezone) -> Postgres Task insert -> Redis task:meta SETEX + DEL user:tasks."}
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!taskTitle.trim()) return;
                      onTriggerCreateTask({
                        title: taskTitle,
                        priority: taskPriority,
                        dueTime: taskDueTime,
                      });
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Task Title
                      </label>
                      <input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Priority (XP Weight)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTaskPriority(p)}
                            className={`rounded-xl border py-2 text-xs font-medium transition-colors cursor-pointer ${
                              taskPriority === p
                                ? "border-sky-400/60 bg-sky-500/20 text-white"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {p === "HIGH"
                              ? "High (30)"
                              : p === "MEDIUM"
                                ? "Med (20)"
                                : "Low (10)"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Due Time ({activeUser.timeZone})
                      </label>
                      <input
                        type="time"
                        value={taskDueTime}
                        onChange={(e) => setTaskDueTime(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Create Task & Watch Flow
                    </button>
                  </form>
                </div>
              )}

              {/* 3. CREATE OBJECTIVE / GOAL */}
              {openPanel === "goal" && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {audienceMode === "plain"
                      ? "Turns a weekly or monthly objective into a daily GoalTask in PostgreSQL and prepares AWS DynamoDB GSI1 for velocity tracking."
                      : "POST /api/v1/goals/create -> Postgres $transaction (Goal + GoalTask FK) -> Redis task:meta -> DynamoDB GSI1."}
                  </p>

                  {userGoals.length > 0 && (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white truncate">
                          Active: {userGoals[0].title}
                        </span>
                        <span className="text-[11px] text-indigo-300 shrink-0">
                          {userGoals[0].completedDays}/{userGoals[0].targetDays}d (
                          {userGoals[0].currentProgress}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${userGoals[0].currentProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!goalTitle.trim()) return;
                      onTriggerCreateGoal({
                        title: goalTitle,
                        description: goalDescription,
                        rewardText: goalReward,
                        timeFrame: goalTimeFrame,
                        configeDaysPerWeek: goalDaysPerWeek,
                        weekendsExcluded: goalWeekendsExcluded,
                        firstTaskTitle: goalFirstTask,
                      });
                    }}
                    className="space-y-2.5"
                  >
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Objective Title
                      </label>
                      <input
                        value={goalTitle}
                        onChange={(e) => setGoalTitle(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white focus:border-indigo-400/60 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {(["WEEKLY", "MONTHLY"] as const).map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setGoalTimeFrame(tf)}
                          className={`rounded-xl border py-1.5 text-xs font-medium cursor-pointer ${
                            goalTimeFrame === tf
                              ? "border-indigo-400/60 bg-indigo-500/20 text-white"
                              : "border-white/10 bg-white/[0.02] text-zinc-400"
                          }`}
                        >
                          {tf === "WEEKLY" ? "Weekly Goal" : "Monthly Goal"}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Days / Week
                        </label>
                        <select
                          value={goalDaysPerWeek}
                          onChange={(e) => setGoalDaysPerWeek(Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-[#0D1018] px-2.5 py-2 text-xs text-white focus:border-indigo-400/60 focus:outline-none"
                        >
                          <option value={3}>3 days / wk</option>
                          <option value={5}>5 days / wk</option>
                          <option value={7}>7 days / wk</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setGoalWeekendsExcluded((v) => !v)}
                          className={`w-full rounded-xl border py-2 px-2 text-xs font-medium cursor-pointer ${
                            goalWeekendsExcluded
                              ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200"
                              : "border-white/10 bg-white/[0.02] text-zinc-400"
                          }`}
                        >
                          {goalWeekendsExcluded ? "No Weekends ✓" : "Include Weekends"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Day-1 Linked GoalTask
                      </label>
                      <input
                        value={goalFirstTask}
                        onChange={(e) => setGoalFirstTask(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white focus:border-indigo-400/60 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Milestone Reward
                      </label>
                      <input
                        value={goalReward}
                        onChange={(e) => setGoalReward(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white focus:border-indigo-400/60 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                    >
                      <Target className="h-4 w-4" />
                      Create Objective & Watch Flow
                    </button>
                  </form>
                </div>
              )}

              {/* 4. HABIT + HOURLY TIMEZONE CRON */}
              {openPanel === "habit" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/35 p-1 border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setHabitSubTab("create")}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        habitSubTab === "create"
                          ? "bg-white/12 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Create Habit
                    </button>
                    <button
                      type="button"
                      onClick={() => setHabitSubTab("cron")}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        habitSubTab === "cron"
                          ? "bg-orange-500/25 text-orange-200"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Hourly TZ Cron
                    </button>
                  </div>

                  {habitSubTab === "create" ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!habitTitle.trim() || !habitTaskTitle.trim()) return;
                        onTriggerCreateHabit({
                          title: habitTitle,
                          taskTitle: habitTaskTitle,
                          tag: "FOCUS",
                          priority: habitPriority,
                          dueTime: habitDueTime,
                          daysOfWeek: [
                            "MONDAY",
                            "TUESDAY",
                            "WEDNESDAY",
                            "THURSDAY",
                            "FRIDAY",
                          ],
                        });
                      }}
                      className="space-y-2.5"
                    >
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Habit Name
                        </label>
                        <input
                          value={habitTitle}
                          onChange={(e) => setHabitTitle(e.target.value)}
                          required
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Daily Checklist Item
                        </label>
                        <input
                          value={habitTaskTitle}
                          onChange={(e) => setHabitTaskTitle(e.target.value)}
                          required
                          className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Reward Priority
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setHabitPriority(p)}
                              className={`rounded-xl border py-2 text-xs font-medium transition-colors cursor-pointer ${
                                habitPriority === p
                                  ? "border-blue-400/60 bg-blue-500/20 text-white"
                                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {p === "HIGH" ? "High" : p === "MEDIUM" ? "Medium" : "Low"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-2.5 text-[11px] text-orange-100/90 leading-relaxed">
                        <strong>Auto-scheduled daily:</strong> Hourly{" "}
                        <code>HabitsCron</code> checks your IANA timezone (
                        <code>{activeUser.timeZone}</code>) and queues BullMQ at{" "}
                        <code>{activeUser.dayStartTime}</code>.
                      </div>

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Save Habit & Watch Flow
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-orange-300">
                          <Globe2 className="h-3.5 w-3.5" />
                          Why Timezone-Bucketed Cron?
                        </div>
                        <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                          <code>@Cron(&apos;0 * * * *&apos;)</code> fetches only{" "}
                          <strong>distinct IANA timezones</strong> (DST-safe),
                          matches whichever zone hits morning, and fans out
                          deduplicated BullMQ jobs guarded by{" "}
                          <code>@@unique([habitId, scheduledDate])</code>.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        {CRON_TIMEZONE_SCENARIOS.map((sc) => {
                          const active = sc.tz === selectedCronTz;
                          return (
                            <button
                              key={sc.tz}
                              type="button"
                              onClick={() => setSelectedCronTz(sc.tz)}
                              className={`w-full rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                                active
                                  ? "border-orange-400/60 bg-orange-500/15"
                                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-white">
                                  {sc.label}
                                </span>
                                <span className="text-[11px] text-orange-300">
                                  {sc.utc} → {sc.localWindow} local
                                </span>
                              </div>
                              <div className="text-[10.5px] text-zinc-400 mt-0.5">
                                {sc.others}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onTriggerHabitCron({
                            targetTimeZone: activeCronScenario.tz,
                            simulatedUtcLabel: activeCronScenario.utc,
                            localWindowLabel: activeCronScenario.localWindow,
                          })
                        }
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-400 hover:bg-orange-300 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                      >
                        <Clock className="h-4 w-4" />
                        Run Hourly Cron for {activeCronScenario.label}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 5. COMPLETE TASK / HABIT / GOAL & XP */}
              {openPanel === "complete" && (
                <div className="space-y-2.5">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Click <strong>Complete</strong> on any task to watch streaks,
                    31-day bitmask SQL, Redis XP write-behind, DynamoDB logs,
                    and live Socket.IO rank-ups fire across the cluster.
                  </p>

                  {userTasks.map((task) => {
                    const habit = userHabits.find((h) => h.id === task.habitId);
                    const goal = userGoals.find((g) => g.id === task.goalId);
                    const monthlyLog = clusterState.postgres.habitMonthlyLogs.find(
                      (l) => l.habitId === task.habitId,
                    );
                    const rewardXp = getTaskXp(activeUser.level, TASK_XP[task.priority]);
                    const isDone = task.status === "DONE";

                    return (
                      <div
                        key={task.id}
                        className={`rounded-2xl border p-3 transition-all ${
                          isDone
                            ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                            : "border-white/[0.1] bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                  task.type === "HabitTask"
                                    ? "bg-blue-500/15 text-blue-300"
                                    : task.type === "GoalTask"
                                      ? "bg-indigo-500/15 text-indigo-300"
                                      : "bg-zinc-500/20 text-zinc-300"
                                }`}
                              >
                                {task.type}
                              </span>
                              <span className="text-[11px] text-amber-300 font-medium">
                                +{rewardXp} XP
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-white leading-snug">
                              {task.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                              {habit && <span>{habit.currentStreak} day streak</span>}
                              {goal && (
                                <span className="text-indigo-300">
                                  Goal: {goal.currentProgress}% ({goal.completedDays}/
                                  {goal.targetDays}d)
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isDone}
                            onClick={() => onTriggerCompleteTask(task.id)}
                            className={`shrink-0 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                              isDone
                                ? "bg-emerald-500/15 text-emerald-300 cursor-default"
                                : "bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.22)] cursor-pointer"
                            }`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Done
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" />
                                Complete
                              </>
                            )}
                          </button>
                        </div>

                        {monthlyLog && (
                          <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                              <span>31-Day Activity Strip</span>
                              <span>Day {dayIndex + 1}</span>
                            </div>
                            <div
                              className="grid gap-[2px]"
                              style={{
                                gridTemplateColumns: "repeat(31, minmax(0, 1fr))",
                              }}
                            >
                              {monthlyLog.history.split("").map((ch, idx) => {
                                const isToday = idx === dayIndex;
                                return (
                                  <div
                                    key={idx}
                                    className={`h-2 rounded-[2px] ${
                                      ch === "D"
                                        ? "bg-emerald-400"
                                        : isToday
                                          ? "bg-amber-400/70"
                                          : "bg-white/[0.08]"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 6. DAILY REFLECTION */}
              {openPanel === "reflection" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!reflectionText.trim()) return;
                    onTriggerReflection({
                      reflectionText,
                      mood,
                      energyScore,
                      tags: ["deep-work", "consistency"],
                      tomorrowTaskTitle: tomorrowTask,
                    });
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      How did today feel?
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MOODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMood(m)}
                          className={`rounded-xl border py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                            mood === m
                              ? "border-violet-400/60 bg-violet-500/20 text-white"
                              : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Energy Level</span>
                      <span className="text-violet-300 font-semibold">
                        {energyScore} / 10
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={energyScore}
                      onChange={(e) => setEnergyScore(Number(e.target.value))}
                      className="w-full accent-violet-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Journal Note
                    </label>
                    <textarea
                      rows={3}
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white focus:border-violet-400/60 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Tomorrow&apos;s Top Priority
                    </label>
                    <input
                      value={tomorrowTask}
                      onChange={(e) => setTomorrowTask(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white focus:border-violet-400/60 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-400 hover:bg-violet-300 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" />
                    Save Reflection & Watch Flow
                  </button>
                </form>
              )}

              {/* 7. CLOUD DEPLOYMENT (CI/CD) */}
              {openPanel === "cicd" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Live Version</span>
                      <span className="font-semibold text-emerald-300">
                        v{clusterState.k8s.chartVersion} · Healthy
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Min Production Pods</span>
                      <span className="text-zinc-200">
                        3 API · 2 Web · 1 Redis PVC
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!commitMessage.trim()) return;
                      onTriggerCicdDeploy({ commitMessage, changedService });
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Commit Message
                      </label>
                      <input
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white focus:border-emerald-400/60 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Changed Scope
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "both" as const, label: "All" },
                          { id: "backend" as const, label: "Backend" },
                          { id: "web" as const, label: "Web" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setChangedService(opt.id)}
                            className={`rounded-xl border py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              changedService === opt.id
                                ? "border-emerald-400/60 bg-emerald-500/20 text-white"
                                : "border-white/10 bg-white/[0.02] text-zinc-400"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                    >
                      <CloudUpload className="h-4 w-4" />
                      Deploy Update & Watch Flow
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING BOTTOM ACTION DOCK (Full-Pill Rounded with Generous X Padding) */}
      <nav
        id="tour-dock"
        aria-label="Ascend Action Dock"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-2rem)] rounded-full border border-white/[0.14] bg-[#0C101A]/94 px-5 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.82)] backdrop-blur-xl flex items-center gap-1.5 overflow-x-auto"
      >
        {/* User Profile / XP Pill */}
        <button
          type="button"
          onClick={() => onTogglePanel("profile")}
          className={`relative shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 transition-all cursor-pointer ${
            openPanel === "profile"
              ? "bg-white/14 ring-1 ring-white/25"
              : "bg-white/[0.05] hover:bg-white/[0.1]"
          }`}
        >
          <div className="h-7 w-7 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-xs font-semibold text-sky-200">
            {activeUser.userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-left hidden xl:block">
            <div className="text-[11px] font-semibold text-white leading-tight">
              {activeUser.rank} · Lv.{activeUser.level}
            </div>
            <div className="mt-1 h-1 w-14 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-violet-400"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
          {unreadNotifs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-amber-400 text-[10px] font-bold text-zinc-950 flex items-center justify-center px-1">
              {unreadNotifs.length}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-white/10 shrink-0 mx-1" />

        {/* 7 Interactive Workflow Dock Buttons */}
        <div className="flex items-center gap-1">
          {DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = openPanel === item.key;
            const isDone = completedJourneys.has(item.key);
            return (
              <motion.button
                key={item.key}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onTogglePanel(item.key)}
                className={`relative shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-sky-500/20 text-white ring-1 ring-sky-400/50"
                    : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                <span>{item.label}</span>
                {item.key === "complete" && pendingTaskCount > 0 && (
                  <span className="rounded-full bg-amber-400/20 text-amber-300 px-1.5 py-0.2 text-[10px] font-semibold">
                    {pendingTaskCount}
                  </span>
                )}
                {isDone && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-white/10 shrink-0 mx-1" />

        {/* Replay Guided Tour Button */}
        <button
          type="button"
          onClick={onStartTour}
          title="Start multi-step guided tour"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3.5 py-2 text-xs font-medium text-sky-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Compass className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden md:inline">Tour</span>
        </button>
      </nav>
    </>
  );
}
