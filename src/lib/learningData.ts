export interface MemberProfile {
  displayName: string;
  focusGoal: string;
  experienceLevel: string;
  weeklyCommitment: string;
  preferredSession: string;
}

export type StudioToolId = 'slides' | 'mindmap' | 'quiz' | 'flashcards' | 'guide' | 'cards';
export type FlashcardConfidence = 'new' | 'learning' | 'known';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface ModuleFlashcard {
  id: string;
  front: string;
  back: string;
}

export interface ModuleSlide {
  id: string;
  title: string;
  bullets: string[];
}

export interface StudyStudioState {
  activeTool: StudioToolId;
  quizAnswers: Record<string, number>;
  flashcardConfidence: Record<string, FlashcardConfidence>;
  slideIndexByModule: Record<string, number>;
  mindMapFocusNodeId: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  ritual: string;
  videoUrl: string;
  outcomes: string[];
  resources: string[];
  imageUrl?: string;
  imageAlt?: string;
  keyIdeas?: string[];
  quiz?: QuizQuestion[];
  flashcards?: ModuleFlashcard[];
  slides?: ModuleSlide[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  summary: string;
  track: string;
  difficulty: string;
  durationMinutes: number;
  weeklyOutcome: string;
  imageUrl?: string;
  imageAlt?: string;
  modules: CourseModule[];
}

export const defaultStudyStudioState: StudyStudioState = {
  activeTool: 'slides',
  quizAnswers: {},
  flashcardConfidence: {},
  slideIndexByModule: {},
  mindMapFocusNodeId: '',
};

export const defaultMemberProfile: MemberProfile = {
  displayName: '',
  focusGoal: 'Build a repeatable deep-work practice',
  experienceLevel: 'Intermediate',
  weeklyCommitment: '4 focused sessions',
  preferredSession: '90-minute deep work blocks',
};

const focusVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4';
const supportingVideoOne = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4';
const supportingVideoTwo = 'https://www.w3schools.com/html/mov_bbb.mp4';

const courseImages: Record<string, string> = {
  '101': 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
  '102': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
  '103': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=80',
  '001': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
};

const moduleImages = [
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80',
];

const baseCourseCatalog: Course[] = [
  {
    id: '101',
    title: 'The Foundations of Focus',
    description: 'Install the baseline rituals, environmental design, and mental cues that make focused work predictable.',
    summary: 'A starter system for turning attention into a daily operating habit.',
    track: 'Focus Rituals',
    difficulty: 'Starter',
    durationMinutes: 96,
    weeklyOutcome: 'Leave the week with a repeatable pre-work ritual and a distraction-resistant workspace.',
    modules: [
      {
        id: 'foundation-1',
        title: 'Attention Audit',
        description: 'Identify exactly where cognitive leakage happens across devices, habits, and meetings.',
        durationMinutes: 22,
        ritual: 'Run this before your first session of the week and document every interruption source.',
        videoUrl: focusVideo,
        outcomes: [
          'Map your three biggest attention leaks',
          'Define a shutdown rule for notifications',
          'Set a measurable baseline for interruption-free work',
        ],
        resources: ['Attention leak worksheet', 'Notification shutdown checklist'],
      },
      {
        id: 'foundation-2',
        title: 'Environment Reset',
        description: 'Shape the physical and digital workspace so focus requires less willpower.',
        durationMinutes: 24,
        ritual: 'Reset your desk and browser before each session until the ritual becomes automatic.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Create a clean work surface protocol',
          'Build a single-tab start environment',
          'Reduce friction before deep work begins',
        ],
        resources: ['Desk reset guide', 'Digital workspace template'],
      },
      {
        id: 'foundation-3',
        title: 'First Deep Work Block',
        description: 'Execute a structured focus block with defined start, midpoint, and shutdown markers.',
        durationMinutes: 26,
        ritual: 'Use one timer, one task, one deliverable, and end with a written recap.',
        videoUrl: supportingVideoTwo,
        outcomes: [
          'Complete a 60-90 minute uninterrupted session',
          'Track energy quality during the block',
          'Capture an end-of-session review',
        ],
        resources: ['Deep work scorecard', 'Session debrief prompts'],
      },
      {
        id: 'foundation-4',
        title: 'Weekly Consolidation',
        description: 'Turn early wins into a system that survives busy weeks and imperfect days.',
        durationMinutes: 24,
        ritual: 'End the week by reviewing what made focused sessions easier or harder.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Create a lightweight weekly review',
          'Name one ritual you will keep and one you will remove',
          'Establish a stable cadence for next week',
        ],
        resources: ['Weekly review template', 'Ritual decision matrix'],
      },
    ],
  },
  {
    id: '102',
    title: 'Advanced Cognitive Patterns',
    description: 'Build systems for managing overload, switching costs, and mental fatigue under real pressure.',
    summary: 'A higher-order operating system for knowledge work when the stakes and complexity rise.',
    track: 'Cognitive Architecture',
    difficulty: 'Advanced',
    durationMinutes: 104,
    weeklyOutcome: 'Handle complex work with less context-switching and less recovery time.',
    modules: [
      {
        id: 'patterns-1',
        title: 'Mental Queue Design',
        description: 'Replace vague to-do lists with a queue that protects high-value thinking from reactive work.',
        durationMinutes: 25,
        ritual: 'Sort work into one deliberate queue at the end of each day.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Prioritize cognitive work above admin noise',
          'Separate reactive tasks from strategic work',
          'Reduce decision fatigue before each session',
        ],
        resources: ['Queue architecture worksheet', 'Priority ladder'],
      },
      {
        id: 'patterns-2',
        title: 'Context Switch Recovery',
        description: 'Recover faster when your attention is broken by meetings, pings, or urgent requests.',
        durationMinutes: 27,
        ritual: 'Run a two-minute reset sequence every time a session is interrupted.',
        videoUrl: focusVideo,
        outcomes: [
          'Return to context with less confusion',
          'Use a written “where I left off” marker',
          'Shorten recovery after interruptions',
        ],
        resources: ['Recovery sequence card', 'Interruption log'],
      },
      {
        id: 'patterns-3',
        title: 'Deliberate Complexity',
        description: 'Break ambiguous work into a sequence of cognitive passes instead of attacking everything at once.',
        durationMinutes: 28,
        ritual: 'Move from framing to drafting to refining instead of multitasking across them.',
        videoUrl: supportingVideoTwo,
        outcomes: [
          'Structure difficult work into solvable passes',
          'Keep momentum when uncertainty is high',
          'Avoid thrashing between modes',
        ],
        resources: ['Complexity pass framework', 'Planning canvas'],
      },
      {
        id: 'patterns-4',
        title: 'Recovery and Reset',
        description: 'Design recovery so your attention quality stays high across the week, not only in bursts.',
        durationMinutes: 24,
        ritual: 'Plan intentional off-ramps before energy crashes force them.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Protect energy between heavy sessions',
          'Identify your fatigue signals earlier',
          'Balance ambition with sustainable execution',
        ],
        resources: ['Recovery tracker', 'Energy reset checklist'],
      },
    ],
  },
  {
    id: '103',
    title: 'Flow State Architecture',
    description: 'Design the triggers, pacing, and feedback loops that help flow become more accessible on demand.',
    summary: 'A system for entering higher-quality work states more often and sustaining them longer.',
    track: 'Flow States',
    difficulty: 'Intermediate',
    durationMinutes: 92,
    weeklyOutcome: 'Build your own set of flow triggers and a repeatable rhythm for hard creative work.',
    modules: [
      {
        id: 'flow-1',
        title: 'Trigger Mapping',
        description: 'Define the environmental, emotional, and task-based inputs that precede your best work.',
        durationMinutes: 20,
        ritual: 'Capture your state before and after each high-quality session.',
        videoUrl: focusVideo,
        outcomes: [
          'Identify your most reliable flow triggers',
          'Remove false triggers that waste time',
          'Understand your ideal difficulty range',
        ],
        resources: ['Flow trigger inventory', 'State-tracking template'],
      },
      {
        id: 'flow-2',
        title: 'Difficulty Calibration',
        description: 'Match challenge to skill so work stretches you without tipping into chaos.',
        durationMinutes: 23,
        ritual: 'Rate tasks for challenge before each deep session.',
        videoUrl: supportingVideoTwo,
        outcomes: [
          'Choose work that is demanding but tractable',
          'Spot underload and overload earlier',
          'Increase time spent in productive strain',
        ],
        resources: ['Challenge calibration table', 'Task sizing prompts'],
      },
      {
        id: 'flow-3',
        title: 'Momentum Maintenance',
        description: 'Keep flow from collapsing by using better transitions, feedback loops, and pacing.',
        durationMinutes: 25,
        ritual: 'Insert short reflection markers rather than hard stopping during long sessions.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Sustain momentum across long blocks',
          'Use reflection without breaking immersion',
          'Preserve velocity after checkpoints',
        ],
        resources: ['Mid-session checkpoint prompts', 'Momentum scorecard'],
      },
      {
        id: 'flow-4',
        title: 'Creative Recovery',
        description: 'Close intense sessions cleanly so the next one starts with energy instead of residue.',
        durationMinutes: 24,
        ritual: 'End every heavy session with a concise state handoff to your future self.',
        videoUrl: supportingVideoTwo,
        outcomes: [
          'Exit flow without cognitive whiplash',
          'Leave behind a clean re-entry note',
          'Build continuity between sessions',
        ],
        resources: ['Creative shutdown template', 'Re-entry note examples'],
      },
    ],
  },
  {
    id: '001',
    title: 'Introduction to Mastery',
    description: 'A broader orientation for learners who want to turn focused study into long-term compound growth.',
    summary: 'A strategic entry point for building a durable learning system around one meaningful subject.',
    track: 'Learning Systems',
    difficulty: 'Starter',
    durationMinutes: 88,
    weeklyOutcome: 'Clarify what mastery means for you and design a first-month learning path.',
    modules: [
      {
        id: 'mastery-1',
        title: 'Mastery Lens',
        description: 'Redefine mastery as a system of deliberate repetition, reflection, and refinement.',
        durationMinutes: 20,
        ritual: 'Start each week by defining what meaningful progress looks like.',
        videoUrl: supportingVideoTwo,
        outcomes: [
          'Move from vague ambition to measurable growth',
          'Choose the right subject for deep commitment',
          'Define what “better” means each week',
        ],
        resources: ['Mastery framing prompts', 'Progress definition worksheet'],
      },
      {
        id: 'mastery-2',
        title: 'Curriculum Design',
        description: 'Create a learning plan with clear phases instead of consuming random content.',
        durationMinutes: 22,
        ritual: 'Organize learning into stages, not endless bookmarks.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Sequence your learning deliberately',
          'Avoid fragmented study patterns',
          'Know what phase you are in right now',
        ],
        resources: ['Phase planner', 'Curriculum outline template'],
      },
      {
        id: 'mastery-3',
        title: 'Retention Through Action',
        description: 'Turn knowledge into retained capability by building, teaching, and reflecting.',
        durationMinutes: 24,
        ritual: 'End each learning session by producing something visible.',
        videoUrl: focusVideo,
        outcomes: [
          'Increase retention through output',
          'Avoid passive content accumulation',
          'Measure progress through artifacts',
        ],
        resources: ['Learning artifact list', 'Reflection prompts'],
      },
      {
        id: 'mastery-4',
        title: 'The 30-Day Loop',
        description: 'Build a short, realistic cycle that carries your learning system into the next month.',
        durationMinutes: 22,
        ritual: 'Review what compounded best and use it to plan the next cycle.',
        videoUrl: supportingVideoOne,
        outcomes: [
          'Build a 30-day plan you can actually follow',
          'Connect short-term sessions to long-term mastery',
          'End with a repeatable loop instead of a one-off sprint',
        ],
        resources: ['30-day mastery planner', 'Compound progress review'],
      },
    ],
  },
];

