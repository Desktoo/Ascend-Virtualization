"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  Bell,
  BookOpenCheck,
  Code2,
  Database,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Trash2,
} from "lucide-react";
import { AnyNodeId, GraphMode } from "@/lib/architectureData";
import {
  ExecutionTrace,
  JourneyKey,
  VirtualClusterState,
  buildAckNotificationTrace,
  buildAuthTrace,
  buildCicdDeployTrace,
  buildCompleteHabitTrace,
  buildCreateGoalTrace,
  buildCreateHabitTrace,
  buildCreateTaskTrace,
  buildHabitCronTrace,
  buildReflectionTrace,
  createSeedClusterState,
  loadClusterState,
  resetClusterState,
  saveClusterState,
} from "@/lib/simulationEngine";
import { HeroOverlay } from "./HeroOverlay";
import { ClientSimulator, DockPanelKey } from "./ClientSimulator";
import { ArchitectureGraph, AudienceMode } from "./ArchitectureGraph";
import {
  FloatingNodeCard,
  FloatingReferenceModal,
  FloatingRulesCard,
  FloatingStepCard,
  ReferenceSheetTab,
} from "./InspectorDrawer";

const TOUR_SEEN_KEY = "ascend_tour_seen_v1";

export function VirtualizerWorkspace() {
  const [hasStarted, setHasStarted] = useState(false);
  const [clusterState, setClusterState] = useState<VirtualClusterState>(() =>
    createSeedClusterState(),
  );
  const [graphMode, setGraphMode] = useState<GraphMode>("runtime");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("plain");
  const [activeJourney, setActiveJourney] = useState<JourneyKey>("auth");
  const [completedJourneys, setCompletedJourneys] = useState<Set<JourneyKey>>(
    () => new Set(),
  );

  // Floating UI States (Steps & Rules cards only open when user runs an action from the dock!)
  const [openDockPanel, setOpenDockPanel] = useState<DockPanelKey | null>(null);
  const [inspectedNodeId, setInspectedNodeId] = useState<AnyNodeId | null>(null);
  const [showStepsCard, setShowStepsCard] = useState(false);
  const [showRulesCard, setShowRulesCard] = useState(false);
  const [referenceSheetTab, setReferenceSheetTab] =
    useState<ReferenceSheetTab | null>(null);

  // Trace & Playback States
  const [activeTrace, setActiveTrace] = useState<ExecutionTrace | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [playbackMode, setPlaybackMode] = useState<"auto" | "step">("auto");
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cicdAutoLoop, setCicdAutoLoop] = useState(false);

  const appliedStepsRef = useRef<Set<string>>(new Set());
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  // Clean up driver.js on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  const launchGuidedTour = useCallback(() => {
    setGraphMode("runtime");
    setOpenDockPanel(null);
    setInspectedNodeId(null);
    setReferenceSheetTab(null);
    setShowStepsCard(false);
    setShowRulesCard(false);
    setIsPlaying(false);
    setActiveTrace(null);
    setCurrentStepIndex(-1);

    window.setTimeout(() => {
      driverRef.current?.destroy();
      const d = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayOpacity: 0.65,
        stagePadding: 8,
        stageRadius: 16,
        popoverClass: "ascend-driver-popover",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Start Exploring",
        steps: [
          {
            popover: {
              title: "Welcome to Ascend's Architecture Playground",
              description:
                "Everything runs 100% in your browser. Follow requests end-to-end from the User's Computer (left) through Google Kubernetes pods (center) to Managed Cloud Databases (right).",
              align: "center",
            },
          },
          {
            element: '[data-tour="node-browser"]',
            popover: {
              title: "User's Computer & XSS-Safe Cookies",
              description:
                "Every action starts in the client browser. After Sign Up or Sign In, both access and refresh JWTs return in HttpOnly, Secure, SameSite=Lax cookies so scripts cannot steal them.",
              side: "right",
              align: "center",
            },
          },
          {
            element: '[data-tour="node-nestjs"]',
            popover: {
              title: "Live GKE Container Pods (from Helm)",
              description:
                "Instead of generic boxes, these are the exact 6 minimum production pods from helm/values-prod.yaml: 2 Next.js Web pods, 3 NestJS API pods, and 1 BullMQ Redis pod with a 10Gi disk. Click any pod to inspect its specs.",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: '[data-tour="node-postgres"]',
            popover: {
              title: "4 Managed Cloud Databases",
              description:
                "PostgreSQL owns accounts, goals, habits, and 31-day bitmask heatmaps; Upstash Redis caches user profiles (24h), refresh tokens, task/habit metadata & XP buffers; AWS DynamoDB stores permanent history; MongoDB stores reflections and 30-day alerts.",
              side: "left",
              align: "center",
            },
          },
          {
            element: "#tour-c4-tabs",
            popover: {
              title: "Switch C4 Levels & Cloud Deployment",
              description:
                "Explore C2 · Pods (runtime containers), C3 · Internals (NestJS guards, services, crons & workers), and Cloud Deploy (GitHub Actions, ArgoCD, Helm & Bitnami SealedSecrets).",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#tour-schemas",
            popover: {
              title: "Real Repo Schemas & Live localStorage Data",
              description:
                "Inspect the actual schema.prisma, DynamoDB Day-Mark-Logs, MongoDB TTL schema, Kubernetes YAML, and live simulated database records updating in real time.",
              side: "bottom",
              align: "end",
            },
          },
          {
            element: "#tour-dock",
            popover: {
              title: "Your Interactive Bottom Dock",
              description:
                "Click any button here — Sign Up, Task, Goal, Habit + Cron, Check Off, Reflect, or Deploy — to open a floating card, fill in real data, and watch every hop + security check tick off live!",
              side: "top",
              align: "center",
            },
          },
        ],
        onDestroyed: () => {
          try {
            window.localStorage.setItem(TOUR_SEEN_KEY, "1");
          } catch {
            // ignore storage errors
          }
        },
      });
      driverRef.current = d;
      d.drive();
    }, 180);
  }, []);

  const applyStepSideEffects = useCallback(
    (trace: ExecutionTrace, stepIdx: number) => {
      const step = trace.steps[stepIdx];
      if (!step) return;

      const stepKey = `${trace.id}::${step.id}`;
      if (!appliedStepsRef.current.has(stepKey)) {
        appliedStepsRef.current.add(stepKey);
        if (step.applyState) {
          setClusterState((prev) => {
            const next = step.applyState!(prev);
            saveClusterState(next);
            return next;
          });
        }
      }
    },
    [],
  );

  const startTrace = useCallback(
    (trace: ExecutionTrace, forceAuto = false) => {
      appliedStepsRef.current = new Set();
      setOpenDockPanel(null); // Close input card immediately so user watches full-screen under-the-hood flow!
      setInspectedNodeId(null);
      setShowStepsCard(true);
      setShowRulesCard(true);
      setActiveJourney(trace.journey);
      setGraphMode(trace.graphMode);
      setActiveTrace(trace);
      setCurrentStepIndex(0);
      setCompletedJourneys((prev) => new Set(prev).add(trace.journey));

      applyStepSideEffects(trace, 0);

      const effectiveMode = forceAuto ? "auto" : playbackMode;
      if (forceAuto) {
        setPlaybackMode("auto");
      }

      if (effectiveMode === "auto" && trace.steps.length > 1) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    },
    [applyStepSideEffects, playbackMode],
  );

  const handleToggleCicdAutoRun = useCallback(() => {
    const isCicdTraceActive = activeTrace?.graphMode === "cicd";

    if (isCicdTraceActive && isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (
      isCicdTraceActive &&
      activeTrace &&
      currentStepIndex >= 0 &&
      currentStepIndex < activeTrace.steps.length - 1
    ) {
      setOpenDockPanel(null);
      setInspectedNodeId(null);
      setShowStepsCard(true);
      setShowRulesCard(true);
      setPlaybackMode("auto");
      setIsPlaying(true);
      return;
    }

    // Start a fresh 8-section Cloud Deploy auto-run walkthrough
    startTrace(
      buildCicdDeployTrace(clusterState, {
        commitMessage: "feat: ship habit streak & Upstash cache update",
        changedService: "both",
      }),
      true,
    );
  }, [activeTrace, clusterState, currentStepIndex, isPlaying, startTrace]);

  useEffect(() => {
    if (!isPlaying || playbackMode !== "auto" || !activeTrace) return;

    const isAtLastStep = currentStepIndex >= activeTrace.steps.length - 1;
    if (isAtLastStep) {
      if (activeTrace.graphMode === "cicd" && cicdAutoLoop) {
        const loopTimer = window.setTimeout(() => {
          setCurrentStepIndex(0);
        }, Math.round(3000 / speed));
        return () => window.clearTimeout(loopTimer);
      }
      return;
    }

    const baseDelay = activeTrace.graphMode === "cicd" ? 2500 : 2100;
    const delay = Math.round(baseDelay / speed);
    const timer = window.setTimeout(() => {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      applyStepSideEffects(activeTrace, nextIdx);
      if (
        nextIdx >= activeTrace.steps.length - 1 &&
        !(activeTrace.graphMode === "cicd" && cicdAutoLoop)
      ) {
        setIsPlaying(false);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    isPlaying,
    playbackMode,
    activeTrace,
    currentStepIndex,
    speed,
    cicdAutoLoop,
    applyStepSideEffects,
  ]);

  const handleBeginVirtualization = () => {
    const initialized = loadClusterState();
    saveClusterState(initialized);
    setClusterState(initialized);
    setHasStarted(true);

    // Automatically launch the guided tour on first visit
    try {
      const seen = window.localStorage.getItem(TOUR_SEEN_KEY);
      if (!seen) {
        window.setTimeout(() => {
          launchGuidedTour();
        }, 420);
      }
    } catch {
      // ignore storage errors
    }
  };

  const handleResetCluster = () => {
    driverRef.current?.destroy();
    const fresh = resetClusterState();
    try {
      window.localStorage.removeItem(TOUR_SEEN_KEY);
    } catch {
      // ignore
    }
    setClusterState(fresh);
    setActiveTrace(null);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setCompletedJourneys(new Set());
    setGraphMode("runtime");
    setActiveJourney("auth");
    setOpenDockPanel(null);
    setInspectedNodeId(null);
    setShowStepsCard(false);
    setShowRulesCard(false);
    appliedStepsRef.current = new Set();
  };

  const handleStepNext = () => {
    if (!activeTrace) return;
    if (currentStepIndex < activeTrace.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setIsPlaying(false);
      setCurrentStepIndex(nextIdx);
      applyStepSideEffects(activeTrace, nextIdx);
    }
  };

  const handleStepPrev = () => {
    if (!activeTrace) return;
    if (currentStepIndex > 0) {
      setIsPlaying(false);
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleJumpToStep = (idx: number) => {
    if (!activeTrace || idx < 0 || idx >= activeTrace.steps.length) return;
    setIsPlaying(false);
    for (let i = 0; i <= idx; i++) {
      applyStepSideEffects(activeTrace, i);
    }
    setCurrentStepIndex(idx);
  };

  const handleReplayTrace = () => {
    if (!activeTrace) return;
    setOpenDockPanel(null);
    setGraphMode(activeTrace.graphMode);
    setCurrentStepIndex(0);
    setInspectedNodeId(null);
    setShowStepsCard(true);
    setShowRulesCard(true);
    if (playbackMode === "auto" && activeTrace.steps.length > 1) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleTogglePlaybackMode = (mode: "auto" | "step") => {
    setPlaybackMode(mode);
    if (mode === "step") {
      setIsPlaying(false);
    } else if (
      activeTrace &&
      currentStepIndex >= 0 &&
      currentStepIndex < activeTrace.steps.length - 1
    ) {
      setIsPlaying(true);
    }
  };

  const handleToggleDockPanel = (panel: DockPanelKey) => {
    setOpenDockPanel((prev) => {
      const next = prev === panel ? null : panel;
      if (next && next !== "profile") {
        setActiveJourney(next);
        if (next === "cicd") {
          setGraphMode("cicd");
        } else if (graphMode === "cicd") {
          setGraphMode("runtime");
        }
      }
      return next;
    });
  };

  // Both cards only show when a dock action has been triggered and no dock input form is currently open
  const hasActiveTrace = Boolean(
    !openDockPanel &&
      activeTrace &&
      activeTrace.graphMode === graphMode &&
      currentStepIndex >= 0,
  );
  const renderStepsCard = hasActiveTrace && showStepsCard;
  const renderRulesCard = hasActiveTrace && showRulesCard;

  const latestNotif = clusterState.mongodb.appnotifications[0] ?? null;

  return (
    <div className="relative h-screen w-screen bg-[#07090F] text-zinc-100 overflow-hidden">
      {/* Entry Hero Overlay */}
      <AnimatePresence>
        {!hasStarted && <HeroOverlay onBegin={handleBeginVirtualization} />}
      </AnimatePresence>

      {/* FULL-WIDTH 2D PANNABLE PLAYGROUND CANVAS */}
      <ArchitectureGraph
        graphMode={graphMode}
        audienceMode={audienceMode}
        activeJourney={activeJourney}
        onSelectJourney={setActiveJourney}
        activeTrace={activeTrace}
        currentStepIndex={currentStepIndex}
        isPlaying={isPlaying}
        cicdAutoLoop={cicdAutoLoop}
        onToggleCicdAutoRun={handleToggleCicdAutoRun}
        onToggleCicdLoop={() => setCicdAutoLoop((v) => !v)}
        selectedNodeId={inspectedNodeId}
        onSelectNode={(id) =>
          setInspectedNodeId((prev) => (prev === id ? null : id))
        }
        clusterState={clusterState}
      />

      {/* CLEAN SINGLE-ROW FLOATING TOP BAR */}
      <header className="fixed top-3 left-4 right-4 h-14 z-30 flex items-center justify-between gap-2 rounded-2xl border border-white/[0.1] bg-[#0C0F17]/92 px-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {/* Left: Brand & C4 Architecture Level Switcher */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Ascend"
              className="h-5 w-4 object-contain shrink-0"
            />
            <span className="text-sm sm:text-base font-semibold tracking-tight text-white">
              Ascend
            </span>
          </div>

          <div
            id="tour-c4-tabs"
            className="inline-flex rounded-xl border border-white/[0.08] bg-black/40 p-0.5 text-[11px] sm:text-xs shrink-0"
          >
            <button
              type="button"
              onClick={() => setGraphMode("runtime")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                graphMode === "runtime"
                  ? "bg-white/12 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              C2 · Pods
            </button>
            <button
              type="button"
              onClick={() => setGraphMode("c3")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                graphMode === "c3"
                  ? "bg-white/12 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              C3 · Internals
            </button>
            <button
              type="button"
              onClick={() => setGraphMode("cicd")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                graphMode === "cicd"
                  ? "bg-white/12 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cloud Deploy
            </button>
          </div>
        </div>

        {/* Center: Audience Mode Toggle */}
        <div
          id="tour-audience"
          className="hidden lg:inline-flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-0.5 text-xs shrink-0"
        >
          <button
            type="button"
            onClick={() => setAudienceMode("plain")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
              audienceMode === "plain"
                ? "bg-emerald-500/20 text-emerald-200"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BookOpenCheck className="h-3.5 w-3.5" />
            Plain English
          </button>
          <button
            type="button"
            onClick={() => setAudienceMode("technical")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
              audienceMode === "technical"
                ? "bg-sky-500/20 text-sky-200"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Technical
          </button>
        </div>

        {/* Right: Playback, Schemas & Data, and Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleTogglePlaybackMode("auto")}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium cursor-pointer ${
                playbackMode === "auto"
                  ? "bg-white/12 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-3 w-3 text-sky-400" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span className="hidden md:inline">Auto</span>
            </button>
            <button
              type="button"
              onClick={() => handleTogglePlaybackMode("step")}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium cursor-pointer ${
                playbackMode === "step"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <StepForward className="h-3 w-3" />
              <span className="hidden md:inline">Step</span>
            </button>
          </div>

          <div className="hidden xl:inline-flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-0.5 text-xs">
            {([0.5, 1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded-lg font-medium cursor-pointer ${
                  speed === s
                    ? "bg-white/12 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!activeTrace}
            onClick={handleReplayTrace}
            title="Replay flow"
            className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] p-2 text-zinc-300 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            id="tour-schemas"
            type="button"
            onClick={() => setReferenceSheetTab("schemas")}
            title="Inspect DB architecture, real Prisma/DynamoDB/MongoDB schemas, and live localStorage data"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] px-2.5 py-1.5 text-xs font-medium text-zinc-200 cursor-pointer"
          >
            <Database className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">Schemas & Data</span>
          </button>

          <button
            type="button"
            onClick={handleResetCluster}
            title="Reset browser simulation data"
            className="inline-flex items-center gap-1 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] hover:bg-rose-500/15 px-2.5 py-1.5 text-xs font-medium text-rose-200 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* FLOATING TOP-RIGHT: Either Clicked Node Detail OR Live Rank-Up Toast */}
      <AnimatePresence mode="wait">
        {inspectedNodeId ? (
          <FloatingNodeCard
            key="node-card"
            nodeId={inspectedNodeId}
            audienceMode={audienceMode}
            onClose={() => setInspectedNodeId(null)}
            onOpenSchemas={() => setReferenceSheetTab("schemas")}
          />
        ) : latestNotif && latestNotif.type === "RANK_UP" ? (
          <motion.div
            key={`toast-${latestNotif._id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-[76px] right-4 z-30 w-[310px] rounded-2xl border border-amber-400/40 bg-[#14120C]/95 p-3.5 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-2.5"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Bell className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-amber-100">
                  {latestNotif.title}
                </div>
                <div className="text-[11px] text-amber-200/80 mt-0.5 leading-snug">
                  {latestNotif.body}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                startTrace(buildAckNotificationTrace(clusterState, latestNotif._id))
              }
              className="shrink-0 rounded-lg bg-amber-400/20 hover:bg-amber-400/35 border border-amber-400/40 px-2 py-1 text-[10.5px] font-semibold text-amber-200 cursor-pointer"
            >
              ACK
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* LEFT EXTREME FLOATING STEPS CARD (Only opens after user triggers a dock action) */}
      <AnimatePresence>
        {renderStepsCard && (
          <FloatingStepCard
            activeTrace={activeTrace}
            currentStepIndex={currentStepIndex}
            audienceMode={audienceMode}
            playbackMode={playbackMode}
            isPlaying={isPlaying}
            onStepNext={handleStepNext}
            onStepPrev={handleStepPrev}
            onJumpToStep={handleJumpToStep}
            onDismiss={() => {
              setShowStepsCard(false);
              if (!showRulesCard) {
                setIsPlaying(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* RIGHT EXTREME FLOATING RULES VERIFIED CARD (Only opens after user triggers a dock action) */}
      <AnimatePresence>
        {renderRulesCard && (
          <FloatingRulesCard
            activeTrace={activeTrace}
            currentStepIndex={currentStepIndex}
            onDismiss={() => setShowRulesCard(false)}
          />
        )}
      </AnimatePresence>

      {/* BOTTOM FLOATING DOCK + POP-UP INPUT ACTION CARDS */}
      <ClientSimulator
        clusterState={clusterState}
        audienceMode={audienceMode}
        openPanel={openDockPanel}
        completedJourneys={completedJourneys}
        onTogglePanel={handleToggleDockPanel}
        onClosePanel={() => setOpenDockPanel(null)}
        onStartTour={launchGuidedTour}
        onTriggerAuth={(input) => startTrace(buildAuthTrace(clusterState, input))}
        onTriggerCreateTask={(input) =>
          startTrace(buildCreateTaskTrace(clusterState, input))
        }
        onTriggerCreateGoal={(input) =>
          startTrace(buildCreateGoalTrace(clusterState, input))
        }
        onTriggerCreateHabit={(input) =>
          startTrace(buildCreateHabitTrace(clusterState, input))
        }
        onTriggerHabitCron={(input) =>
          startTrace(buildHabitCronTrace(clusterState, input))
        }
        onTriggerCompleteTask={(taskId) =>
          startTrace(buildCompleteHabitTrace(clusterState, taskId))
        }
        onTriggerReflection={(input) =>
          startTrace(buildReflectionTrace(clusterState, input))
        }
        onTriggerAckNotification={(id) =>
          startTrace(buildAckNotificationTrace(clusterState, id))
        }
        onTriggerCicdDeploy={(input) =>
          startTrace(buildCicdDeployTrace(clusterState, input))
        }
      />

      {/* ON-DEMAND FLOATING REFERENCE MODAL (Why 4 DBs, Real Schemas, Live localStorage) */}
      <AnimatePresence>
        {referenceSheetTab && (
          <FloatingReferenceModal
            openTab={referenceSheetTab}
            onChangeTab={setReferenceSheetTab}
            onClose={() => setReferenceSheetTab(null)}
            clusterState={clusterState}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
