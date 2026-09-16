import React, { useState } from 'react';
import {
  Brain,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  RotateCcw,
  Award,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';

const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  TAKING: 'taking',
  EVALUATED: 'evaluated',
  SUBMITTING_STEP: 'submitting_step',
  RESULTS: 'results'
};

export const QuizTab = ({ projectId }) => {
  const [state, setState] = useState(STATES.IDLE);
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [stepEvaluation, setStepEvaluation] = useState(null);
  const [adaptationNote, setAdaptationNote] = useState('');
  const [historyTrail, setHistoryTrail] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [submittingStep, setSubmittingStep] = useState(false);

  const startAdaptiveQuiz = async () => {
    try {
      setState(STATES.LOADING);
      setError('');
      setHistoryTrail([]);
      setStepEvaluation(null);
      setAdaptationNote('');
      setCurrentAnswer('');

      const q = await api.generateQuiz(projectId);
      setQuiz(q);
      setCurrentQ(0);
      setState(STATES.TAKING);
    } catch (err) {
      setError(err.message || 'Failed to start quiz');
      setState(STATES.IDLE);
    }
  };

  const handleAnswerSubmit = async () => {
    if (currentAnswer === undefined || currentAnswer === '' || submittingStep) return;

    try {
      setSubmittingStep(true);
      setError('');

      const res = await api.submitAdaptiveStep(projectId, quiz._id, {
        questionIndex: currentQ,
        userAnswer: currentAnswer
      });

      const evaluated = res.evaluatedAnswer;
      setStepEvaluation(evaluated);
      setAdaptationNote(res.adaptationMessage || '');

      const newTrailItem = {
        questionIndex: currentQ,
        difficulty: quiz.questions[currentQ]?.difficulty || 'intermediate',
        score: evaluated?.score || 0,
        isCorrect: evaluated?.isCorrect,
        conceptName: quiz.questions[currentQ]?.conceptName || 'Concept'
      };
      setHistoryTrail((prev) => [...prev, newTrailItem]);

      if (res.isComplete) {
        setResults(res.results);
        setState(STATES.RESULTS);
      } else {
        if (res.nextQuestion) {
          setQuiz((prev) => {
            const updated = [...(prev.questions || [])];
            updated[res.questionIndex] = res.nextQuestion;
            return { ...prev, questions: updated };
          });
        }
        setState(STATES.EVALUATED);
      }
    } catch (err) {
      setError(err.message || 'Failed to evaluate answer');
    } finally {
      setSubmittingStep(false);
    }
  };

  const proceedToNextQuestion = () => {
    setCurrentQ((prev) => prev + 1);
    setCurrentAnswer('');
    setStepEvaluation(null);
    setAdaptationNote('');
    setState(STATES.TAKING);
  };

  const reset = () => {
    setState(STATES.IDLE);
    setQuiz(null);
    setCurrentQ(0);
    setCurrentAnswer('');
    setStepEvaluation(null);
    setAdaptationNote('');
    setHistoryTrail([]);
    setResults(null);
    setError('');
  };

  const currentQuestion = quiz?.questions?.[currentQ];
  const totalTarget = quiz?.totalTargetQuestions || 7;

  const renderDifficultyBadge = (diff) => {
    const d = String(diff || '').toLowerCase();
    if (d === 'advanced') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <TrendingUp className="w-3 h-3 text-rose-400" /> Hard (Advanced)
        </span>
      );
    }
    if (d === 'beginner') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <TrendingDown className="w-3 h-3 text-emerald-400" /> Easy (Beginner)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
        Medium (Intermediate)
      </span>
    );
  };

  // 1. IDLE STATE
  if (state === STATES.IDLE) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 animate-fade-in p-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-xl shadow-indigo-600/20">
          <Brain className="w-10 h-10" />
        </div>
        <div className="text-center max-w-lg space-y-2">
          <h3 className="text-2xl font-bold text-white">Adaptive Assessment</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            7 questions tailored in real-time. Each question dynamically adapts based on your performance on the previous one:
          </p>
          <div className="grid grid-cols-2 gap-3 pt-3 text-left">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> High Performance
              </span>
              <p className="text-slate-400 mt-1">Succeed on a question &rarr; Next question escalates to <strong>Hard</strong> to test deeper reasoning.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Need Practice
              </span>
              <p className="text-slate-400 mt-1">Struggle on a question &rarr; Next question adjusts to <strong>Easy</strong> to solidify foundations.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-rose-400 text-sm flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <button
          onClick={startAdaptiveQuiz}
          className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center gap-2.5"
        >
          <Play className="w-5 h-5" /> Start Adaptive Quiz (7 Questions)
        </button>
      </div>
    );
  }

  // 2. LOADING STATE
  if (state === STATES.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-300 font-semibold">Analyzing concept mastery & generating baseline adaptive questions...</p>
      </div>
    );
  }

  // 3. RESULTS STATE
  if (state === STATES.RESULTS && results) {
    const score = results.overallScore ?? 0;
    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 55 ? 'text-amber-400' : 'text-rose-400';

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Score Header */}
        <div className="glass-panel rounded-3xl p-6 text-center space-y-3">
          <Award className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-2xl font-bold text-white">Adaptive Quiz Complete</h3>
          <div className={`text-6xl font-black ${scoreColor}`}>{score}%</div>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {score >= 80
              ? 'Outstanding performance! You mastered challenging scenarios across your materials.'
              : score >= 55
                ? 'Good effort! Concept mastery has been updated. Review feedback to sharpen weaker areas.'
                : 'Keep practicing! Review the rubric notes below to strengthen core fundamentals.'}
          </p>

          {/* Difficulty Trajectory Map */}
          {historyTrail.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Real-Time Adaptive Difficulty Trajectory
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {historyTrail.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                        item.score >= 70
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : item.score < 50
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <span>Q{idx + 1}:</span>
                      <span className="capitalize">{item.difficulty}</span>
                      <span className="font-bold">({item.score}%)</span>
                    </div>
                    {idx < historyTrail.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Question-by-Question AI Feedback */}
        <div className="space-y-4">
          {results.evaluatedAnswers?.map((ans, idx) => (
            <div
              key={idx}
              className={`glass-panel rounded-2xl p-5 border-l-4 ${
                ans.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {ans.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-300">Question {idx + 1}</span>
                    <Badge variant={ans.questionType === 'mcq' ? 'stable' : 'improving'}>
                      {ans.questionType === 'mcq' ? 'MCQ' : 'Open-Ended'}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">{ans.conceptName}</span>
                    <span className="ml-auto text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                      Score: {ans.score}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium pt-1">{ans.questionText}</p>
                  <p className="text-xs text-slate-400 italic">Your response: "{String(ans.userAnswer)}"</p>
                </div>
              </div>

              {ans.aiEvaluation && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-200 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Rubric Evaluation
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-400 font-medium">Understanding:</span>{' '}
                    {ans.aiEvaluation.understandingSummary}
                  </p>
                  {ans.aiEvaluation.reasoningFeedback && (
                    <p className="text-slate-300">
                      <span className="text-slate-400 font-medium">Reasoning:</span>{' '}
                      {ans.aiEvaluation.reasoningFeedback}
                    </p>
                  )}
                  {ans.aiEvaluation.missingConcepts?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-rose-400 font-medium">Missing Concepts:</span>
                      {ans.aiEvaluation.missingConcepts.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {ans.aiEvaluation.improvementAdvice && (
                    <p className="text-indigo-300 border-t border-slate-800 pt-2 mt-1">
                      💡 {ans.aiEvaluation.improvementAdvice}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <RotateCcw className="w-4 h-4" /> Start New Adaptive Quiz
          </button>
        </div>
      </div>
    );
  }

  // 4. TAKING & EVALUATED STATES
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Adaptive Progress Header */}
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Adaptive Assessment Session</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Question {currentQ + 1} of {totalTarget} · Real-time performance adaptation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalTarget }).map((_, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition ${
                i === currentQ
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                  : i < historyTrail.length
                    ? historyTrail[i].isCorrect
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Current Question Card */}
      {currentQuestion && (
        <div className="glass-panel rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant={currentQuestion.type === 'mcq' ? 'stable' : 'improving'}>
              {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Open-Ended'}
            </Badge>
            {renderDifficultyBadge(currentQuestion.difficulty)}
            <span className="ml-auto text-xs font-semibold text-slate-400 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              Concept: {currentQuestion.conceptName}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white leading-snug">{currentQuestion.questionText}</h3>

          {/* Options / Text Input */}
          {currentQuestion.type === 'mcq' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map((opt, oi) => {
                const isSelected = currentAnswer === oi;
                return (
                  <button
                    key={oi}
                    disabled={state === STATES.EVALUATED || submittingStep}
                    onClick={() => setCurrentAnswer(oi)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                    } disabled:cursor-not-allowed`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold mr-3 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {['A', 'B', 'C', 'D'][oi]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={5}
                disabled={state === STATES.EVALUATED || submittingStep}
                placeholder="Write your explanation here. Describe the mechanism, outline edge cases, and justify your answer..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none resize-none disabled:opacity-75"
              />
              <p className="text-[11px] text-slate-500">
                Tip: Elaborate on core concepts, trade-offs, and practical implications for higher rubric scoring.
              </p>
            </div>
          )}

          {error && (
            <div className="text-rose-400 text-sm flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Action Row */}
          {state === STATES.TAKING && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAnswerSubmit}
                disabled={currentAnswer === '' || submittingStep}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                {submittingStep ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Evaluating & Adapting...
                  </>
                ) : (
                  <>
                    Submit Answer <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Instant Evaluation Card & Next Question Banner */}
          {state === STATES.EVALUATED && stepEvaluation && (
            <div className="space-y-4 pt-3 border-t border-slate-800 animate-fade-in">
              <div
                className={`p-4 rounded-2xl border ${
                  stepEvaluation.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {stepEvaluation.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span className="font-bold text-sm text-white">
                    {stepEvaluation.isCorrect ? 'Correct!' : 'Needs Review'} (Score: {stepEvaluation.score}%)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {stepEvaluation.aiEvaluation?.reasoningFeedback ||
                    stepEvaluation.aiEvaluation?.understandingSummary}
                </p>
                {stepEvaluation.aiEvaluation?.improvementAdvice && (
                  <p className="text-xs text-indigo-300 mt-2 border-t border-slate-800/60 pt-2">
                    💡 {stepEvaluation.aiEvaluation.improvementAdvice}
                  </p>
                )}
              </div>

              {/* Dynamic Adaptation Notice */}
              {adaptationNote && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-2.5 text-xs text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{adaptationNote}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={proceedToNextQuestion}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  Proceed to Question {currentQ + 2} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
