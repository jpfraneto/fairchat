// src/constants/session.js
// Constants for session configuration

// Time before session ends if user stops typing (in seconds)
export const TIMEOUT_SECONDS = 8;

// Length of a session (in minutes)
export const SESSION_MINUTES = 8;

// Points required to use an emergency extension
export const EMERGENCY_COST = 50;

// Flow state threshold score
export const FLOW_THRESHOLD = 85;

// Default prompts for quick start
export const DEFAULT_PROMPTS = [
  "What's on your mind right now?",
  "What are you grateful for today?",
  "What's something that challenged you recently?",
  "Describe a moment of joy you experienced lately.",
  "What would you tell your past self if you could?",
  "What's a dream or goal you haven't shared with anyone?",
  "What does freedom mean to you?",
  "If you could change one thing about your life, what would it be?",
  "What gives you energy and what drains you?",
  "What patterns do you notice in your life that you'd like to change?",
];

// Emergency prompts when user is stuck
export const EMERGENCY_PROMPTS = [
  "Continue with how this makes you feel...",
  "What happens next?",
  "Expand on your last thought...",
  "Why is this important to you?",
  "How does this connect to your life?",
  "What would the opposite perspective be?",
  "Describe this using all your senses...",
  "What's beneath the surface here?",
  "Remember when something similar happened...",
];
