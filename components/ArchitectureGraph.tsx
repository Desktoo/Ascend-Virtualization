"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bell,
  BookOpen,
  Box,
  Check,
  ChevronRight,
  Clock,
  Cloud,
  Container,
  Cpu,
  Database,
  FileCode2,
  FileText,
  Flame,
  GitBranch,
  Globe,
  HardDrive,
  History,
  KeyRound,
  Laptop,
  Layers,
  ListChecks,
  Lock,
  Maximize2,
  Minus,
  Move,
  Pause,
  Play,
  Plus,
  Radio,
  Repeat,
  Route,
  Server,
  Shield,
  Trophy,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  ALL_NODES,
  AnyNodeId,
  C3ComponentItem,
  C3IconKey,
  C4_LEVEL3_LAYERS,
  CICD_EDGES,
  CICD_NODES,
  GraphEdgeDef,
  GraphMode,
  GraphNodeDef,
  RUNTIME_EDGES,
  RUNTIME_NODES,
} from "@/lib/architectureData";
import {
  ExecutionTrace,
  JourneyKey,
  TraceStep,
  VirtualClusterState,
} from "@/lib/simulationEngine";

export type AudienceMode = "plain" | "technical";

interface ArchitectureGraphProps {
  graphMode: GraphMode;
  audienceMode: AudienceMode;
  activeJourney: JourneyKey;
  onSelectJourney?: (journey: JourneyKey) => void;
  activeTrace: ExecutionTrace | null;
  currentStepIndex: number;
  isPlaying?: boolean;
  cicdAutoLoop?: boolean;
  onToggleCicdAutoRun?: () => void;
  onToggleCicdLoop?: () => void;
  selectedNodeId: AnyNodeId | null;
  onSelectNode: (id: AnyNodeId) => void;
  clusterState: VirtualClusterState;
}

const C3_ICONS: Record<C3IconKey, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  key: KeyRound,
  route: Route,
  radio: Radio,
  lock: Lock,
  list: ListChecks,
  flame: Flame,
  trophy: Trophy,
  book: BookOpen,
  clock: Clock,
  layers: Layers,
  zap: Zap,
  bell: Bell,
  database: Database,
  cpu: Cpu,
  history: History,
  file: FileText,
};

const C3_FLOW_PILLS: { key: JourneyKey; label: string }[] = [
  { key: "auth", label: "Sign Up / In" },
  { key: "task", label: "Task" },
  { key: "goal", label: "Goal" },
  { key: "habit", label: "Habit + Cron" },
  { key: "complete", label: "Check Off & XP" },
  { key: "reflection", label: "Reflection" },
];

const NODE_ICONS: Record<AnyNodeId, React.ComponentType<{ className?: string }>> = {
  browser: Laptop,
  client: Globe,
  ingress: Shield,
  nestjs: Server,
  postgres: Database,
  upstash: Zap,
  redis: Flame,
  dynamodb: History,
  mongodb: Layers,
  socketio: Radio,
  github: GitBranch,
  actions: Workflow,
  dockerhub: Container,
  argocd: Activity,
  helm: Box,
  sealedsecrets: KeyRound,
  gke: Cloud,
  gke_ingress: Shield,
};

function computeCurvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curveOffset = 0,
): { d: string; labelX: number; labelY: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = mx + nx * curveOffset;
  const cy = my + ny * curveOffset;

  return {
    d: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
    labelX: 0.25 * from.x + 0.5 * cx + 0.25 * to.x,
    labelY: 0.25 * from.y + 0.5 * cy + 0.25 * to.y,
  };
}

function PodHexIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        stroke={color}
        strokeWidth={active ? "2" : "1.5"}
        fill={active ? `${color}30` : `${color}14`}
      />
      <circle cx="12" cy="12" r="2.6" fill={active ? "#FFFFFF" : color} />
    </svg>
  );
}

