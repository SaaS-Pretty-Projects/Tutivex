import {useState} from 'react';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers3,
  ListChecks,
  Network,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {motion} from 'motion/react';
import {
  type Course,
  type CourseModule,
  type FlashcardConfidence,
  type StudioToolId,
  type StudyStudioState,
} from '../lib/learningData';

interface CourseStudioProps {
  course: Course;
  currentModule: CourseModule;
  activeModuleIndex: number;
  completedModuleIds: string[];
  studio: StudyStudioState;
  onStudioChange: (nextStudio: StudyStudioState) => void;
  onSelectModule: (moduleIndex: number) => void;
}

const TOOL_META: Record<StudioToolId, {label: string; Icon: LucideIcon; tint: string}> = {
  slides: {label: 'Slides', Icon: Layers3, tint: 'bg-indigo-500/10 text-indigo-300'},
  mindmap: {label: 'Mind Map', Icon: Network, tint: 'bg-fuchsia-500/10 text-fuchsia-300'},
  quiz: {label: 'Quiz', Icon: ListChecks, tint: 'bg-cyan-500/10 text-cyan-300'},
  flashcards: {label: 'Flashcards', Icon: Brain, tint: 'bg-rose-500/10 text-rose-300'},
  guide: {label: 'Study Guide', Icon: FileText, tint: 'bg-amber-500/10 text-amber-300'},
  cards: {label: 'Resource Cards', Icon: BookOpen, tint: 'bg-emerald-500/10 text-emerald-300'},
};

const TOOL_ORDER: StudioToolId[] = ['slides', 'mindmap', 'quiz', 'flashcards', 'guide', 'cards'];
const CONFIDENCE_LABELS: FlashcardConfidence[] = ['new', 'learning', 'known'];

function scoreQuiz(module: CourseModule, studio: StudyStudioState) {
  const questions = module.quiz ?? [];
  if (questions.length === 0) return {correct: 0, answered: 0, total: 0};

  const answered = questions.filter((question) => studio.quizAnswers[question.id] !== undefined);
  const correct = answered.filter((question) => studio.quizAnswers[question.id] === question.correctOptionIndex);
  return {correct: correct.length, answered: answered.length, total: questions.length};
}

