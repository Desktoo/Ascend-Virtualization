"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code2,
  Copy,
  Database,
  FileCode2,
  HardDrive,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  ALL_NODES,
  AnyNodeId,
  REAL_SCHEMAS,
  STORAGE_MATRIX,
} from "@/lib/architectureData";
import {
  DecodedJwt,
  ExecutionTrace,
  STORAGE_KEY,
  TraceStep,
  VirtualClusterState,
} from "@/lib/simulationEngine";
import { AudienceMode } from "./ArchitectureGraph";

export type ReferenceSheetTab = "matrix" | "schemas" | "storage";

// ============================================================================
// HELPER: COLOR-CODED RS256 JWT BREAKDOWN
// ============================================================================

function JwtBreakdown({ jwt }: { jwt: DecodedJwt }) {
  const parts = jwt.raw.split(".");
  return (
    <div className="space-y-2.5 mb-3">
      <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3 font-mono text-[11px] break-all leading-relaxed">
        <div className="text-[10px] font-sans font-medium text-emerald-400 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Signed RS256 JWT Token (15-minute expiry)
        </div>
        <span className="text-rose-400">{parts[0]}</span>
        <span className="text-zinc-600">.</span>
        <span className="text-violet-400">{parts[1]}</span>
        <span className="text-zinc-600">.</span>
        <span className="text-sky-400">{parts[2]}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-2.5">
          <div className="text-[10.5px] font-medium text-rose-300 mb-1">
            Header
          </div>
          <pre className="text-[10.5px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
            {JSON.stringify(jwt.header, null, 2)}
          </pre>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-2.5">
          <div className="text-[10.5px] font-medium text-violet-300 mb-1">
            Payload (User Claims)
          </div>
          <pre className="text-[10.5px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
            {JSON.stringify(jwt.payload, null, 2)}
          </pre>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-2.5">
          <div className="text-[10.5px] font-medium text-sky-300 mb-1">
            Digital Signature
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Cryptographically signed with server secret so nobody can forge a
            user ID or rank.
          </p>
          <div className="mt-2 text-[11px] font-medium text-emerald-400">
            ✓ Verified automatically
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: CLEAN COLLAPSIBLE JSON TREE FOR LOCALSTORAGE VIEWER
// ============================================================================

function JsonTreeNode({
  label,
  value,
  depth = 0,
  defaultOpen = false,
}: {
  label: string;
  value: unknown;
  depth?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth === 0);

  if (value === null || typeof value !== "object") {
    const rendered =
      typeof value === "string"
        ? `"${value.length > 72 ? value.slice(0, 72) + "…" : value}"`
        : String(value);
    const valColor =
      typeof value === "string"
        ? "text-emerald-300"
        : typeof value === "number"
          ? "text-sky-300"
          : typeof value === "boolean"
            ? "text-amber-300"
            : "text-zinc-500";
    return (
      <div className="flex items-start gap-1.5 py-0.5 pl-4 font-mono text-xs leading-relaxed">
        <span className="text-zinc-400 shrink-0">{label}:</span>
        <span className={`${valColor} break-all`}>{rendered}</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 py-1 text-left font-mono text-xs hover:text-white transition-colors w-full cursor-pointer"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        )}
        <span className="text-zinc-200 font-medium">{label}</span>
        <span className="text-zinc-500 text-[11px]">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>

      {open && (
        <div className="pl-4 border-l border-white/[0.08] ml-1.5">
          {entries.length === 0 ? (
            <div className="pl-3 py-0.5 text-xs font-mono text-zinc-600">
              {isArray ? "[]" : "{}"}
            </div>
          ) : (
            entries.map(([k, v]) => (
              <JsonTreeNode
                key={k}
                label={k}
                value={v}
                depth={depth + 1}
                defaultOpen={depth < 1 && entries.length <= 3}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 1A. FLOATING STEPS CARD (Left Extreme — Opens when user triggers dock action)
// ============================================================================

interface FloatingStepCardProps {
  activeTrace: ExecutionTrace | null;
  currentStepIndex: number;
  audienceMode: AudienceMode;
  playbackMode: "auto" | "step";
  isPlaying: boolean;
  onStepNext: () => void;
  onStepPrev: () => void;
  onJumpToStep: (idx: number) => void;
  onDismiss: () => void;
}

export function FloatingStepCard({
  activeTrace,
  currentStepIndex,
  audienceMode,
  playbackMode,
  isPlaying,
  onStepNext,
  onStepPrev,
  onJumpToStep,
  onDismiss,
}: FloatingStepCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeStep: TraceStep | null =
    activeTrace &&
    currentStepIndex >= 0 &&
    currentStepIndex < activeTrace.steps.length
      ? activeTrace.steps[currentStepIndex]
      : null;

  if (!activeTrace || !activeStep) return null;

  const fromNode = ALL_NODES[activeStep.fromNode];
  const toNode = ALL_NODES[activeStep.toNode];
  const codeVisible = showCode || audienceMode === "technical";

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <motion.div
      key={`step-card-${activeTrace.id}`}
      initial={{ opacity: 0, x: -24, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -24, y: 12 }}
      transition={{ duration: 0.25 }}
      className="fixed bottom-[94px] left-5 z-30 w-[400px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/[0.12] bg-[#0C101A]/95 shadow-[0_24px_80px_rgba(0,0,0,0.78)] backdrop-blur-xl overflow-hidden"
    >
      {/* Top Progress & Controls Strip */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="inline-flex items-center rounded-full bg-sky-500/20 border border-sky-400/30 px-2.5 py-0.5 font-semibold text-sky-200 shrink-0">
            Step {currentStepIndex + 1}/{activeTrace.steps.length}
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-200 font-medium truncate">
            <span className="truncate">
              {audienceMode === "plain"
                ? fromNode?.plainName
                : fromNode?.shortLabel}
            </span>
            <ArrowRight className="h-3 w-3 text-zinc-500 shrink-0" />
            <span style={{ color: toNode?.accent }} className="truncate">
              {audienceMode === "plain" ? toNode?.plainName : toNode?.shortLabel}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          title="Close steps card"
          className="rounded-lg p-1 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] cursor-pointer shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Step Narration */}
      <div className="px-4 py-3.5 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14.5px] font-semibold text-white leading-snug">
              {audienceMode === "plain"
                ? activeStep.plainTitle
                : activeStep.title}
            </h3>
            <span className="text-[11px] text-zinc-500 shrink-0">
              {activeStep.latencyMs}ms
            </span>
          </div>
          <p className="text-[12.5px] text-zinc-300 leading-relaxed">
            {audienceMode === "plain"
              ? activeStep.plainExplanation
              : activeStep.whyThisTool}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1.5 text-[11.5px] text-emerald-200 leading-snug">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{activeStep.businessImpact}</span>
        </div>

        {/* Clickable Step Progress Bar */}
        <div className="flex items-center gap-1.5">
          {activeTrace.steps.map((s, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onJumpToStep(idx)}
                title={`Step ${idx + 1}: ${s.plainTitle}`}
                className={`h-1.5 flex-1 rounded-full transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-sky-400"
                    : isDone
                      ? "bg-emerald-400/65"
                      : "bg-white/10 hover:bg-white/25"
                }`}
              />
            );
          })}
          <span className="text-[10.5px] text-zinc-500 ml-1 shrink-0">
            {isPlaying ? "Playing…" : playbackMode === "step" ? "Paused" : "Done"}
          </span>
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {audienceMode === "plain" ? (
            <button
              type="button"
              onClick={() => setShowCode((s) => !s)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                showCode
                  ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.09] text-zinc-200"
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-sky-400" />
              <span>{showCode ? "Hide Code" : "Code / JWT"}</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-zinc-500 truncate">
              {activeStep.operationBadge}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onStepPrev}
              disabled={currentStepIndex <= 0}
              className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] px-2.5 py-1.5 text-xs font-medium text-zinc-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={onStepNext}
              disabled={currentStepIndex >= activeTrace.steps.length - 1}
              className={`inline-flex items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
                playbackMode === "step" &&
                currentStepIndex < activeTrace.steps.length - 1
                  ? "bg-sky-400 text-zinc-950 hover:bg-sky-300"
                  : "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]"
              }`}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Under-the-Hood Code / JWT Inspector */}
      <AnimatePresence initial={false}>
        {codeVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/[0.08] bg-[#07090E]"
          >
            <div className="p-3.5 max-h-56 overflow-y-auto">
              {activeStep.jwtBreakdown && (
                <JwtBreakdown jwt={activeStep.jwtBreakdown} />
              )}

              <div className="rounded-xl border border-white/[0.08] bg-black/45 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02] text-[11px] text-zinc-400">
                  <span className="font-mono truncate">
                    {activeStep.payloadTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeStep.payloadContent)}
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-white cursor-pointer shrink-0 ml-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[11.5px] font-mono text-zinc-200 overflow-x-auto leading-relaxed whitespace-pre">
                  {activeStep.payloadContent}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// 1B. FLOATING RULES VERIFIED CARD (Right Extreme — Opens on dock action!)
// ============================================================================

interface FloatingRulesCardProps {
  activeTrace: ExecutionTrace | null;
  currentStepIndex: number;
  onDismiss: () => void;
}

const RULE_CATEGORY_STYLE: Record<string, string> = {
  Security: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  Database: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  Token: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  Cookie: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  Realtime: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  Infra: "text-rose-300 bg-rose-500/10 border-rose-500/20",
};

export function FloatingRulesCard({
  activeTrace,
  currentStepIndex,
  onDismiss,
}: FloatingRulesCardProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const traceId = activeTrace?.id ?? null;

  // Auto-scroll the checklist smoothly as each rule is verified (and when stepping back/jumping)
  useEffect(() => {
    const container = listRef.current;
    if (!container || !traceId || currentStepIndex < 0) return;

    const rafId = window.requestAnimationFrame(() => {
      if (currentStepIndex === 0) {
        container.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const activeItems = container.querySelectorAll<HTMLElement>(
        `[data-rule-step="${currentStepIndex}"]`,
      );
      const passedItems =
        activeItems.length > 0
          ? activeItems
          : container.querySelectorAll<HTMLElement>('[data-rule-passed="true"]');

      if (passedItems.length === 0) return;

      const firstEl = passedItems[0];
      const lastEl = passedItems[passedItems.length - 1];
      const firstTop = firstEl.offsetTop;
      const lastBottom = lastEl.offsetTop + lastEl.offsetHeight;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.clientHeight;

      if (firstTop < viewTop + 12) {
        container.scrollTo({
          top: Math.max(0, firstTop - 16),
          behavior: "smooth",
        });
      } else if (lastBottom > viewBottom - 20) {
        const targetTop = Math.min(
          Math.max(0, firstTop - 12),
          Math.max(0, lastBottom - container.clientHeight + 28),
        );
        container.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [traceId, currentStepIndex]);

  if (!activeTrace || currentStepIndex < 0) return null;

  const allRules = activeTrace.steps.flatMap((step, sIdx) =>
    step.ruleChecks.map((rule) => ({
      ...rule,
      stepIndex: sIdx,
      passed: sIdx <= currentStepIndex,
      justPassed: sIdx === currentStepIndex,
    })),
  );
  const passedCount = allRules.filter((r) => r.passed).length;

  return (
    <motion.div
      key={`rules-card-${activeTrace.id}`}
      initial={{ opacity: 0, x: 24, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 24, y: 12 }}
      transition={{ duration: 0.25 }}
      className="fixed bottom-[94px] right-5 z-30 w-[345px] max-w-[calc(100vw-2.5rem)] max-h-[340px] flex flex-col rounded-2xl border border-white/[0.12] bg-[#0C101A]/95 shadow-[0_24px_80px_rgba(0,0,0,0.78)] backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.07] bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              Rules Verified Live
            </div>
            <div className="text-[11px] text-emerald-300 font-medium">
              {passedCount} of {allRules.length} checks passed
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="Close rules card"
          className="rounded-lg p-1 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] cursor-pointer shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Animated Emerald Progress Line */}
      <div className="h-1 w-full bg-white/[0.06] shrink-0">
        <motion.div
          className="h-full bg-emerald-400"
          initial={false}
          animate={{
            width: `${allRules.length ? Math.round((passedCount / allRules.length) * 100) : 0}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Checklist Items */}
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto p-3 space-y-1.5 scroll-smooth"
      >
        {allRules.map((rule) => (
          <motion.div
            key={rule.id}
            data-rule-step={rule.stepIndex}
            data-rule-passed={rule.passed ? "true" : "false"}
            initial={false}
            animate={{
              opacity: rule.passed ? 1 : 0.45,
            }}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
              rule.justPassed
                ? "border-emerald-400/45 bg-emerald-500/[0.12] text-white"
                : rule.passed
                  ? "border-emerald-500/20 bg-emerald-500/[0.04] text-zinc-200"
                  : "border-white/[0.06] bg-black/25 text-zinc-500"
            }`}
          >
            {rule.passed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="leading-snug">{rule.label}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-block rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium ${
                    RULE_CATEGORY_STYLE[rule.category] ??
                    "text-zinc-300 bg-white/5 border-white/10"
                  }`}
                >
                  {rule.category}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Step {rule.stepIndex + 1}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 2. FLOATING NODE DETAIL CARD (Top-Right when user clicks any box)
// ============================================================================

interface FloatingNodeCardProps {
  nodeId: AnyNodeId | null;
  audienceMode: AudienceMode;
  onClose: () => void;
  onOpenSchemas: () => void;
}

export function FloatingNodeCard({
  nodeId,
  audienceMode,
  onClose,
  onOpenSchemas,
}: FloatingNodeCardProps) {
  if (!nodeId) return null;
  const node = ALL_NODES[nodeId];
  if (!node) return null;

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.22 }}
      className="fixed top-[74px] right-4 z-30 w-[336px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/[0.12] bg-[#0D111B]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-3.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: node.accent }}
            />
            <span className="text-xs font-medium text-zinc-400">
              {node.badgeText} · {node.layer}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white mt-1">
            {audienceMode === "plain" ? node.plainName : node.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/[0.07] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        {audienceMode === "plain" ? node.plainSummary : node.whyThisTool}
      </p>

      {/* Container Pods Spec List from helm/values-prod.yaml */}
      {node.pods && node.pods.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-200">
              Minimum Running Pods (Helm)
            </span>
            {node.hpaSummary && (
              <span className="text-[11px] text-sky-300">{node.hpaSummary}</span>
            )}
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
            {node.pods.map((pod) => (
              <div
                key={pod.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold text-white truncate">
                    {pod.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 truncate">
                    {pod.image}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 shrink-0">
                  {[pod.port, pod.resources, pod.pvc].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100/95 leading-relaxed">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
          <Lightbulb className="h-3.5 w-3.5" />
          Why Ascend uses this
        </div>
        {audienceMode === "plain" ? node.plainWhy : node.tradeOff}
      </div>

      {audienceMode === "technical" && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-zinc-400">
            Key Details ({node.repoPath})
          </div>
          <ul className="space-y-1">
            {node.keySpecs.map((spec) => (
              <li
                key={spec}
                className="text-xs font-mono text-zinc-300 bg-black/35 rounded-lg px-2.5 py-1.5 border border-white/[0.06]"
              >
                {spec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenSchemas}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] py-2 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
      >
        <FileCode2 className="h-3.5 w-3.5 text-sky-400" />
        Inspect Real Repo Schemas
      </button>
    </motion.div>
  );
}

// ============================================================================
// 3. FLOATING REFERENCE SHEET (On-Demand: Storage Matrix, Real Schemas, Live Data)
// ============================================================================

interface FloatingReferenceModalProps {
  openTab: ReferenceSheetTab | null;
  onChangeTab: (tab: ReferenceSheetTab) => void;
  onClose: () => void;
  clusterState: VirtualClusterState;
}

export function FloatingReferenceModal({
  openTab,
  onChangeTab,
  onClose,
  clusterState,
}: FloatingReferenceModalProps) {
  const [activeSchemaId, setActiveSchemaId] = useState(REAL_SCHEMAS[0].id);
  const [copied, setCopied] = useState(false);

  if (!openTab) return null;

  const activeSchema =
    REAL_SCHEMAS.find((s) => s.id === activeSchemaId) ?? REAL_SCHEMAS[0];

  const storageKb = (
    new Blob([JSON.stringify(clusterState)]).size / 1024
  ).toFixed(1);

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="w-full max-w-3xl max-h-[82vh] flex flex-col rounded-3xl border border-white/[0.12] bg-[#0D1018] shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            {[
              { id: "matrix" as const, label: "Why 5 Data Stores?", icon: Database },
              { id: "schemas" as const, label: "Real Schemas", icon: FileCode2 },
              { id: "storage" as const, label: "Live Browser Data", icon: HardDrive },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTab(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    openTab === t.id
                      ? "bg-white/12 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:text-white hover:bg-white/[0.07] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {openTab === "matrix" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Why Ascend uses 5 specialized data stores
                </h3>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                  Instead of forcing every feature into one slow table, each
                  piece of data lives in the exact engine designed for it.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {STORAGE_MATRIX.map((item) => (
                  <div
                    key={item.engine}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.accent }}
                      />
                      <span className="text-sm font-semibold text-white">
                        {item.plainName}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-sky-300">
                      {item.engine} · {item.role}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {item.pattern}
                    </p>
                    <div className="text-[11px] text-zinc-500 pt-1">
                      Lifecycle: {item.lifecycle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {openTab === "schemas" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {REAL_SCHEMAS.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setActiveSchemaId(doc.id)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        activeSchemaId === doc.id
                          ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {doc.title}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(activeSchema.content)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed">
                {activeSchema.summary}
              </p>

              <div className="rounded-2xl border border-white/[0.08] bg-[#07090E] overflow-hidden">
                <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] text-xs font-mono text-zinc-400">
                  github.com/Desktoo/ascend/{activeSchema.filePath}
                </div>
                <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed whitespace-pre max-h-[380px]">
                  {activeSchema.content}
                </pre>
              </div>
            </div>
          )}

          {openTab === "storage" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Live Simulated Cluster State
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Saved in browser <code className="text-zinc-300">{STORAGE_KEY}</code> ({storageKb} KB) — updates live on every action.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(clusterState, null, 2))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </button>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#07090E] p-4 max-h-[420px] overflow-y-auto space-y-1">
                <JsonTreeNode label="session" value={clusterState.session} />
                <JsonTreeNode
                  label="postgres"
                  value={clusterState.postgres}
                  defaultOpen
                />
                <JsonTreeNode label="redis" value={clusterState.redis} />
                <JsonTreeNode label="dynamodb" value={clusterState.dynamodb} />
                <JsonTreeNode label="mongodb" value={clusterState.mongodb} />
                <JsonTreeNode label="k8s" value={clusterState.k8s} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
