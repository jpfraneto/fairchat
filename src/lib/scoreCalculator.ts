import { SESSION_MINUTES } from "../constants/session";
import { calculateFlowScore, countWords } from "./flowCalculator";

interface Keystroke {
  key: string;
  time: number;
}

interface UserConfig {
  avgWordsPerMinute?: number;
  currentStreak?: number;
}

interface SessionData {
  text: string;
  keystrokes: Keystroke[];
  sessionStartTime: number;
  sessionDuration: number;
  emergenciesUsed?: number;
  userConfig?: UserConfig;
}

interface SessionStats {
  wordCount: number;
  keystrokeCount: number;
  duration: string;
  avgKeystrokeTime: string;
  rhythmConsistency: string;
  nearMisses: number;
  flowScore: number;
  volumeScore: number;
  streakScore: number;
  emergenciesUsed: number;
  baseScore: number;
  finalScore: number;
  components: {
    flow: number;
    volume: number;
    streak: number;
    emergencyPenalty: number;
  };
}

/**
 * Calculate the final session score
 */
export const calculateSessionScore = (
  sessionData: SessionData
): SessionStats => {
  const {
    text,
    keystrokes,
    sessionDuration,
    emergenciesUsed = 0,
    userConfig,
  } = sessionData;

  // Count words
  const wordCount = countWords(text);

  // Calculate keystroke timing statistics
  const keystrokeTimes = keystrokes
    .filter((k) => k.key !== "Backspace") // Exclude backspaces for timing calculation
    .map((k) => k.time);

  // Calculate average keystroke time and standard deviation
  const average =
    keystrokeTimes.reduce((sum, time) => sum + time, 0) /
      keystrokeTimes.length || 0;

  // Calculate "near misses" (keystrokes that occurred after 5+ seconds)
  const nearMisses = keystrokeTimes.filter((time) => time >= 5).length;

  // Calculate flow score component (40% of total)
  const flowScore = calculateFlowScore(keystrokes);
  const flowComponent = flowScore * 0.4;

  // Calculate volume score component (30% of total)
  const expectedWords =
    (userConfig?.avgWordsPerMinute || 20) *
    Math.min(sessionDuration, SESSION_MINUTES);
  const volumeScore = Math.min(
    150,
    Math.round((wordCount / Math.max(1, expectedWords)) * 100)
  );
  const volumeComponent = volumeScore * 0.3;

  // Calculate streak score component (30% of total)
  // This would be determined from the user's streak data
  const streakValue = userConfig?.currentStreak || 0;
  const streakScore = Math.min(200, 100 + streakValue * 10);
  const streakComponent = streakScore * 0.3;

  // Calculate final score
  const baseScore = Math.round(
    flowComponent + volumeComponent + streakComponent
  );

  // Adjust for emergencies used
  const adjustedScore = Math.max(0, baseScore - emergenciesUsed * 25);

  return {
    wordCount,
    keystrokeCount: keystrokes.length,
    duration: sessionDuration.toFixed(2),
    avgKeystrokeTime: average.toFixed(3),
    rhythmConsistency: (flowScore / 100).toFixed(2),
    nearMisses,
    flowScore,
    volumeScore,
    streakScore,
    emergenciesUsed,
    baseScore,
    finalScore: adjustedScore,
    components: {
      flow: Math.round(flowComponent),
      volume: Math.round(volumeComponent),
      streak: Math.round(streakComponent),
      emergencyPenalty: emergenciesUsed * 25,
    },
  };
};

/**
 * Calculate a real-time score during the session
 */
export const calculateRealtimeScore = (
  text: string,
  keystrokes: Keystroke[],
  startTime: number,
  avgWordsPerMin: number = 20
): number => {
  if (keystrokes.length < 5) return 0;

  const words = countWords(text);
  const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;

  // Base score from words
  const expectedWords = avgWordsPerMin * elapsedMinutes;
  const volumeScore = Math.round((words / Math.max(1, expectedWords)) * 100);

  // Flow component
  const flowScore = calculateFlowScore(keystrokes);

  // Combine (40% flow, 60% volume for real-time score)
  return Math.round(flowScore * 0.4 + volumeScore * 0.6);
};
