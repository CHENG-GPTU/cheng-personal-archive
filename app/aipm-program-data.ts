import {
  trainingDays,
  type TrainingDay,
  type TrainingPhase,
} from "./training-data";

export const AIPM_PROGRAM_DAYS = 30;
export const AIPM_UNITS_PER_DAY = 2;

export interface AipmProgramDay {
  calendarDay: number;
  unitIds: readonly [number, number];
  units: readonly [TrainingDay, TrainingDay];
  phases: readonly TrainingPhase[];
  transitionDay: boolean;
}

export function mapTrainingUnitsToProgramDays(
  units: readonly TrainingDay[] = trainingDays,
): AipmProgramDay[] {
  if (units.length !== AIPM_PROGRAM_DAYS * AIPM_UNITS_PER_DAY) {
    throw new Error(
      `AIPM 30-day program requires exactly ${AIPM_PROGRAM_DAYS * AIPM_UNITS_PER_DAY} training units.`,
    );
  }

  return Array.from({ length: AIPM_PROGRAM_DAYS }, (_, index) => {
    const firstUnit = units[index * AIPM_UNITS_PER_DAY];
    const secondUnit = units[index * AIPM_UNITS_PER_DAY + 1];
    const phases = Array.from(new Set([firstUnit.phase, secondUnit.phase]));

    return {
      calendarDay: index + 1,
      unitIds: [firstUnit.day, secondUnit.day] as const,
      units: [firstUnit, secondUnit] as const,
      phases,
      transitionDay: phases.length > 1,
    };
  });
}

export const aipmProgramDays = mapTrainingUnitsToProgramDays();

export function getCalendarDayForUnit(unitId: number) {
  if (!Number.isInteger(unitId) || unitId < 1 || unitId > trainingDays.length) {
    return null;
  }
  return Math.ceil(unitId / AIPM_UNITS_PER_DAY);
}

export function getProgramDayForUnit(unitId: number) {
  const calendarDay = getCalendarDayForUnit(unitId);
  return calendarDay === null ? null : aipmProgramDays[calendarDay - 1] ?? null;
}

