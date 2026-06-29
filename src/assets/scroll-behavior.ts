export type HydroProgrammaticScrollProfile = "back-to-top" | "default";

export type HydroLenisScrollOptions = {
  duration?: number;
  easing?: (progress: number) => number;
  force?: boolean;
  immediate?: boolean;
  lock?: boolean;
  offset?: number;
  onComplete?: () => void;
};

export type HydroProgrammaticScrollInput = {
  currentTop: number;
  mobileViewport: boolean;
  motionEnabled: boolean;
  prefersReducedMotion: boolean;
  profile: HydroProgrammaticScrollProfile;
  smoothScrollEnabled: boolean;
  targetTop: number;
  viewportHeight: number;
};

export type HydroProgrammaticScrollPlan = {
  completionDelayMs: number;
  lenisOptions?: HydroLenisScrollOptions;
  nativeBehavior: ScrollBehavior;
};

const mobileBackToTopMinDuration = 0.42;
const mobileBackToTopMaxDuration = 0.72;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function hydroEaseOutCubic(progress: number) {
  const safeProgress = clamp(progress, 0, 1);
  return 1 - Math.pow(1 - safeProgress, 3);
}

function resolveMobileBackToTopDuration(distance: number, viewportHeight: number) {
  const safeViewportHeight = Math.max(1, viewportHeight);
  const viewportTravel = clamp(distance / safeViewportHeight, 0, 4);
  const progress = viewportTravel <= 1 ? 0 : (viewportTravel - 1) / 3;

  return mobileBackToTopMinDuration + progress * (mobileBackToTopMaxDuration - mobileBackToTopMinDuration);
}

export function createHydroProgrammaticScrollPlan(input: HydroProgrammaticScrollInput): HydroProgrammaticScrollPlan {
  const targetTop = Math.max(0, input.targetTop);
  const currentTop = Math.max(0, input.currentTop);
  const distance = Math.abs(currentTop - targetTop);

  if (!input.motionEnabled || !input.smoothScrollEnabled || input.prefersReducedMotion) {
    return {
      completionDelayMs: 0,
      lenisOptions: { force: true, immediate: true },
      nativeBehavior: "auto",
    };
  }

  if (input.profile === "back-to-top" && input.mobileViewport && targetTop === 0 && distance > 1) {
    const duration = resolveMobileBackToTopDuration(distance, input.viewportHeight);

    return {
      completionDelayMs: Math.ceil(duration * 1000) + 120,
      lenisOptions: {
        duration,
        easing: hydroEaseOutCubic,
        force: true,
        lock: true,
      },
      nativeBehavior: "smooth",
    };
  }

  return {
    completionDelayMs: 0,
    nativeBehavior: "smooth",
  };
}
