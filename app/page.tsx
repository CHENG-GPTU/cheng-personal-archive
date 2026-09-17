"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { HomeTarget } from "./learning-home";
import ChengHome from "./cheng-home";
import LifeScheduleCenter from "./life-schedule-center";
import MediaPlaceholder from "./media-placeholder";
import MilestoneCenter from "./milestone-center";
import ModuleFrame from "./module-frame";
import PersonalStudio, { type PersonalStudioTab } from "./personal-studio";
import ProjectValidation from "./project-validation";
import { trainingDays } from "./training-data";
import TrainingWorkspace from "./training-workspace";

type Screen = "home" | "workspace" | "schedule" | "validation" | "studio" | "milestone" | "media";
type ScheduleView = "schedule" | "health";

const STORAGE_KEY = "aipm-v3-state";
const STATE_EVENT = "aipm-v3-state-change";

type TrainingSnapshot = {
  version?: number;
  unlockedDay?: number;
  selectedDay?: number;
  days?: Record<string, { completed?: boolean }>;
};

function readTrainingJson() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function subscribeTraining(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STATE_EVENT, callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STATE_EVENT, callback);
    window.removeEventListener("focus", callback);
  };
}

function parseTrainingSnapshot(raw: string) {
  const fallback = { selectedUnit: 1, unlockedUnit: 1, completedUnitIds: [] as number[] };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as TrainingSnapshot | null;
    if (!parsed || parsed.version !== 3) return fallback;
    const unlockedUnit = Math.min(60, Math.max(1, Number(parsed.unlockedDay) || 1));
    const selectedUnit = Math.min(unlockedUnit, Math.max(1, Number(parsed.selectedDay) || 1));
    const completedUnitIds = trainingDays
      .filter((unit) => parsed.days?.[String(unit.day)]?.completed === true)
      .map((unit) => unit.day);
    return { selectedUnit, unlockedUnit, completedUnitIds };
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [studioTab, setStudioTab] = useState<PersonalStudioTab>("portfolio");
  const [scheduleView, setScheduleView] = useState<ScheduleView>("schedule");
  const trainingJson = useSyncExternalStore(subscribeTraining, readTrainingJson, () => "");
  const snapshot = useMemo(() => parseTrainingSnapshot(trainingJson), [trainingJson]);

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => {
      html.style.scrollBehavior = previous;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, studioTab, scheduleView]);

  const openTrainingUnit = useCallback((unitId: number) => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as TrainingSnapshot : null;
      const unlocked = Math.min(60, Math.max(1, Number(parsed?.unlockedDay) || 1));
      if (parsed?.version === 3 && unitId <= unlocked) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, selectedDay: unitId }));
        window.dispatchEvent(new Event(STATE_EVENT));
      }
    } catch {
      // The workspace will safely restore its last valid unit.
    }
    setScreen("workspace");
  }, []);

  const navigate = useCallback((target: HomeTarget) => {
    if (target === "aipm") {
      window.location.assign("/learn");
      return;
    }
    if (target === "portfolio") {
      window.location.assign("/work");
      return;
    }
    if (target === "prototype" || target === "fashion") {
      setStudioTab(target === "prototype" ? "prototype" : "outfit");
      setScreen("studio");
      return;
    }
    if (target === "validation") {
      setScreen("validation");
      return;
    }
    if (target === "fitness") {
      setScheduleView("health");
      setScreen("schedule");
      return;
    }
    if (target === "media") {
      setScreen("media");
      return;
    }
    setScreen("milestone");
  }, []);

  if (screen === "workspace") {
    return <TrainingWorkspace onHome={() => setScreen("home")} />;
  }

  if (screen === "schedule") {
    return <LifeScheduleCenter key={scheduleView} initialView={scheduleView} onHome={() => setScreen("home")} />;
  }

  if (screen === "studio") {
    return <PersonalStudio key={studioTab} initialTab={studioTab} onHome={() => setScreen("home")} />;
  }

  if (screen === "validation") {
    return (
      <ModuleFrame title="项目验证" kicker="PROJECT CONTROL" onHome={() => setScreen("home")}>
        <ProjectValidation
          completedUnitIds={snapshot.completedUnitIds}
          unlockedUnit={snapshot.unlockedUnit}
          selectedUnit={snapshot.selectedUnit}
          onOpenUnit={openTrainingUnit}
        />
      </ModuleFrame>
    );
  }

  if (screen === "milestone") {
    return (
      <ModuleFrame title="第 30 天验收" kicker="FINAL CHECKPOINT" onHome={() => setScreen("home")}>
        <MilestoneCenter
          onOpenUnit={openTrainingUnit}
          onOpenProjects={() => setScreen("validation")}
        />
      </ModuleFrame>
    );
  }

  if (screen === "media") {
    return (
      <ModuleFrame title="自媒体" kicker="RESERVED SPACE" onHome={() => setScreen("home")}>
        <MediaPlaceholder
          onOpenSchedule={() => {
            setScheduleView("schedule");
            setScreen("schedule");
          }}
        />
      </ModuleFrame>
    );
  }

  return <ChengHome onNavigate={navigate} />;
}