function buildQuiz(module: CourseModule): QuizQuestion[] {
  const primaryOutcome = module.outcomes[0] ?? module.description;
  const secondaryOutcome = module.outcomes[1] ?? module.ritual;
  const resource = module.resources[0] ?? 'the module resource';

  return [
    {
      id: `${module.id}-quiz-action`,
      question: `Which action best supports "${module.title}"?`,
      options: [
        primaryOutcome,
        'Open another topic before finishing the current one',
        'Wait until the end of the week to record what happened',
        'Skip the ritual and rely on motivation',
      ],
      correctOptionIndex: 0,
      explanation: `The module is designed around this outcome: ${primaryOutcome}.`,
    },
    {
      id: `${module.id}-quiz-resource`,
      question: `Which resource should you use after this video?`,
      options: [
        resource,
        secondaryOutcome,
        'A blank browser tab',
        'A new unrelated course',
      ],
      correctOptionIndex: 0,
      explanation: `${resource} keeps the practice tied to the lesson instead of turning it into passive viewing.`,
    },
  ];
}

function buildFlashcards(module: CourseModule): ModuleFlashcard[] {
  return [
    {
      id: `${module.id}-flash-ritual`,
      front: `What ritual anchors ${module.title}?`,
      back: module.ritual,
    },
    {
      id: `${module.id}-flash-outcome`,
      front: 'What should change after this module?',
      back: module.outcomes[0] ?? module.description,
    },
    {
      id: `${module.id}-flash-resource`,
      front: 'What is the first follow-up resource?',
      back: module.resources[0] ?? 'Review the module notes and write a next action.',
    },
  ];
}

