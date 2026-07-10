export interface ProcessStep {
  id: string;
  title: string;
  description: string;
}

// Reuses the driving-school journey used across the site.
export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: "book",
    title: "Book",
    description:
      "Pick a package and reserve your first lesson in seconds. Pickup & drop-off from your home, work or school.",
  },
  {
    id: "meet",
    title: "Meet Your Instructor",
    description:
      "A certified DrivingKlass instructor arrives in a marked 5-star training vehicle, ready to build your confidence.",
  },
  {
    id: "learn",
    title: "Learn the Fundamentals",
    description:
      "Signals, mirrors, lane control, defensive habits — mastered in a calm, structured, judgment-free environment.",
  },
  {
    id: "practice",
    title: "Practice on Real Roads",
    description:
      "Highways, roundabouts, parking, night driving. You drive the route your real Georgia road test will follow.",
  },
  {
    id: "test",
    title: "Take the Road Test",
    description:
      "We schedule, prep and pick you up. You drive our vehicle at the DDS location you already know.",
  },
  {
    id: "pass",
    title: "Pass with 5 Stars",
    description:
      "Leave with your license — and the habits of a lifelong safe driver. Welcome to the DrivingKlass family.",
  },
];