export function ArchitectureGraph({
  graphMode,
  audienceMode,
  activeJourney,
  onSelectJourney,
  activeTrace,
  currentStepIndex,
  isPlaying = false,
  cicdAutoLoop = false,
  onToggleCicdAutoRun,
  onToggleCicdLoop,
  selectedNodeId,
  onSelectNode,
  clusterState,
}: ArchitectureGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 680 });
  const [userZoom, setUserZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedC3Item, setSelectedC3Item] = useState<{
    item: C3ComponentItem;
    accent: string;
    layerTitle: string;
  } | null>(null);

  const dragOriginRef = useRef<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  } | null>(null);

  const stageW = graphMode === "runtime" ? 1280 : 1200;
  const stageH = graphMode === "runtime" ? 640 : 620;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [graphMode]);

  // Attach non-passive wheel listener for smooth 2D horizontal + vertical panning & Ctrl/Pinch zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el || graphMode === "c3") return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.002;
        setUserZoom((z) => Math.max(0.65, Math.min(1.8, +(z + delta).toFixed(3))));
      } else {
        // Support horizontal + vertical trackpad scroll & Shift+Wheel horizontal pan
        const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
        setPan((p) => ({
          x: Math.max(-700, Math.min(700, p.x - dx)),
          y: Math.max(-450, Math.min(450, p.y - dy)),
        }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [graphMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only start canvas drag if user presses directly on background (not inside a node button)
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const dx = e.clientX - origin.startX;
    const dy = e.clientY - origin.startY;
    if (Math.hypot(dx, dy) > 3) origin.moved = true;
    setPan({
      x: Math.max(-700, Math.min(700, origin.origPanX + dx)),
      y: Math.max(-450, Math.min(450, origin.origPanY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragOriginRef.current) {
      dragOriginRef.current = null;
      setIsDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleResetView = () => {
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const fitScale = useMemo(() => {
    const padX = 36;
    const padY = 24;
    const availW = Math.max(280, containerSize.width - padX);
    const availH = Math.max(220, containerSize.height - padY);
    return Math.min(availW / stageW, availH / stageH, 1.06);
  }, [containerSize.width, containerSize.height, stageW, stageH]);

  const finalScale = Math.max(0.4, Math.min(1.8, fitScale * userZoom));
  const isViewModified = userZoom !== 1 || pan.x !== 0 || pan.y !== 0;

  const nodes: GraphNodeDef[] =
    graphMode === "runtime" ? RUNTIME_NODES : CICD_NODES;
  const edges: GraphEdgeDef[] =
    graphMode === "runtime" ? RUNTIME_EDGES : CICD_EDGES;

  const activeStep: TraceStep | null =
    activeTrace &&
    activeTrace.graphMode === graphMode &&
    currentStepIndex >= 0 &&
    currentStepIndex < activeTrace.steps.length
      ? activeTrace.steps[currentStepIndex]
      : null;

  const visitedNodes = useMemo(() => {
    const set = new Set<AnyNodeId>();
    if (!activeTrace || activeTrace.graphMode !== graphMode) return set;
    for (let i = 0; i <= currentStepIndex && i < activeTrace.steps.length; i++) {
      set.add(activeTrace.steps[i].fromNode);
      set.add(activeTrace.steps[i].toNode);
      set.add(activeTrace.steps[i].activeNode);
    }
    return set;
  }, [activeTrace, currentStepIndex, graphMode]);

  const activePacketPath = useMemo(() => {
    if (!activeStep) return null;
    const fromNode = ALL_NODES[activeStep.fromNode];
    const toNode = ALL_NODES[activeStep.toNode];
    if (
      !fromNode ||
      !toNode ||
      fromNode.mode !== graphMode ||
      toNode.mode !== graphMode
    ) {
      return null;
    }

    const matchingForward = edges.find(
      (e) => e.from === activeStep.fromNode && e.to === activeStep.toNode,
    );
    if (matchingForward) {
      return {
        ...computeCurvePath(fromNode, toNode, matchingForward.curveOffset ?? 0),
        accent: ALL_NODES[activeStep.activeNode]?.accent ?? "#38BDF8",
        pillLabel:
          audienceMode === "plain"
            ? matchingForward.plainLabel
            : matchingForward.label,
      };
    }

    const matchingReverse = edges.find(
      (e) => e.from === activeStep.toNode && e.to === activeStep.fromNode,
    );
    if (matchingReverse) {
      return {
        ...computeCurvePath(
          fromNode,
          toNode,
          -(matchingReverse.curveOffset ?? 0),
        ),
        accent: ALL_NODES[activeStep.activeNode]?.accent ?? "#38BDF8",
        pillLabel:
          audienceMode === "plain"
            ? activeStep.operationBadge
            : matchingReverse.label,
      };
    }

    const defaultCurve =
      activeStep.fromNode === "nestjs" && activeStep.toNode === "browser"
        ? -130
        : activeStep.fromNode === "browser" && activeStep.toNode === "nestjs"
          ? -80
          : 55;
    return {
      ...computeCurvePath(fromNode, toNode, defaultCurve),
      accent: ALL_NODES[activeStep.activeNode]?.accent ?? "#38BDF8",
      pillLabel: activeStep.operationBadge,
    };
  }, [activeStep, edges, graphMode, audienceMode]);

  // ==========================================================================
  // C4 LEVEL 3 VIEW: SIMPLE, VISUAL 4-STAGE NESTJS FLOW (2D Scrollable)
  // ==========================================================================
  if (graphMode === "c3") {
    const highlightJourney: JourneyKey =
      activeJourney === "cicd" ? "auth" : activeJourney;

    return (
      <div
        id="tour-playground"
        className="w-full h-full bg-[#07090F] bg-playground-dots relative overflow-auto pt-[84px] pb-32 px-5 sm:px-8"
      >
        <div className="min-w-[1140px] max-w-6xl mx-auto space-y-6">
          {/* Compact Header + Interactive Flow Selector Pills */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                {audienceMode === "plain"
                  ? "Inside NestJS API"
                  : "C3 · NestJS Internal Flow"}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Pick a flow to trace left-to-right, or click any module to see details.
              </p>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-white/[0.09] bg-[#0C101A]/90 p-1.5 backdrop-blur-md">
              {C3_FLOW_PILLS.map((pill) => {
                const isActive = highlightJourney === pill.key;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => {
                      onSelectJourney?.(pill.key);
                      setSelectedC3Item(null);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-sky-500/20 text-sky-200 border border-sky-400/40"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Stage Visual Flow with Directional Arrows */}
          <div className="flex items-stretch gap-2.5">
            {C4_LEVEL3_LAYERS.map((layer, layerIdx) => {
              const activeCount = layer.items.filter((i) =>
                i.journeyTags.includes(highlightJourney),
              ).length;

              return (
                <div key={layer.id} className="flex items-stretch flex-1 min-w-0 gap-2.5">
                  <div className="flex-1 min-w-0 rounded-3xl border border-white/[0.09] bg-[#0C101A]/90 p-4 flex flex-col gap-3 backdrop-blur-md">
                    {/* Stage Header */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/[0.07]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          style={{
                            backgroundColor: `${layer.accent}20`,
                            borderColor: `${layer.accent}55`,
                            color: layer.accent,
                          }}
                          className="h-6 w-6 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0"
                        >
                          {layer.stepNum}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-[13.5px] font-semibold text-white leading-snug">
                            {audienceMode === "plain"
                              ? layer.plainTitle
                              : layer.title}
                          </h3>
                          <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                            {audienceMode === "plain"
                              ? layer.plainSubtitle
                              : layer.subtitle}
                          </p>
                        </div>
                      </div>
                      {activeCount > 0 && (
                        <span
                          style={{
                            color: layer.accent,
                            backgroundColor: `${layer.accent}15`,
                          }}
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                        >
                          {activeCount}
                        </span>
                      )}
                    </div>

                    {/* Clean Compact Module Cards */}
                    <div className="space-y-2">
                      {layer.items.map((item) => {
                        const isUsed = item.journeyTags.includes(highlightJourney);
                        const isSelected = selectedC3Item?.item.id === item.id;
                        const Icon = C3_ICONS[item.icon];

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setSelectedC3Item((prev) =>
                                prev?.item.id === item.id
                                  ? null
                                  : {
                                      item,
                                      accent: layer.accent,
                                      layerTitle:
                                        audienceMode === "plain"
                                          ? layer.plainTitle
                                          : layer.title,
                                    },
                              )
                            }
                            style={{
                              borderColor: isSelected
                                ? layer.accent
                                : isUsed
                                  ? `${layer.accent}60`
                                  : "rgba(255,255,255,0.06)",
                              boxShadow: isUsed
                                ? `0 0 18px ${layer.accent}18`
                                : undefined,
                            }}
                            className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-2.5 transition-all cursor-pointer ${
                              isUsed
                                ? "bg-[#121828] hover:bg-[#161E32]"
                                : "bg-black/25 opacity-35 hover:opacity-85"
                            }`}
                          >
                            <div
                              style={{
                                backgroundColor: isUsed
                                  ? `${layer.accent}1C`
                                  : "rgba(255,255,255,0.04)",
                                color: isUsed ? layer.accent : "#71717A",
                              }}
                              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[12.5px] font-semibold text-white leading-tight">
                                  {audienceMode === "plain"
                                    ? item.plainName
                                    : item.name}
                                </span>
                                {isUsed && (
                                  <span
                                    style={{ backgroundColor: layer.accent }}
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                  />
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                                {audienceMode === "plain"
                                  ? item.plainTagline
                                  : item.role}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Flow Connector Arrow Between Stages */}
                  {layerIdx < C4_LEVEL3_LAYERS.length - 1 && (
                    <div className="flex items-center justify-center shrink-0">
                      <div className="h-7 w-7 rounded-full border border-white/[0.08] bg-[#0C101A] flex items-center justify-center text-zinc-400">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Click-to-Inspect Floating Module Detail Card */}
        <AnimatePresence>
          {selectedC3Item && (
            <motion.div
              key={selectedC3Item.item.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed bottom-[94px] right-5 z-30 w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/[0.14] bg-[#0C101A]/96 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    style={{
                      color: selectedC3Item.accent,
                      backgroundColor: `${selectedC3Item.accent}1A`,
                    }}
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mb-1.5"
                  >
                    {selectedC3Item.layerTitle}
                  </span>
                  <h4 className="text-sm font-semibold text-white">
                    {selectedC3Item.item.plainName}
                  </h4>
                  <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    {selectedC3Item.item.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedC3Item(null)}
                  className="rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedC3Item.item.detail}
              </p>

              <div className="flex items-start gap-1.5 rounded-xl border border-white/[0.07] bg-black/35 px-2.5 py-1.5 text-[11px] font-mono text-zinc-400 break-all">
                <FileCode2 className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>{selectedC3Item.item.repoPath}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================================================
  // C2 RUNTIME & CI/CD INTERACTIVE 2D PAN + ZOOM PLAYGROUND
  // ==========================================================================
  const authTraceInProgress =
    activeTrace?.journey === "auth" &&
    currentStepIndex >= 0 &&
    currentStepIndex < activeTrace.steps.length - 1;
  const browserCookiesVerified =
    Boolean(clusterState.session.jwt) && !authTraceInProgress;

  return (
    <div
      id="tour-playground"
      className="w-full h-full bg-[#07090F] bg-playground-dots relative flex flex-col pt-[72px] pb-[90px] px-4"
    >
      {/* Ambient spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_55%_42%,rgba(56,189,248,0.065),transparent_70%)]" />

      {/* Subtle Canvas Header Strip (Hint / Cloud Deploy Auto-Run + 2D Pan/Zoom Controls) */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-2 pt-2 pb-1 shrink-0">
        {graphMode === "cicd" ? (
          <div className="inline-flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleCicdAutoRun}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer backdrop-blur-md ${
                isPlaying && activeTrace?.graphMode === "cicd"
                  ? "border-amber-400/45 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 shadow-[0_0_20px_rgba(251,191,36,0.16)]"
                  : "border-emerald-400/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 shadow-[0_0_24px_rgba(52,211,153,0.2)]"
              }`}
            >
              {isPlaying && activeTrace?.graphMode === "cicd" ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause Auto-Run</span>
                </>
              ) : activeTrace?.graphMode === "cicd" &&
                currentStepIndex >= 0 &&
                currentStepIndex < activeTrace.steps.length - 1 ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume Auto-Run</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Auto-Run Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleCicdLoop}
              title="Continuously loop through all 8 Cloud Deploy sections"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer backdrop-blur-md ${
                cicdAutoLoop
                  ? "border-sky-400/45 bg-sky-500/15 text-sky-200"
                  : "border-white/[0.09] bg-[#0D1018]/85 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>{cicdAutoLoop ? "Loop On" : "Loop"}</span>
            </button>

            {activeTrace?.graphMode === "cicd" && activeStep && (
              <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0D1018]/85 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Section {currentStepIndex + 1}/{activeTrace.steps.length}:{" "}
                  <strong className="text-white font-semibold">
                    {ALL_NODES[activeStep.activeNode]?.plainName}
                  </strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0D1018]/80 px-3.5 py-1 text-xs text-zinc-400 backdrop-blur-md">
            <Move className="h-3 w-3 text-sky-400" />
            <span>
              Drag or scroll 2D to pan · Click any pod or DB · Pick an action on the dock
            </span>
          </div>
        )}

        {/* Clean Zoom & Center Controls */}
        <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/[0.09] bg-[#0D1018]/85 px-2 py-1 text-xs text-zinc-300 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setUserZoom((z) => Math.max(0.65, +(z - 0.12).toFixed(2)))}
            title="Zoom out"
            className="rounded-full p-1 hover:bg-white/[0.08] cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset zoom & center canvas"
            className="px-2 py-0.5 rounded-full hover:bg-white/[0.08] text-[11px] font-medium cursor-pointer"
          >
            {Math.round(finalScale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setUserZoom((z) => Math.min(1.8, +(z + 0.12).toFixed(2)))}
            title="Zoom in"
            className="rounded-full p-1 hover:bg-white/[0.08] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {isViewModified && (
            <button
              type="button"
              onClick={handleResetView}
              title="Re-center & fit canvas"
              className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 hover:bg-sky-500/25 px-2 py-0.5 text-[11px] font-medium text-sky-300 cursor-pointer ml-0.5"
            >
              <Maximize2 className="h-3 w-3" />
              Fit
            </button>
          )}
        </div>
      </div>

      {/* Measured 2D Pannable & Zoomable Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden touch-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          style={{
            width: `${stageW}px`,
            height: `${stageH}px`,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${finalScale})`,
            transformOrigin: "center center",
          }}
          className={`relative shrink-0 select-none ${
            isDragging ? "" : "transition-transform duration-150 ease-out"
          }`}
        >
          {/* Layer 1: C4 Zone Boundaries, Curved Edges & Active Packet */}
          <svg
            width={stageW}
            height={stageH}
            viewBox={`0 0 ${stageW} ${stageH}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
          >
            <defs>
              <filter id="orbGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="edge-arrow-idle"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="rgba(255,255,255,0.18)" />
              </marker>
            </defs>

            {/* 3 Distinct C4 Zones in Runtime Mode */}
            {graphMode === "runtime" && (
              <g>
                <rect
                  x="12"
                  y="24"
                  width="202"
                  height="592"
                  rx="26"
                  fill="rgba(56,189,248,0.015)"
                  stroke="rgba(255,255,255,0.11)"
                  strokeDasharray="6 6"
                />
                <text
                  x="113"
                  y="50"
                  textAnchor="middle"
                  fill="rgba(228,228,231,0.82)"
                  fontSize="12.5"
                  fontWeight="600"
                >
                  User&apos;s Computer
                </text>

                <rect
                  x="236"
                  y="24"
                  width="702"
                  height="592"
                  rx="28"
                  fill="rgba(56,189,248,0.022)"
                  stroke="rgba(56,189,248,0.22)"
                  strokeDasharray="7 6"
                />
                <text
                  x="262"
                  y="50"
                  fill="rgba(125,211,252,0.88)"
                  fontSize="12.5"
                  fontWeight="600"
                >
                  GKE Cluster · namespace: prod (6 min pods: 2 Web · 3 API · 1 Redis)
                </text>

                <rect
                  x="964"
                  y="24"
                  width="302"
                  height="592"
                  rx="26"
                  fill="rgba(255,255,255,0.012)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeDasharray="6 6"
                />
                <text
                  x="1115"
                  y="50"
                  textAnchor="middle"
                  fill="rgba(161,161,170,0.82)"
                  fontSize="12.5"
                  fontWeight="600"
                >
                  Managed Cloud Databases
                </text>
              </g>
            )}

            {/* Idle Connections */}
            {edges.map((edge) => {
              const from = ALL_NODES[edge.from];
              const to = ALL_NODES[edge.to];
              if (!from || !to) return null;
              const { d } = computeCurvePath(from, to, edge.curveOffset ?? 0);
              const isEdgeActive =
                activeStep &&
                ((activeStep.fromNode === edge.from &&
                  activeStep.toNode === edge.to) ||
                  (activeStep.fromNode === edge.to &&
                    activeStep.toNode === edge.from));

              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={
                    isEdgeActive
                      ? "rgba(56, 189, 248, 0.35)"
                      : "rgba(255, 255, 255, 0.09)"
                  }
                  strokeWidth={isEdgeActive ? 2.6 : 1.4}
                  markerEnd={isEdgeActive ? undefined : "url(#edge-arrow-idle)"}
                />
              );
            })}

            {/* Active Animated Packet Beam + Label */}
            {activeStep && activePacketPath && (
              <g key={`${activeTrace?.id}-${activeStep.id}`}>
                <path
                  d={activePacketPath.d}
                  fill="none"
                  stroke={activePacketPath.accent}
                  strokeWidth="3.2"
                  strokeOpacity="0.92"
                  strokeDasharray="8 6"
                  className="animate-dash-flow"
                />
                <circle
                  r="8.5"
                  fill={activePacketPath.accent}
                  filter="url(#orbGlow)"
                >
                  <animateMotion
                    dur="1.15s"
                    repeatCount="indefinite"
                    path={activePacketPath.d}
                  />
                </circle>
                <circle r="3.8" fill="#FFFFFF">
                  <animateMotion
                    dur="1.15s"
                    repeatCount="indefinite"
                    path={activePacketPath.d}
                  />
                </circle>

                <g
                  transform={`translate(${activePacketPath.labelX}, ${activePacketPath.labelY})`}
                >
                  <rect
                    x="-60"
                    y="-13"
                    width="120"
                    height="26"
                    rx="13"
                    fill="#0B0E16"
                    stroke={activePacketPath.accent}
                    strokeWidth="1.4"
                  />
                  <text
                    x="0"
                    y="4.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {activePacketPath.pillLabel}
                  </text>
                </g>
              </g>
            )}
          </svg>

          {/* Layer 2: Fixed-Pixel Nodes Inside 2D Pannable Canvas */}
          {nodes.map((node) => {
            const Icon = NODE_ICONS[node.id];
            const isTargetActive = activeStep?.activeNode === node.id;
            const isInvolved =
              activeStep?.fromNode === node.id ||
              activeStep?.toNode === node.id ||
              isTargetActive;
            const isVisited = visitedNodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const isDimmed = Boolean(activeStep) && !isInvolved && !isVisited;

            const podList = node.pods ?? [];
            const activePodIdx =
              podList.length > 0 && isInvolved
                ? Math.max(0, currentStepIndex) % podList.length
                : -1;

            // STYLE 0: USER'S COMPUTER / CLIENT BROWSER WINDOW
            if (node.nodeKind === "client-device") {
              return (
                <motion.button
                  key={node.id}
                  data-tour={`node-${node.id}`}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  initial={false}
                  animate={{
                    scale: isTargetActive ? 1.05 : 1,
                    opacity: isDimmed ? 0.58 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: "174px",
                    boxShadow: isTargetActive
                      ? `0 0 38px ${node.glow}, 0 0 0 1.5px ${node.accent}`
                      : isSelected
                        ? "0 0 24px rgba(255,255,255,0.14), 0 0 0 1.5px rgba(255,255,255,0.4)"
                        : "0 14px 32px rgba(0,0,0,0.5)",
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border overflow-hidden text-left backdrop-blur-xl transition-colors cursor-pointer ${
                    isTargetActive
                      ? "bg-[#111827]/95 border-sky-400/60 z-20"
                      : "bg-[#0D111C]/94 border-white/[0.15] hover:border-white/35"
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-white/[0.03]">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-400/75" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/75" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/75" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                      <Lock className="h-2.5 w-2.5 text-emerald-400" />
                      ascendup.online
                    </span>
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                        <Laptop className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white leading-tight truncate">
                          User&apos;s Browser
                        </div>
                        <div className="text-[10.5px] text-zinc-400 leading-tight truncate">
                          Client Computer
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/45 p-2 space-y-1.5">
                      <div className="text-[9.5px] font-medium text-zinc-400 uppercase tracking-wide">
                        Browser Cookie Jar
                      </div>
                      {[
                        { label: "HttpOnly (XSS Safe)", ok: browserCookiesVerified },
                        { label: "Secure + SameSite", ok: browserCookiesVerified },
                        { label: "access + refresh JWT", ok: browserCookiesVerified },
                      ].map((flag) => (
                        <div
                          key={flag.label}
                          className="flex items-center gap-1.5 text-[10.5px]"
                        >
                          <span
                            className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              flag.ok
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/[0.06] text-zinc-500"
                            }`}
                          >
                            <Check className="h-2.5 w-2.5" />
                          </span>
                          <span
                            className={
                              flag.ok ? "text-emerald-200 truncate" : "text-zinc-500 truncate"
                            }
                          >
                            {flag.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.button>
              );
            }

            // STYLE A: KUBERNETES CONTAINER POD CLUSTER
            if (
              (node.nodeKind === "k8s-deployment" || node.nodeKind === "k8s-job") &&
              podList.length > 0
            ) {
              const isSixPodGrid = podList.length >= 4;
              const podCardW = isSixPodGrid
                ? 298
                : podList.length === 3
                  ? 272
                  : 236;

              return (
                <motion.button
                  key={node.id}
                  data-tour={`node-${node.id}`}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  initial={false}
                  animate={{
                    scale: isTargetActive ? 1.04 : 1,
                    opacity: isDimmed ? 0.52 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${podCardW}px`,
                    boxShadow: isTargetActive
                      ? `0 0 38px ${node.glow}`
                      : isSelected
                        ? "0 0 22px rgba(255,255,255,0.12)"
                        : undefined,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-dashed px-3 py-2.5 text-left backdrop-blur-md transition-colors cursor-pointer ${
                    isTargetActive
                      ? "bg-[#111624]/92 border-white/45 z-20"
                      : isSelected
                        ? "bg-[#101522]/88 border-white/35 z-10"
                        : "bg-[#0B0F19]/80 border-white/[0.17] hover:border-white/35"
                  }`}
                >
                  <AnimatePresence>
                    {isTargetActive && activeStep && (
                      <motion.span
                        initial={{ opacity: 0, y: 6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4 }}
                        style={{ backgroundColor: node.accent }}
                        className="absolute -top-3.5 left-4 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold text-zinc-950 shadow-lg whitespace-nowrap"
                      >
                        Step {activeStep.index + 1} · {activeStep.latencyMs}ms
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                    <span className="text-xs font-semibold text-white truncate">
                      {audienceMode === "plain" ? node.plainName : node.shortLabel}
                    </span>
                    {node.hpaSummary && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 shrink-0"
                        style={{ color: isTargetActive ? node.accent : undefined }}
                      >
                        {node.hpaSummary}
                      </span>
                    )}
                  </div>

                  <div
                    className={`grid gap-2 ${
                      isSixPodGrid || podList.length === 3
                        ? "grid-cols-3"
                        : podList.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-1"
                    }`}
                  >
                    {podList.map((pod, pIdx) => {
                      const podGlowing =
                        isTargetActive &&
                        (isSixPodGrid || podList.length === 1 || pIdx === activePodIdx);
                      const podAccent = pod.name.startsWith("web")
                        ? "#E4E4E7"
                        : pod.name.startsWith("redis")
                          ? "#F87171"
                          : node.accent;

                      return (
                        <div
                          key={pod.name}
                          style={{
                            borderColor: podGlowing
                              ? podAccent
                              : "rgba(255,255,255,0.12)",
                            boxShadow: podGlowing
                              ? `0 0 16px ${podAccent}55`
                              : undefined,
                          }}
                          className={`rounded-2xl border px-2.5 py-2 flex flex-col gap-1 transition-all ${
                            podGlowing ? "bg-[#171E30]" : "bg-[#0E1320]/95"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <PodHexIcon color={podAccent} active={podGlowing} />
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                podGlowing
                                  ? "bg-emerald-300 animate-ping"
                                  : "bg-emerald-400/80"
                              }`}
                            />
                          </div>
                          <div className="text-[11px] font-semibold text-zinc-100 leading-none truncate">
                            {pod.name}
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[9.5px] text-zinc-400 leading-none">
                            <span className="truncate">
                              {pod.port ?? pod.resources ?? "pod"}
                            </span>
                            {pod.pvc && (
                              <span className="inline-flex items-center gap-0.5 text-amber-300/90 shrink-0">
                                <HardDrive className="h-2.5 w-2.5" />
                                {pod.pvc}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.button>
              );
            }

            // STYLE B: EXTERNAL MANAGED DATABASE CYLINDER
            if (node.nodeKind === "managed-db") {
              return (
                <motion.button
                  key={node.id}
                  data-tour={`node-${node.id}`}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  initial={false}
                  animate={{
                    scale: isTargetActive ? 1.05 : 1,
                    opacity: isDimmed ? 0.52 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: "228px",
                    boxShadow: isTargetActive
                      ? `0 0 36px ${node.glow}`
                      : "0 12px 28px rgba(0,0,0,0.45)",
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 text-left cursor-pointer ${
                    isTargetActive ? "z-20" : isSelected ? "z-10" : ""
                  }`}
                >
                  <AnimatePresence>
                    {isTargetActive && activeStep && (
                      <motion.span
                        initial={{ opacity: 0, y: 6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4 }}
                        style={{ backgroundColor: node.accent }}
                        className="absolute -top-4 left-3 z-30 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold text-zinc-950 shadow-lg whitespace-nowrap"
                      >
                        Step {activeStep.index + 1} · {activeStep.latencyMs}ms
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <div
                    style={{
                      borderColor: isTargetActive
                        ? node.accent
                        : isSelected
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.16)",
                    }}
                    className="h-5 w-full rounded-[50%] border bg-[#131929] relative z-10 -mb-2.5"
                  />
                  <div
                    style={{
                      borderColor: isTargetActive
                        ? node.accent
                        : isSelected
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.14)",
                    }}
                    className={`rounded-b-[26px] border-x border-b pt-4 pb-3.5 px-4 backdrop-blur-xl transition-colors ${
                      isTargetActive
                        ? "bg-[#131A2B]/95"
                        : "bg-[#0D111C]/92 hover:bg-[#121725]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span
                        className="text-[13px] font-semibold leading-tight truncate"
                        style={{ color: isTargetActive ? node.accent : "#FFFFFF" }}
                      >
                        {audienceMode === "plain" ? node.plainName : node.shortLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-snug truncate">
                      {audienceMode === "plain" ? node.plainTagline : node.subtitle}
                    </div>
                  </div>
                </motion.button>
              );
            }

            // STYLE C: GATEWAY / PIPELINE CAPSULE HUB
            return (
              <motion.button
                key={node.id}
                data-tour={`node-${node.id}`}
                type="button"
                onClick={() => onSelectNode(node.id)}
                initial={false}
                animate={{
                  scale: isTargetActive ? 1.05 : 1,
                  opacity: isDimmed ? 0.52 : 1,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: "216px",
                  boxShadow: isTargetActive
                    ? `0 0 36px ${node.glow}, 0 0 0 1.5px ${node.accent}`
                    : isSelected
                      ? "0 0 22px rgba(255,255,255,0.12), 0 0 0 1.5px rgba(255,255,255,0.45)"
                      : "0 10px 26px rgba(0,0,0,0.45)",
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3.5 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer backdrop-blur-xl ${
                  isTargetActive
                    ? "bg-[#121828]/95 border-white/40 z-20"
                    : "bg-[#0D111C]/92 border-white/[0.13] hover:border-white/30 hover:bg-[#131827]"
                }`}
              >
                <AnimatePresence>
                  {isTargetActive && activeStep && (
                    <motion.span
                      initial={{ opacity: 0, y: 6, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      style={{ backgroundColor: node.accent }}
                      className="absolute -top-3.5 left-4 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold text-zinc-950 shadow-lg whitespace-nowrap"
                    >
                      Step {activeStep.index + 1} · {activeStep.latencyMs}ms
                    </motion.span>
                  )}
                </AnimatePresence>

                <div
                  className="flex items-center justify-center h-8 w-8 rounded-full border border-white/15 bg-white/[0.05] shrink-0"
                  style={{ color: node.accent }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 pr-1">
                  <div className="text-[12.5px] font-semibold text-white leading-tight truncate">
                    {audienceMode === "plain" ? node.plainName : node.shortLabel}
                  </div>
                  <div className="text-[10.5px] text-zinc-400 leading-tight truncate mt-0.5">
                    {audienceMode === "plain" ? node.plainTagline : node.subtitle}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
