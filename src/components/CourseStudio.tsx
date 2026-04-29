import {type ReactNode, useEffect, useRef, useState} from 'react';
import {
  AudioLines,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers3,
  ListChecks,
  Network,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Table2,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {motion, AnimatePresence} from 'motion/react';
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

interface ToolMeta {
  label: string;
  Icon: LucideIcon;
  tint: string;
  description: string;
  badge?: string;
}

const TOOL_META: Record<StudioToolId, ToolMeta> = {
  audio:       {label: 'Audio Overview', Icon: AudioLines, tint: 'bg-teal-500/10 text-teal-300',      description: 'Listen to a narrated summary of this module',    badge: undefined},
  video:       {label: 'Video Overview', Icon: Video,      tint: 'bg-sky-500/10 text-sky-300',        description: 'Watch the full module lesson video',             badge: undefined},
  slides:      {label: 'Slide Deck',     Icon: Layers3,    tint: 'bg-indigo-500/10 text-indigo-300',  description: 'Step through key ideas slide by slide',           badge: 'NEW'},
  mindmap:     {label: 'Mind Map',       Icon: Network,    tint: 'bg-fuchsia-500/10 text-fuchsia-300', description: 'Explore concept relationships visually',         badge: undefined},
  report:      {label: 'Reports',        Icon: BarChart3,  tint: 'bg-orange-500/10 text-orange-300',  description: 'See your quiz, flashcard, and progress stats',    badge: undefined},
  quiz:        {label: 'Quiz',           Icon: ListChecks, tint: 'bg-cyan-500/10 text-cyan-300',      description: 'Test your understanding with questions',          badge: undefined},
  datatable:   {label: 'Data Table',     Icon: Table2,     tint: 'bg-lime-500/10 text-lime-300',      description: 'Browse outcomes, resources, and ideas as rows',   badge: undefined},
  flashcards:  {label: 'Flashcards',     Icon: Brain,      tint: 'bg-rose-500/10 text-rose-300',      description: 'Flip cards to reinforce key concepts',            badge: undefined},
  infographic: {label: 'Infographic',    Icon: Sparkles,   tint: 'bg-violet-500/10 text-violet-300',  description: 'Visual overview of the module journey',           badge: 'BETA'},
  guide:       {label: 'Study Guide',    Icon: FileText,   tint: 'bg-amber-500/10 text-amber-300',    description: 'Field notes distilled from key ideas',            badge: undefined},
  cards:       {label: 'Resource Cards', Icon: BookOpen,   tint: 'bg-emerald-500/10 text-emerald-300', description: 'Quick-reference cards for follow-up resources',  badge: undefined},
};

const TOOL_ORDER: StudioToolId[] = ['audio', 'video', 'slides', 'mindmap', 'report', 'quiz', 'datatable', 'flashcards', 'infographic', 'guide', 'cards'];
const CONFIDENCE_LABELS: FlashcardConfidence[] = ['new', 'learning', 'known'];
type DataTableTab = 'outcomes' | 'resources' | 'ideas';

function scoreQuiz(module: CourseModule, studio: StudyStudioState) {
  const questions = module.quiz ?? [];
  if (questions.length === 0) return {correct: 0, answered: 0, total: 0};
  const answered = questions.filter((q) => studio.quizAnswers[q.id] !== undefined);
  const correct = answered.filter((q) => studio.quizAnswers[q.id] === q.correctOptionIndex);
  return {correct: correct.length, answered: answered.length, total: questions.length};
}

/* ── SVG Mind Map ─────────────────────────────────────── */
interface MindNode {id: string; label: string; type: string; x: number; y: number}

function buildMindMapLayout(module: CourseModule): MindNode[] {
  const CX = 260, CY = 180, R = 130;
  const outcomes = module.outcomes.map((o, i) => ({id: `out-${i}`, label: o, type: 'Outcome'}));
  const resources = module.resources.map((r, i) => ({id: `res-${i}`, label: r, type: 'Resource'}));
  const children = [...outcomes, ...resources];
  const step = (2 * Math.PI) / Math.max(children.length, 1);

  return [
    {id: module.id, label: module.title, type: 'Module', x: CX, y: CY},
    ...children.map((n, i) => {
      const angle = -Math.PI / 2 + i * step;
      return {...n, x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle)};
    }),
  ];
}

