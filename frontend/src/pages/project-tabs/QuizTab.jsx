import React, { useState } from 'react';
import { Brain, Play, CheckCircle2, XCircle, Loader2, ChevronRight, RotateCcw, Award, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';

const STATES = { IDLE: 'idle', LOADING: 'loading', TAKING: 'taking', SUBMITTING: 'submitting', RESULTS: 'results' };

export const QuizTab = ({ projectId }) => {
  const [state, setState] = useState(STATES.IDLE);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [error, setError] = useState('');

  const generateQuiz = async () => {
    try {
      setState(STATES.LOADING);
      setError('');
      const q = await api.generateQuiz(projectId);
      setQuiz(q);
      setAnswers({});
      setCurrentQ(0);
      setState(STATES.TAKING);
    } catch (err) {
      setError(err.message);
      setState(STATES.IDLE);
    }
  };

  const submitQuiz = async () => {
    try {
      setState(STATES.SUBMITTING);
      const submittedAnswers = Object.entries(answers).map(([idx, ans]) => ({
        questionIndex: parseInt(idx),
        userAnswer: ans
      }));
      const res = await api.submitQuiz(projectId, quiz._id, submittedAnswers);
      setResults(res);
      setState(STATES.RESULTS);
    } catch (err) {
      setError(err.message);
      setState(STATES.TAKING);
    }
  };

  const reset = () => {
    setState(STATES.IDLE);
    setQuiz(null);
    setAnswers({});
    setResults(null);
    setCurrentQ(0);
    setError('');
  };

  const currentQuestion = quiz?.questions?.[currentQ];
  const totalQ = quiz?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;

  // IDLE STATE
  if (state === STATES.IDLE) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 glow-primary">
          <Brain className="w-10 h-10" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-2xl font-bold text-white">Adaptive Assessment</h3>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            The AI selects questions based on your current concept mastery and recent mistakes. MCQs for rapid recall and open-ended for reasoning depth.
          </p>
        </div>
        {error && (
          <div className="text-rose-400 text-sm flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <button
          onClick={generateQuiz}
          className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center gap-2.5"
        >
          <Play className="w-5 h-5" /> Generate Adaptive Quiz
        </button>
      </div>
    );
  }

  // LOADING STATE
  if (state === STATES.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-300 font-semibold">Analyzing concept mastery & generating adaptive questions...</p>
      </div>
    );
  }

  // SUBMITTING STATE
  if (state === STATES.SUBMITTING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-slate-300 font-semibold">AI is evaluating your answers with detailed rubric scoring...</p>
      </div>
    );
  }

  // RESULTS STATE
  if (state === STATES.RESULTS && results) {
    const score = results.overallScore;
    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 55 ? 'text-amber-400' : 'text-rose-400';

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Score Header */}
        <div className="glass-panel rounded-3xl p-6 text-center space-y-2">
          <Award className="w-10 h-10 text-indigo-400 mx-auto" />
          <h3 className="text-2xl font-bold text-white">Quiz Results</h3>
          <div className={`text-5xl font-extrabold ${scoreColor}`}>{score}%</div>
          <p className="text-slate-400 text-sm">
            {score >= 80 ? 'Excellent! Mastery concepts have been updated.' : score >= 55 ? 'Good effort. Mastery scores updated—focus on weak concepts.' : 'Keep practicing! Detailed feedback below will guide your revision.'}
          </p>
        </div>

        {/* Per-Question Breakdown */}
        <div className="space-y-4">
          {results.evaluatedAnswers?.map((ans, idx) => (
            <div key={idx} className={`glass-panel rounded-2xl p-5 border-l-4 ${ans.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {ans.isCorrect
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                  }
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={ans.questionType === 'mcq' ? 'stable' : 'improving'}>
                        {ans.questionType === 'mcq' ? 'MCQ' : 'Open-Ended'}
                      </Badge>
                      <span className="text-xs text-slate-400">{ans.conceptName}</span>
                      <span className="text-xs font-bold text-white">{ans.score}%</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">{ans.questionText}</p>
                    <p className="text-xs text-slate-400 italic">Your answer: "{String(ans.userAnswer)}"</p>
                  </div>
                </div>
              </div>

              {/* AI Evaluation Breakdown */}
              {ans.aiEvaluation && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <p className="text-slate-200 font-semibold">📊 AI Evaluation</p>
                  <p className="text-slate-300"><span className="text-slate-400 font-medium">Understanding:</span> {ans.aiEvaluation.understandingSummary}</p>
                  {ans.aiEvaluation.reasoningFeedback && (
                    <p className="text-slate-300"><span className="text-slate-400 font-medium">Reasoning:</span> {ans.aiEvaluation.reasoningFeedback}</p>
                  )}
                  {ans.aiEvaluation.missingConcepts?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-rose-400 font-medium">Missing Concepts:</span>
                      {ans.aiEvaluation.missingConcepts.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">{c}</span>
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

        <div className="flex justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Generate New Quiz
          </button>
        </div>
      </div>
    );
  }

  // TAKING STATE
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress header */}
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{quiz?.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Question {Math.min(currentQ + 1, totalQ)} of {totalQ} · {answeredCount} answered
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quiz?.questions?.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition ${
                i === currentQ
                  ? 'bg-indigo-600 text-white'
                  : answers[i] !== undefined
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="glass-panel rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant={currentQuestion.type === 'mcq' ? 'stable' : 'improving'}>
              {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Open-Ended'}
            </Badge>
            <Badge variant="default">{currentQuestion.difficulty}</Badge>
            <span className="ml-auto text-xs text-slate-400">{currentQuestion.conceptName}</span>
          </div>

          <h3 className="text-lg font-bold text-white leading-snug">{currentQuestion.questionText}</h3>

          {currentQuestion.type === 'mcq' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers({ ...answers, [currentQ]: oi })}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition ${
                    answers[currentQ] === oi
                      ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold mr-3 ${
                    answers[currentQ] === oi ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {['A', 'B', 'C', 'D'][oi]}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              rows={5}
              placeholder="Write your answer here. Be specific about the mechanism, apply the concept, and explain the reasoning..."
              value={answers[currentQ] || ''}
              onChange={(e) => setAnswers({ ...answers, [currentQ]: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium disabled:opacity-40 hover:border-slate-500 transition"
            >
              ← Previous
            </button>

            {currentQ < totalQ - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={answeredCount === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold transition flex items-center gap-2"
              >
                Submit Quiz ({answeredCount}/{totalQ} answered)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