function buildSlides(module: CourseModule, course: Course): ModuleSlide[] {
  return [
    {
      id: `${module.id}-slide-context`,
      title: module.title,
      bullets: [module.description, `Track: ${course.track}`, `Session length: ${module.durationMinutes} minutes`],
    },
    {
      id: `${module.id}-slide-practice`,
      title: 'Practice frame',
      bullets: [module.ritual, ...(module.outcomes.slice(0, 2))],
    },
    {
      id: `${module.id}-slide-transfer`,
      title: 'Carry it forward',
      bullets: [course.weeklyOutcome, ...module.resources.slice(0, 2)],
    },
  ];
}

function enrichCourse(course: Course): Course {
  return {
    ...course,
    imageUrl: course.imageUrl ?? courseImages[course.id] ?? moduleImages[0],
    imageAlt: course.imageAlt ?? `${course.title} learning workspace`,
    modules: course.modules.map((module, index) => ({
      ...module,
      imageUrl: module.imageUrl ?? moduleImages[index % moduleImages.length],
      imageAlt: module.imageAlt ?? `${module.title} study workspace`,
      keyIdeas: module.keyIdeas ?? [module.ritual, ...module.outcomes.slice(0, 3)],
      quiz: module.quiz ?? buildQuiz(module),
      flashcards: module.flashcards ?? buildFlashcards(module),
      slides: module.slides ?? buildSlides(module, course),
    })),
  };
}

export const courseCatalog: Course[] = baseCourseCatalog.map(enrichCourse);

export function getCourseById(courseId: string | undefined) {
  return courseCatalog.find((course) => course.id === courseId) ?? null;
}

export function calculateProgress(totalModules: number, completedModuleIds: string[]) {
  if (totalModules <= 0) {
    return 0;
  }

  return Math.round((completedModuleIds.length / totalModules) * 100);
}

export function getNextModuleId(course: Course, completedModuleIds: string[]) {
  return course.modules.find((module) => !completedModuleIds.includes(module.id))?.id ?? course.modules.at(-1)?.id ?? '';
}

export function getCurrentModuleIndex(course: Course, currentModuleId: string | undefined, completedModuleIds: string[]) {
  const fallbackModuleId = getNextModuleId(course, completedModuleIds);
  const resolvedModuleId = currentModuleId || fallbackModuleId;
  const moduleIndex = course.modules.findIndex((module) => module.id === resolvedModuleId);

  return moduleIndex >= 0 ? moduleIndex : 0;
}