export default function CourseStudio({
  course,
  currentModule,
  activeModuleIndex,
  completedModuleIds,
  studio,
  onStudioChange,
  onSelectModule,
}: CourseStudioProps) {
  const [flippedFlashcardId, setFlippedFlashcardId] = useState<string | null>(null);
  const activeTool = studio.activeTool;
  const activeSlideIndex = studio.slideIndexByModule[currentModule.id] ?? 0;
  const slides = currentModule.slides ?? [];
  const safeSlideIndex = Math.min(activeSlideIndex, Math.max(slides.length - 1, 0));
  const quizScore = scoreQuiz(currentModule, studio);
  const activeMindNode = studio.mindMapFocusNodeId || currentModule.id;

  const patchStudio = (patch: Partial<StudyStudioState>) => {
    onStudioChange({
      ...studio,
      ...patch,
      quizAnswers: patch.quizAnswers ?? studio.quizAnswers,
      flashcardConfidence: patch.flashcardConfidence ?? studio.flashcardConfidence,
      slideIndexByModule: patch.slideIndexByModule ?? studio.slideIndexByModule,
    });
  };

  const setSlideIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, Math.max(slides.length - 1, 0)));
    patchStudio({
      slideIndexByModule: {
        ...studio.slideIndexByModule,
        [currentModule.id]: clamped,
      },
    });
  };

  const mindNodes = [
    {id: currentModule.id, label: currentModule.title, type: 'Module'},
    ...currentModule.outcomes.map((outcome, index) => ({id: `${currentModule.id}-outcome-${index}`, label: outcome, type: 'Outcome'})),
    ...currentModule.resources.map((resource, index) => ({id: `${currentModule.id}-resource-${index}`, label: resource, type: 'Resource'})),
  ];

  return (
    <section className="liquid-glass rounded-[2rem] border border-white/10 overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-[0.82fr,1.35fr,0.9fr]">
        <aside className="border-b xl:border-b-0 xl:border-r border-white/8 p-5 md:p-6 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-2">Sources</p>
            <h3 className="text-2xl font-serif">Course source deck</h3>
          </div>
          <div className="space-y-3">
            {course.modules.map((module, index) => {
              const isActive = module.id === currentModule.id;
              const isCompleted = completedModuleIds.includes(module.id);

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => onSelectModule(index)}
                  className={`w-full rounded-2xl border p-3 text-left transition-all ${
                    isActive
                      ? 'bg-white/10 border-white/25'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={module.imageUrl}
                      alt={module.imageAlt}
                      className="w-14 h-14 rounded-xl object-cover border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{module.title}</p>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /> : null}
                      </div>
                      <p className="text-xs text-white/45 mt-1 line-clamp-2">{module.description}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mt-2">{module.durationMinutes} min</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="p-5 md:p-7 border-b xl:border-b-0 xl:border-r border-white/8">
          <div className="relative min-h-[31rem] rounded-[1.5rem] overflow-hidden border border-white/8 bg-black/30">
            <img
              src={currentModule.imageUrl}
              alt={currentModule.imageAlt}
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/70 to-black/90" />
            <div className="relative p-5 md:p-7 min-h-[31rem] flex flex-col">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {TOOL_ORDER.map((tool) => {
                  const meta = TOOL_META[tool];
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => patchStudio({activeTool: tool})}
                      className={`rounded-full px-3 py-2 text-xs font-medium border transition-colors inline-flex items-center gap-2 ${
                        activeTool === tool
                          ? 'bg-white text-black border-white'
                          : 'bg-white/10 text-white/75 border-white/10 hover:text-white hover:border-white/25'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1">
                {activeTool === 'slides' ? (
                  <motion.div key={`${currentModule.id}-slides-${safeSlideIndex}`} initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}}>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Slide deck</p>
                    <h3 className="text-3xl md:text-5xl font-serif mb-6">{slides[safeSlideIndex]?.title ?? currentModule.title}</h3>
                    <div className="space-y-4">
                      {(slides[safeSlideIndex]?.bullets ?? currentModule.keyIdeas ?? []).map((bullet) => (
                        <div key={bullet} className="rounded-2xl bg-white/10 border border-white/10 p-4 text-white/78">
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}

                {activeTool === 'mindmap' ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Mind map</p>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,1.1fr] gap-4">
                      <div className="rounded-[1.5rem] bg-white/10 border border-white/10 p-5">
                        <p className="text-sm text-white/45 mb-3">Focus node</p>
                        <h3 className="text-3xl font-serif">{mindNodes.find((node) => node.id === activeMindNode)?.label ?? currentModule.title}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mindNodes.map((node) => (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => patchStudio({mindMapFocusNodeId: node.id})}
                            className={`rounded-2xl border p-4 text-left transition-colors ${
                              activeMindNode === node.id ? 'bg-white text-black border-white' : 'bg-white/10 border-white/10 hover:border-white/25'
                            }`}
                          >
                            <span className="text-[10px] uppercase tracking-[0.18em] opacity-60">{node.type}</span>
                            <span className="block text-sm mt-2">{node.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTool === 'quiz' ? (
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-2">Quiz</p>
                        <h3 className="text-3xl font-serif">Check understanding</h3>
                      </div>
                      <div className="rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/70">
                        {quizScore.correct}/{quizScore.total} correct
                      </div>
                    </div>
                    <div className="space-y-4">
                      {(currentModule.quiz ?? []).map((question) => {
                        const selected = studio.quizAnswers[question.id];
                        return (
                          <div key={question.id} className="rounded-[1.4rem] bg-white/10 border border-white/10 p-4">
                            <p className="font-medium mb-3">{question.question}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {question.options.map((option, index) => {
                                const isSelected = selected === index;
                                const isCorrect = index === question.correctOptionIndex;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() =>
                                      patchStudio({
                                        quizAnswers: {
                                          ...studio.quizAnswers,
                                          [question.id]: index,
                                        },
                                      })
                                    }
                                    className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                                      isSelected
                                        ? isCorrect
                                          ? 'bg-emerald-400/20 border-emerald-300/50'
                                          : 'bg-rose-400/20 border-rose-300/50'
                                        : 'bg-black/20 border-white/10 hover:border-white/25'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                            {selected !== undefined ? <p className="text-sm text-white/55 mt-3">{question.explanation}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {activeTool === 'flashcards' ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Flashcards</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(currentModule.flashcards ?? []).map((card) => {
                        const flipped = flippedFlashcardId === card.id;
                        const confidence = studio.flashcardConfidence[card.id] ?? 'new';
                        return (
                          <div key={card.id} className="rounded-[1.4rem] bg-white/10 border border-white/10 p-4">
                            <button
                              type="button"
                              onClick={() => setFlippedFlashcardId(flipped ? null : card.id)}
                              className="min-h-32 w-full text-left"
                            >
                              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mb-3">{flipped ? 'Back' : 'Front'}</p>
                              <p className="text-xl font-serif">{flipped ? card.back : card.front}</p>
                            </button>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {CONFIDENCE_LABELS.map((label) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() =>
                                    patchStudio({
                                      flashcardConfidence: {
                                        ...studio.flashcardConfidence,
                                        [card.id]: label,
                                      },
                                    })
                                  }
                                  className={`rounded-full px-3 py-1.5 text-xs capitalize border ${
                                    confidence === label ? 'bg-white text-black border-white' : 'border-white/10 text-white/60'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {activeTool === 'guide' ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Study guide</p>
                    <h3 className="text-3xl font-serif mb-5">{currentModule.title} field notes</h3>
                    <div className="space-y-3">
                      {(currentModule.keyIdeas ?? []).map((idea) => (
                        <div key={idea} className="rounded-2xl bg-white/10 border border-white/10 p-4">
                          <Sparkles className="w-4 h-4 text-white/45 mb-2" />
                          <p className="text-white/75">{idea}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeTool === 'cards' ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Resource cards</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentModule.resources.map((resource, index) => (
                        <div key={resource} className="rounded-[1.4rem] bg-white/10 border border-white/10 p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mb-3">Resource {index + 1}</p>
                          <h3 className="text-2xl font-serif mb-3">{resource}</h3>
                          <p className="text-white/62">Use this after the video, then write the next action in your module journal.</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {activeTool === 'slides' ? (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setSlideIndex(safeSlideIndex - 1)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-white/25"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-white/45">{safeSlideIndex + 1}/{Math.max(slides.length, 1)}</span>
                  <button
                    type="button"
                    onClick={() => setSlideIndex(safeSlideIndex + 1)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-white/25"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="p-5 md:p-6 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-2">Studio</p>
            <h3 className="text-2xl font-serif">Study tools</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {TOOL_ORDER.map((tool) => {
              const meta = TOOL_META[tool];
              const Icon = meta.Icon;
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => patchStudio({activeTool: tool})}
                  className={`rounded-2xl border p-4 text-left transition-all ${meta.tint} ${
                    activeTool === tool ? 'border-white/35 ring-1 ring-white/20' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Icon className="w-4 h-4" />
                      {meta.label}
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">Session pulse</p>
            <p className="text-sm text-white/62">
              Quiz: {quizScore.answered}/{quizScore.total} answered. Flashcards known:{' '}
              {Object.values(studio.flashcardConfidence).filter((value) => value === 'known').length}.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
