interface Keystroke {
  key: string;
  time: number;
}

/**
 * Calculate the flow score based on keystroke timing
 * @param keystrokes - Array of keystroke objects with key and time properties
 * @param windowSize - Number of keystrokes to analyze (default: 20)
 * @returns Flow score between 0-100
 */
export const calculateFlowScore = (
  keystrokes: Keystroke[],
  windowSize = 20
): number => {
  if (!keystrokes || keystrokes.length < 3) return 100; // Not enough data yet

  // Get last N keystrokes (or fewer if we don't have that many)
  const recentStrokes = keystrokes.slice(
    -Math.min(windowSize, keystrokes.length)
  );

  // Filter out very long pauses (greater than 5 seconds)
  // and backspaces (which aren't part of the forward flow)
  const times = recentStrokes
    .filter((k: Keystroke) => k.key !== "Backspace")
    .map((k: Keystroke) => k.time)
    .filter((t: number) => t < 5);

  if (times.length < 3) return 100; // Not enough valid timing data

  // Calculate standard deviation
  const avg =
    times.reduce((sum: number, t: number) => sum + t, 0) / times.length;
  const squareDiffs = times.map((t: number) => Math.pow(t - avg, 2));
  const avgSquareDiff =
    squareDiffs.reduce((sum: number, d: number) => sum + d, 0) /
    squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  // Calculate flow score (100 is perfect, 0 is terrible)
  // Lower standard deviation = higher score (more consistent rhythm)
  const normalizedStdDev = Math.min(stdDev / 0.5, 1); // Normalize around 0.5s deviation

  // We apply an 80% weight to keep the score in a reasonable range
  return Math.round(100 * (1 - normalizedStdDev * 0.8));
};

/**
 * Detect if the user is in a flow state based on recent keystrokes
 * @param keystrokes - Array of keystroke objects
 * @param threshold - Flow score threshold (default: 80)
 * @returns Whether user is in flow state
 */
export const isInFlowState = (
  keystrokes: Keystroke[],
  threshold = 80
): boolean => {
  const flowScore = calculateFlowScore(keystrokes);
  return flowScore >= threshold;
};

/**
 * Calculate words from text
 * @param text - The text to count words in
 * @returns Word count
 */
export const countWords = (text: string): number => {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((w: string) => w.length > 0).length;
};

/**
 * Calculate words per minute
 * @param text - The text typed
 * @param durationMs - Duration in milliseconds
 * @returns Words per minute
 */
export const calculateWPM = (text: string, durationMs: number): number => {
  const words = countWords(text);
  const minutes = durationMs / 60000;
  return Math.round(words / Math.max(0.1, minutes));
};