function MindMapSVG({module, focusId, onFocus}: {module: CourseModule; focusId: string; onFocus: (id: string) => void}) {
  const nodes = buildMindMapLayout(module);
  const center = nodes[0];
  const children = nodes.slice(1);

  const typeColor: Record<string, string> = {
    Module: '#a78bfa',
    Outcome: '#67e8f9',
    Resource: '#86efac',
  };

  return (
    <svg viewBox="0 0 520 360" className="w-full h-auto select-none" aria-label="Mind map">
      {/* Connector lines */}
      {children.map((n) => (
        <line
          key={`line-${n.id}`}
          x1={center.x} y1={center.y}
          x2={n.x} y2={n.y}
          stroke={typeColor[n.type] ?? '#ffffff'}
          strokeOpacity={focusId === n.id ? 0.7 : 0.2}
          strokeWidth={focusId === n.id ? 2 : 1}
          strokeDasharray={focusId === n.id ? '' : '4 4'}
        />
      ))}

      {/* Child nodes */}
      {children.map((n) => {
        const active = focusId === n.id;
        const color = typeColor[n.type] ?? '#ffffff';
        const labelWords = n.label.split(' ');
        const line1 = labelWords.slice(0, Math.ceil(labelWords.length / 2)).join(' ');
        const line2 = labelWords.slice(Math.ceil(labelWords.length / 2)).join(' ');
        return (
          <g key={n.id} onClick={() => onFocus(n.id)} style={{cursor: 'pointer'}} aria-label={n.label}>
            <circle
              cx={n.x} cy={n.y} r={32}
              fill={active ? color : 'rgba(255,255,255,0.04)'}
              stroke={color}
              strokeOpacity={active ? 1 : 0.35}
              strokeWidth={active ? 2 : 1}
            />
            <text x={n.x} y={line2 ? n.y - 6 : n.y + 4} textAnchor="middle" fill={active ? '#000' : color} fontSize="8.5" fontWeight={active ? '700' : '400'}>
              {line1}
            </text>
            {line2 ? (
              <text x={n.x} y={n.y + 8} textAnchor="middle" fill={active ? '#000' : color} fontSize="8.5" fontWeight={active ? '700' : '400'}>
                {line2}
              </text>
            ) : null}
            <text x={n.x} y={n.y + 20} textAnchor="middle" fill={active ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)'} fontSize="6.5" fontWeight="600" letterSpacing="0.08em">
              {n.type.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Center node */}
      <circle cx={center.x} cy={center.y} r={44} fill="rgba(167,139,250,0.15)" stroke="#a78bfa" strokeWidth="2" />
      {(() => {
        const words = center.label.split(' ');
        const mid = Math.ceil(words.length / 2);
        const l1 = words.slice(0, mid).join(' ');
        const l2 = words.slice(mid).join(' ');
        return (
          <>
            <text x={center.x} y={l2 ? center.y - 5 : center.y + 4} textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="700">{l1}</text>
            {l2 ? <text x={center.x} y={center.y + 10} textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="700">{l2}</text> : null}
          </>
        );
      })()}
    </svg>
  );
}

/* ── Quiz result screen ───────────────────────────────── */
function QuizResult({correct, total, onReset}: {correct: number; total: number; onReset: () => void}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const grade = pct >= 80 ? {label: 'Excellent', color: 'text-emerald-300', ring: 'ring-emerald-400/40'} :
                pct >= 50 ? {label: 'Good effort', color: 'text-amber-300', ring: 'ring-amber-400/40'} :
                            {label: 'Keep studying', color: 'text-rose-300', ring: 'ring-rose-400/40'};

  return (
    <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} className="flex flex-col items-center justify-center py-10 gap-6">
      <div className={`w-28 h-28 rounded-full bg-white/8 border ring-4 ${grade.ring} flex flex-col items-center justify-center`}>
        <span className={`text-3xl font-bold ${grade.color}`}>{pct}%</span>
        <span className="text-xs text-white/40 mt-0.5">{correct}/{total}</span>
      </div>
      <div className="text-center">
        <p className={`text-xl font-serif ${grade.color}`}>{grade.label}</p>
        <p className="text-sm text-white/50 mt-1">You answered {correct} of {total} correctly</p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 hover:text-white hover:border-white/30 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Try again
      </button>
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────── */
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
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [dataTableTab, setDataTableTab] = useState<DataTableTab>('outcomes');
  const [checkedRows, setCheckedRows] = useState<Record<string, boolean>>({});
  const [quizStep, setQuizStep] = useState(0);          // which question is visible
  const [quizShowAll, setQuizShowAll] = useState(false); // toggle all-questions mode
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTool = studio.activeTool;
  const activeSlideIndex = studio.slideIndexByModule[currentModule.id] ?? 0;
  const slides = currentModule.slides ?? [];
  const safeSlideIndex = Math.min(activeSlideIndex, Math.max(slides.length - 1, 0));
  const quizScore = scoreQuiz(currentModule, studio);
  const activeMindNode = studio.mindMapFocusNodeId || currentModule.id;
  const questions = currentModule.quiz ?? [];

  const totalFlashcards = (currentModule.flashcards ?? []).length;
  const knownCount = Object.values(studio.flashcardConfidence).filter((v) => v === 'known').length;
  const learningCount = Object.values(studio.flashcardConfidence).filter((v) => v === 'learning').length;
  const newCount = totalFlashcards - knownCount - learningCount;

  const patchStudio = (patch: Partial<StudyStudioState>) => {
    onStudioChange({
      ...studio, ...patch,
      quizAnswers: patch.quizAnswers ?? studio.quizAnswers,
      flashcardConfidence: patch.flashcardConfidence ?? studio.flashcardConfidence,
      slideIndexByModule: patch.slideIndexByModule ?? studio.slideIndexByModule,
    });
  };

  const setSlideIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, Math.max(slides.length - 1, 0)));
    patchStudio({slideIndexByModule: {...studio.slideIndexByModule, [currentModule.id]: clamped}});
  };

  /* keyboard navigation for slides */
  useEffect(() => {
    if (activeTool !== 'slides') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setSlideIndex(safeSlideIndex + 1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setSlideIndex(safeSlideIndex - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool, safeSlideIndex, slides.length]);

  /* audio fake playback ticker */
  useEffect(() => {
    if (audioPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((p) => {
          if (p >= 1) { setAudioPlaying(false); return 1; }
          return p + 0.002;
        });
      }, 100);
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    }
    return () => { if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); };
  }, [audioPlaying]);

  /* reset quiz step when module changes */
  useEffect(() => { setQuizStep(0); }, [currentModule.id]);

  const toggleCheck = (key: string) => setCheckedRows((prev) => ({...prev, [key]: !prev[key]}));

  const dataRows = {
    outcomes: currentModule.outcomes.map((o, i) => ({key: `out-${i}`, label: o, tag: 'Outcome'})),
    resources: currentModule.resources.map((r, i) => ({key: `res-${i}`, label: r, tag: 'Resource'})),
    ideas: (currentModule.keyIdeas ?? []).map((k, i) => ({key: `idea-${i}`, label: k, tag: 'Key Idea'})),
  };

  const infographicSteps = [
    {phase: 'Goal',     color: 'bg-violet-400/15 border-violet-400/25 text-violet-300', dot: 'bg-violet-400',  emoji: '🎯', label: 'Module Goal',   text: currentModule.description},
    {phase: 'Ritual',   color: 'bg-amber-400/15 border-amber-400/25 text-amber-300',    dot: 'bg-amber-400',   emoji: '🔁', label: 'Daily Ritual',  text: currentModule.ritual},
    ...currentModule.outcomes.map((o, i) => ({phase: `Outcome ${i + 1}`, color: 'bg-cyan-400/15 border-cyan-400/25 text-cyan-300', dot: 'bg-cyan-400', emoji: '✅', label: 'Outcome', text: o})),
    ...currentModule.resources.map((r, i) => ({phase: `Resource ${i + 1}`, color: 'bg-emerald-400/15 border-emerald-400/25 text-emerald-300', dot: 'bg-emerald-400', emoji: '📎', label: 'Resource', text: r})),
  ];

  const audioDuration = currentModule.durationMinutes * 60;
  const audioChapters = (currentModule.keyIdeas ?? currentModule.outcomes ?? []).slice(0, 4);

  const quizAllAnswered = questions.length > 0 && questions.every((q) => studio.quizAnswers[q.id] !== undefined);

  return (
    <section className="liquid-glass rounded-[2rem] border border-white/10 overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-[0.82fr,1.35fr,0.9fr]">

        {/* ── Sources panel ── */}
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
                  className={`w-full rounded-2xl border p-3 text-left transition-all ${isActive ? 'bg-white/10 border-white/25' : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06]'}`}
                >
                  <div className="flex gap-3">
                    <img src={module.imageUrl} alt={module.imageAlt} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
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

        {/* ── Main content panel ── */}
        <div className="p-5 md:p-7 border-b xl:border-b-0 xl:border-r border-white/8">
          <div className="relative min-h-[31rem] rounded-[1.5rem] overflow-hidden border border-white/8 bg-black/30">
            <img src={currentModule.imageUrl} alt={currentModule.imageAlt} className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/70 to-black/90" />
            <div className="relative p-4 md:p-6 min-h-[31rem] flex flex-col gap-4">

              {/* Tool tab bar */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TOOL_ORDER.map((tool) => {
                  const meta = TOOL_META[tool];
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => patchStudio({activeTool: tool})}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                        activeTool === tool ? 'bg-white text-black border-white' : 'bg-white/10 text-white/75 border-white/10 hover:text-white hover:border-white/25'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {meta.label}
                      {meta.badge ? (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold ${activeTool === tool ? 'bg-black/20 text-black' : 'bg-white/15 text-white/55'}`}>
                          {meta.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Tool content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentModule.id}-${activeTool}`}
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -8}}
                    transition={{duration: 0.15}}
                    className="h-full"
                  >

                    {/* ── AUDIO ── */}
                    {activeTool === 'audio' ? (
                      <div className="space-y-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Audio Overview</p>
                          <h3 className="text-2xl font-serif">{currentModule.title}</h3>
                          <p className="text-sm text-white/50 mt-1">{currentModule.durationMinutes} min · {audioChapters.length} chapters</p>
                        </div>
                        <div className="rounded-[1.5rem] bg-white/8 border border-white/10 p-5">
                          {/* Waveform bars */}
                          <div className="flex items-end gap-[3px] h-10 mb-4">
                            {Array.from({length: 38}).map((_, i) => {
                              const h = 18 + Math.sin(i * 0.85) * 11 + Math.cos(i * 0.35) * 7;
                              const past = audioProgress > i / 38;
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-full transition-colors ${past ? 'bg-teal-400' : 'bg-white/20'}`}
                                  style={{
                                    height: `${h}px`,
                                    animation: audioPlaying ? `pulse ${0.35 + (i % 6) * 0.12}s ease-in-out infinite alternate` : 'none',
                                  }}
                                />
                              );
                            })}
                          </div>
                          {/* Seek bar */}
                          <div
                            className="relative h-1.5 rounded-full bg-white/10 mb-4 cursor-pointer"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setAudioProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                            }}
                          >
                            <div className="h-full rounded-full bg-teal-400 transition-none" style={{width: `${audioProgress * 100}%`}} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow transition-none" style={{left: `calc(${audioProgress * 100}% - 6px)`}} />
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-white/40 tabular-nums">
                              {String(Math.floor(audioProgress * audioDuration / 60)).padStart(2, '0')}:{String(Math.floor(audioProgress * audioDuration % 60)).padStart(2, '0')}
                            </span>
                            <button
                              type="button"
                              onClick={() => { if (audioProgress >= 0.999) setAudioProgress(0); setAudioPlaying((p) => !p); }}
                              className="w-12 h-12 rounded-full bg-teal-400 text-black flex items-center justify-center hover:bg-teal-300 transition-colors"
                            >
                              {audioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </button>
                            <span className="text-xs text-white/40 tabular-nums">
                              {String(Math.floor(audioDuration / 60)).padStart(2, '0')}:{String(audioDuration % 60).padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                        {/* Chapters */}
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-3">Chapters</p>
                          <div className="space-y-2">
                            {audioChapters.map((ch, i) => {
                              const chStart = i / audioChapters.length;
                              const isPast = audioProgress >= chStart;
                              return (
                                <button
                                  key={ch}
                                  type="button"
                                  onClick={() => setAudioProgress(chStart)}
                                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-colors ${isPast ? 'bg-teal-400/10 border-teal-400/20' : 'bg-white/5 border-white/8 hover:bg-white/8'}`}
                                >
                                  <span className="text-[10px] tabular-nums text-white/35 w-8 shrink-0">
                                    {String(Math.floor(chStart * audioDuration / 60)).padStart(2, '0')}:{String(Math.floor(chStart * audioDuration % 60)).padStart(2, '0')}
                                  </span>
                                  <span className={`text-sm flex-1 truncate ${isPast ? 'text-white' : 'text-white/55'}`}>{ch}</span>
                                  {isPast ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* ── VIDEO ── */}
                    {activeTool === 'video' ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Video Overview</p>
                          <h3 className="text-2xl font-serif">{currentModule.title}</h3>
                        </div>
                        <div className="rounded-[1.4rem] overflow-hidden border border-white/10 bg-black">
                          <video key={currentModule.videoUrl} src={currentModule.videoUrl} poster={currentModule.imageUrl} controls className="w-full aspect-video" />
                        </div>
                        <p className="text-sm text-white/60 rounded-2xl bg-white/5 border border-white/8 p-4">{currentModule.description}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {currentModule.outcomes.slice(0, 4).map((o) => (
                            <div key={o} className="rounded-xl bg-sky-400/8 border border-sky-400/15 p-3">
                              <p className="text-xs text-sky-300 leading-relaxed">{o}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* ── SLIDES ── */}
                    {activeTool === 'slides' ? (
                      <div className="flex flex-col h-full min-h-[26rem]">
                        {/* Slide chrome header */}
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Slide deck</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/35 tabular-nums">{safeSlideIndex + 1} / {Math.max(slides.length, 1)}</span>
                            <span className="text-[10px] uppercase tracking-wider text-indigo-300/60 bg-indigo-400/10 border border-indigo-400/20 rounded-full px-2 py-0.5">
                              {slides[safeSlideIndex] ? 'Slide' : 'Overview'}
                            </span>
                          </div>
                        </div>

                        {/* Slide body */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`slide-${safeSlideIndex}`}
                            initial={{opacity: 0, x: 20}}
                            animate={{opacity: 1, x: 0}}
                            exit={{opacity: 0, x: -20}}
                            transition={{duration: 0.2}}
                            className="flex-1 rounded-2xl bg-black/30 border border-white/8 p-6 flex flex-col justify-between"
                          >
                            <div>
                              <h3 className="text-3xl md:text-4xl font-serif mb-6 leading-tight">
                                {slides[safeSlideIndex]?.title ?? currentModule.title}
                              </h3>
                              <div className="space-y-3">
                                {(slides[safeSlideIndex]?.bullets ?? currentModule.keyIdeas ?? []).map((bullet, i) => (
                                  <motion.div
                                    key={bullet}
                                    initial={{opacity: 0, x: -10}}
                                    animate={{opacity: 1, x: 0}}
                                    transition={{delay: i * 0.07}}
                                    className="flex items-start gap-3 rounded-2xl bg-white/8 border border-white/8 p-3.5"
                                  >
                                    <span className="w-5 h-5 rounded-full bg-indigo-400/20 border border-indigo-400/30 text-indigo-300 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                                      {i + 1}
                                    </span>
                                    <p className="text-white/80 text-sm leading-relaxed">{bullet}</p>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        </AnimatePresence>

                        {/* Dot progress */}
                        <div className="flex items-center justify-between gap-3 mt-4">
                          <button
                            type="button"
                            disabled={safeSlideIndex === 0}
                            onClick={() => setSlideIndex(safeSlideIndex - 1)}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronLeft className="w-4 h-4" /> Prev
                          </button>

                          <div className="flex gap-1.5">
                            {Array.from({length: Math.max(slides.length, 1)}).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSlideIndex(i)}
                                className={`rounded-full transition-all ${i === safeSlideIndex ? 'w-5 h-2 bg-indigo-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={safeSlideIndex >= Math.max(slides.length - 1, 0)}
                            onClick={() => setSlideIndex(safeSlideIndex + 1)}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-center text-[10px] text-white/25 mt-2">← → arrow keys also navigate</p>
                      </div>
                    ) : null}

                    {/* ── MIND MAP ── */}
                    {activeTool === 'mindmap' ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Mind Map</p>
                            <h3 className="text-2xl font-serif">{currentModule.title}</h3>
                          </div>
                          <div className="flex gap-2 text-[10px]">
                            {[{label: 'Module', color: 'bg-violet-400'}, {label: 'Outcome', color: 'bg-cyan-400'}, {label: 'Resource', color: 'bg-emerald-400'}].map(({label, color}) => (
                              <span key={label} className="flex items-center gap-1.5 text-white/40">
                                <span className={`w-2 h-2 rounded-full ${color}`} />{label}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* SVG graph */}
                        <div className="rounded-2xl bg-black/30 border border-white/8 overflow-hidden">
                          <MindMapSVG
                            module={currentModule}
                            focusId={activeMindNode}
                            onFocus={(id) => patchStudio({mindMapFocusNodeId: id})}
                          />
                        </div>

                        {/* Focus detail card */}
                        <AnimatePresence mode="wait">
                          {(() => {
                            const allNodes = buildMindMapLayout(currentModule);
                            const focused = allNodes.find((n) => n.id === activeMindNode);
                            if (!focused) return null;
                            return (
                              <motion.div
                                key={activeMindNode}
                                initial={{opacity: 0, y: 6}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0}}
                                className="rounded-2xl bg-white/8 border border-white/10 p-4"
                              >
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">{focused.type}</span>
                                <p className="text-lg font-serif mt-1">{focused.label}</p>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>

                        {/* Node list quick jump */}
                        <div className="grid grid-cols-2 gap-2">
                          {buildMindMapLayout(currentModule).slice(1).map((n) => {
                            const colors: Record<string, string> = {Outcome: 'border-cyan-400/20 hover:border-cyan-400/40', Resource: 'border-emerald-400/20 hover:border-emerald-400/40'};
                            const active = activeMindNode === n.id;
                            return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => patchStudio({mindMapFocusNodeId: n.id})}
                                className={`rounded-xl border p-3 text-left text-xs transition-colors ${active ? 'bg-white/10 border-white/30' : `bg-white/[0.03] ${colors[n.type] ?? 'border-white/10'}`}`}
                              >
                                <span className="block text-[9px] uppercase tracking-wider text-white/35 mb-1">{n.type}</span>
                                <span className="text-white/75 leading-snug line-clamp-2">{n.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* ── REPORTS ── */}
                    {activeTool === 'report' ? (
                      <div className="space-y-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Reports</p>
                          <h3 className="text-2xl font-serif">Session analytics</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            {label: 'Modules done', value: completedModuleIds.length, total: course.modules.length, barColor: 'bg-emerald-400', textColor: 'text-emerald-300'},
                            {label: 'Quiz correct', value: quizScore.correct, total: quizScore.total, barColor: 'bg-cyan-400', textColor: 'text-cyan-300'},
                            {label: 'Cards known', value: knownCount, total: totalFlashcards, barColor: 'bg-rose-400', textColor: 'text-rose-300'},
                            {label: 'Min studied', value: course.modules.filter((m) => completedModuleIds.includes(m.id)).reduce((a, m) => a + m.durationMinutes, 0), total: course.durationMinutes, barColor: 'bg-orange-400', textColor: 'text-orange-300'},
                          ].map(({label, value, total, barColor, textColor}) => (
                            <div key={label} className="rounded-2xl bg-white/8 border border-white/8 p-4">
                              <p className={`text-2xl font-bold ${textColor}`}>{value}<span className="text-sm text-white/30">/{total}</span></p>
                              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 mt-1">{label}</p>
                              <div className="mt-3 h-1 rounded-full bg-white/10">
                                <div className={`h-full rounded-full ${barColor} transition-all`} style={{width: total > 0 ? `${(value / total) * 100}%` : '0%'}} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-[1.4rem] bg-white/8 border border-white/8 p-5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Flashcard mastery</p>
                          <div className="flex gap-1 h-5 rounded-full overflow-hidden">
                            {totalFlashcards > 0 ? (
                              <>
                                <div className="bg-rose-400/60" style={{width: `${(newCount / totalFlashcards) * 100}%`}} />
                                <div className="bg-amber-400/60" style={{width: `${(learningCount / totalFlashcards) * 100}%`}} />
                                <div className="bg-emerald-400/60" style={{width: `${(knownCount / totalFlashcards) * 100}%`}} />
                              </>
                            ) : <div className="bg-white/10 flex-1 rounded-full" />}
                          </div>
                          <div className="flex gap-5 mt-3">
                            {[{l: 'New', c: newCount, col: 'bg-rose-400/60'}, {l: 'Learning', c: learningCount, col: 'bg-amber-400/60'}, {l: 'Known', c: knownCount, col: 'bg-emerald-400/60'}].map(({l, c, col}) => (
                              <div key={l} className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${col}`} />
                                <span className="text-xs text-white/55">{l} <span className="text-white/80 font-medium">{c}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[1.4rem] bg-white/8 border border-white/8 p-5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Module completion</p>
                          <div className="space-y-2">
                            {course.modules.map((m, i) => {
                              const done = completedModuleIds.includes(m.id);
                              const isCurrent = m.id === currentModule.id;
                              return (
                                <div key={m.id} className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${done ? 'bg-emerald-400 border-emerald-400' : isCurrent ? 'border-white/50' : 'border-white/15'}`}>
                                    {done ? <CheckCircle2 className="w-3 h-3 text-black" /> : <span className="text-[9px] text-white/50">{i + 1}</span>}
                                  </div>
                                  <span className={`text-sm truncate flex-1 ${isCurrent ? 'text-white font-medium' : done ? 'text-white/40 line-through' : 'text-white/60'}`}>{m.title}</span>
                                  <span className="text-[10px] text-white/30 shrink-0">{m.durationMinutes}m</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* ── QUIZ ── */}
                    {activeTool === 'quiz' ? (
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Quiz</p>
                            <h3 className="text-2xl font-serif">Check understanding</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/70 tabular-nums">
                              {quizScore.correct}/{quizScore.total} ✓
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuizShowAll((v) => !v)}
                              className="rounded-full bg-white/8 border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                            >
                              {quizShowAll ? 'Step mode' : 'All questions'}
                            </button>
                          </div>
                        </div>

                        {/* Show result screen if all answered in step mode */}
                        {!quizShowAll && quizAllAnswered ? (
                          <QuizResult
                            correct={quizScore.correct}
                            total={quizScore.total}
                            onReset={() => { patchStudio({quizAnswers: {}}); setQuizStep(0); }}
                          />
                        ) : quizShowAll ? (
                          /* All-questions mode */
                          <div className="space-y-4">
                            {questions.map((question, qi) => {
                              const selected = studio.quizAnswers[question.id];
                              return (
                                <div key={question.id} className="rounded-[1.4rem] bg-white/8 border border-white/8 p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-cyan-400/15 border border-cyan-400/25 text-cyan-300 text-[10px] flex items-center justify-center font-bold shrink-0">{qi + 1}</span>
                                    <p className="font-medium text-sm">{question.question}</p>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {question.options.map((opt, idx) => {
                                      const isSel = selected === idx;
                                      const isCorrect = idx === question.correctOptionIndex;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => patchStudio({quizAnswers: {...studio.quizAnswers, [question.id]: idx}})}
                                          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                                            isSel ? (isCorrect ? 'bg-emerald-400/20 border-emerald-300/50 text-emerald-100' : 'bg-rose-400/20 border-rose-300/50 text-rose-100') : 'bg-black/20 border-white/10 hover:border-white/25'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {selected !== undefined ? (
                                    <p className="text-xs text-white/50 mt-3 border-t border-white/8 pt-3">{question.explanation}</p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Step-by-step mode */
                          <div>
                            {/* Progress bar */}
                            <div className="flex gap-1 mb-4">
                              {questions.map((q, i) => {
                                const answered = studio.quizAnswers[q.id] !== undefined;
                                const correct = studio.quizAnswers[q.id] === q.correctOptionIndex;
                                return (
                                  <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => setQuizStep(i)}
                                    className={`flex-1 h-1.5 rounded-full transition-all ${
                                      i === quizStep ? 'bg-cyan-400' : answered ? (correct ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-white/15'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-white/35 mb-4">Question {quizStep + 1} of {questions.length}</p>

                            {(() => {
                              const question = questions[quizStep];
                              if (!question) return null;
                              const selected = studio.quizAnswers[question.id];
                              return (
                                <AnimatePresence mode="wait">
                                  <motion.div
                                    key={question.id}
                                    initial={{opacity: 0, x: 20}}
                                    animate={{opacity: 1, x: 0}}
                                    exit={{opacity: 0, x: -20}}
                                    transition={{duration: 0.18}}
                                    className="space-y-4"
                                  >
                                    <div className="rounded-[1.4rem] bg-white/8 border border-white/8 p-5">
                                      <p className="font-medium leading-relaxed mb-4">{question.question}</p>
                                      <div className="grid grid-cols-1 gap-2">
                                        {question.options.map((opt, idx) => {
                                          const isSel = selected === idx;
                                          const isCorrect = idx === question.correctOptionIndex;
                                          return (
                                            <button
                                              key={opt}
                                              type="button"
                                              onClick={() => patchStudio({quizAnswers: {...studio.quizAnswers, [question.id]: idx}})}
                                              className={`rounded-xl border px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${
                                                isSel ? (isCorrect ? 'bg-emerald-400/20 border-emerald-300/50 text-emerald-100' : 'bg-rose-400/20 border-rose-300/50 text-rose-100') : 'bg-black/20 border-white/10 hover:border-white/20 hover:bg-white/5'
                                              }`}
                                            >
                                              <span className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center shrink-0 font-bold ${isSel ? 'border-current bg-current/20' : 'border-white/20'}`}>
                                                {String.fromCharCode(65 + idx)}
                                              </span>
                                              {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {selected !== undefined ? (
                                        <motion.p
                                          initial={{opacity: 0, y: 4}}
                                          animate={{opacity: 1, y: 0}}
                                          className="text-xs text-white/50 mt-4 border-t border-white/8 pt-3"
                                        >
                                          {question.explanation}
                                        </motion.p>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                      <button
                                        type="button"
                                        disabled={quizStep === 0}
                                        onClick={() => setQuizStep((s) => s - 1)}
                                        className="rounded-full border border-white/10 px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed"
                                      >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                      </button>
                                      {quizStep < questions.length - 1 ? (
                                        <button
                                          type="button"
                                          onClick={() => setQuizStep((s) => s + 1)}
                                          className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm inline-flex items-center gap-2 hover:bg-white/15"
                                        >
                                          Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {/* triggers result screen via quizAllAnswered */}}
                                          className="rounded-full bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 px-4 py-2 text-sm inline-flex items-center gap-2 hover:bg-cyan-400/30"
                                        >
                                          See results <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                </AnimatePresence>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* ── DATA TABLE ── */}
                    {activeTool === 'datatable' ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Data Table</p>
                          <h3 className="text-2xl font-serif">{currentModule.title}</h3>
                        </div>
                        <div className="flex gap-2 border-b border-white/8 pb-3">
                          {(['outcomes', 'resources', 'ideas'] as DataTableTab[]).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setDataTableTab(tab)}
                              className={`rounded-full px-3 py-1.5 text-xs capitalize border transition-colors ${dataTableTab === tab ? 'bg-white text-black border-white' : 'border-white/10 text-white/55 hover:border-white/25'}`}
                            >
                              {tab === 'ideas' ? 'Key Ideas' : tab} ({dataRows[tab].length})
                            </button>
                          ))}
                        </div>
                        <div className="rounded-[1.4rem] overflow-hidden border border-white/8">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/8 bg-white/[0.03]">
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/35 w-8">#</th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
                                  {dataTableTab === 'ideas' ? 'Key Idea' : dataTableTab.slice(0, -1)}
                                </th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/35 w-24">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dataRows[dataTableTab].map((row, i) => (
                                <tr key={row.key} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 text-white/25 tabular-nums text-xs">{i + 1}</td>
                                  <td className="px-4 py-3 text-white/80 leading-relaxed">{row.label}</td>
                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleCheck(row.key)}
                                      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider border transition-colors ${checkedRows[row.key] ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' : 'border-white/10 text-white/35 hover:border-white/25'}`}
                                    >
                                      {checkedRows[row.key] ? 'Done' : 'To do'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-white/30">
                          {Object.values(checkedRows).filter(Boolean).length} of {dataRows[dataTableTab].length} marked done
                        </p>
                      </div>
                    ) : null}

                    {/* ── FLASHCARDS ── */}
                    {activeTool === 'flashcards' ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Flashcards</p>
                            <h3 className="text-2xl font-serif">Flip to reveal</h3>
                          </div>
                          <div className="rounded-full bg-white/8 border border-white/8 px-3 py-1.5 text-xs text-white/50 tabular-nums">
                            {knownCount}/{totalFlashcards} known
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(currentModule.flashcards ?? []).map((card) => {
                            const flipped = flippedFlashcardId === card.id;
                            const confidence = studio.flashcardConfidence[card.id] ?? 'new';
                            const confColor: Record<FlashcardConfidence, string> = {new: 'text-rose-300', learning: 'text-amber-300', known: 'text-emerald-300'};
                            return (
                              <div key={card.id} className="rounded-[1.4rem] bg-white/8 border border-white/10 p-4 flex flex-col gap-3">
                                <button
                                  type="button"
                                  onClick={() => setFlippedFlashcardId(flipped ? null : card.id)}
                                  className="min-h-28 w-full text-left group"
                                  aria-label={flipped ? 'Click to see front' : 'Click to flip card'}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{flipped ? 'Answer' : 'Question'}</p>
                                    <span className="text-[10px] text-white/25 group-hover:text-white/40 transition-colors">tap to flip</span>
                                  </div>
                                  <AnimatePresence mode="wait">
                                    <motion.p
                                      key={flipped ? 'back' : 'front'}
                                      initial={{opacity: 0, rotateX: -15}}
                                      animate={{opacity: 1, rotateX: 0}}
                                      exit={{opacity: 0}}
                                      transition={{duration: 0.15}}
                                      className="text-lg font-serif leading-snug"
                                    >
                                      {flipped ? card.back : card.front}
                                    </motion.p>
                                  </AnimatePresence>
                                </button>
                                <div className="flex items-center gap-2 pt-2 border-t border-white/8">
                                  <span className={`text-[10px] uppercase tracking-wider mr-auto ${confColor[confidence]}`}>{confidence}</span>
                                  {CONFIDENCE_LABELS.map((label) => (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => patchStudio({flashcardConfidence: {...studio.flashcardConfidence, [card.id]: label}})}
                                      className={`rounded-full px-3 py-1.5 text-xs capitalize border transition-all ${confidence === label ? 'bg-white text-black border-white' : 'border-white/10 text-white/55 hover:border-white/25'}`}
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

                    {/* ── INFOGRAPHIC ── */}
                    {activeTool === 'infographic' ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Infographic</p>
                          <h3 className="text-2xl font-serif">Learning journey</h3>
                        </div>
                        {/* Phase legend */}
                        <div className="flex flex-wrap gap-2">
                          {[{label: 'Goal', color: 'bg-violet-400/20 text-violet-300 border-violet-400/20'}, {label: 'Ritual', color: 'bg-amber-400/20 text-amber-300 border-amber-400/20'}, {label: 'Outcome', color: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/20'}, {label: 'Resource', color: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/20'}].map(({label, color}) => (
                            <span key={label} className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${color}`}>{label}</span>
                          ))}
                        </div>
                        {/* Steps */}
                        <div className="relative pl-2">
                          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-violet-400/50 via-cyan-400/30 to-emerald-400/10" />
                          <div className="space-y-3">
                            {infographicSteps.map((step, i) => (
                              <motion.div
                                key={`${step.label}-${i}`}
                                initial={{opacity: 0, x: -12}}
                                animate={{opacity: 1, x: 0}}
                                transition={{delay: i * 0.05}}
                                className="flex gap-4"
                              >
                                <div className="flex flex-col items-center shrink-0">
                                  <div className="w-9 h-9 rounded-full bg-white/8 border border-white/12 flex items-center justify-center text-lg z-10 relative">
                                    {step.emoji}
                                  </div>
                                  <div className={`w-1.5 h-1.5 rounded-full ${step.dot} mt-1 opacity-60`} />
                                </div>
                                <div className={`flex-1 rounded-2xl border p-3.5 mb-1 ${step.color}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60 font-bold">{step.phase}</span>
                                  </div>
                                  <p className="text-sm leading-relaxed opacity-90">{step.text}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* ── STUDY GUIDE ── */}
                    {activeTool === 'guide' ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Study guide</p>
                        <h3 className="text-3xl font-serif mb-5">{currentModule.title} field notes</h3>
                        <div className="space-y-3">
                          {(currentModule.keyIdeas ?? []).map((idea) => (
                            <div key={idea} className="rounded-2xl bg-white/10 border border-white/10 p-4">
                              <Sparkles className="w-4 h-4 text-amber-400/60 mb-2" />
                              <p className="text-white/75">{idea}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* ── RESOURCE CARDS ── */}
                    {activeTool === 'cards' ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4">Resource cards</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentModule.resources.map((resource, index) => (
                            <div key={resource} className="rounded-[1.4rem] bg-white/10 border border-white/10 p-5">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mb-3">Resource {index + 1}</p>
                              <h3 className="text-2xl font-serif mb-3">{resource}</h3>
                              <p className="text-white/62 text-sm leading-relaxed">Use this after the video, then write the next action in your module journal.</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ── Studio sidebar ── */}
        <aside className="p-5 md:p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-1">Studio</p>
            <h3 className="text-2xl font-serif">Study tools</h3>
          </div>

          <div className="space-y-2">
            {TOOL_ORDER.map((tool) => {
              const meta = TOOL_META[tool];
              const Icon = meta.Icon;
              const isActive = activeTool === tool;

              let progressNode: ReactNode = null;
              if (tool === 'quiz' && quizScore.total > 0)          progressNode = <span className="text-[10px] text-white/45 tabular-nums">{quizScore.correct}/{quizScore.total}</span>;
              else if (tool === 'flashcards' && totalFlashcards > 0) progressNode = <span className="text-[10px] text-white/45 tabular-nums">{knownCount}/{totalFlashcards}</span>;
              else if (tool === 'slides' && slides.length > 0)      progressNode = <span className="text-[10px] text-white/45 tabular-nums">{safeSlideIndex + 1}/{slides.length}</span>;
              else if (tool === 'audio' && audioPlaying)            progressNode = <span className="text-[10px] text-teal-400 animate-pulse">● Live</span>;
              else if (tool === 'report') {
                const pct = course.modules.length > 0 ? Math.round((completedModuleIds.length / course.modules.length) * 100) : 0;
                progressNode = <span className="text-[10px] text-white/45">{pct}%</span>;
              }

              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => patchStudio({activeTool: tool})}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all group ${meta.tint} ${isActive ? 'border-white/30 ring-1 ring-white/12 bg-white/8' : 'border-white/8 hover:border-white/20 hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{meta.label}</span>
                          {meta.badge ? <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/45">{meta.badge}</span> : null}
                        </div>
                        <p className="text-[10px] text-white/38 mt-0.5 leading-tight truncate">{meta.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {progressNode}
                      <ChevronRight className={`w-4 h-4 opacity-35 transition-transform ${isActive ? 'rotate-90 opacity-60' : 'group-hover:translate-x-0.5'}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Session pulse */}
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">Session pulse</p>
            <div className="space-y-2">
              {[
                {label: 'Quiz', value: `${quizScore.answered}/${quizScore.total} answered`},
                {label: 'Cards known', value: `${knownCount}/${totalFlashcards}`},
                {label: 'Progress', value: `${completedModuleIds.length}/${course.modules.length} modules`},
              ].map(({label, value}) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/50">{label}</span>
                  <span className="text-white/75">{value}</span>
                </div>
              ))}
              <div className="h-1.5 rounded-full bg-white/8 mt-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-all"
                  style={{width: course.modules.length > 0 ? `${(completedModuleIds.length / course.modules.length) * 100}%` : '0%'}}
                />
              </div>
            </div>
          </div>
        </aside>

      </div>
    </section>
  );
}
