import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Award, Clock } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

const questions: Question[] = [
  {
    id: 1,
    text: "Durante una fase de sprint máximo, ¿qué grupo muscular es el principal responsable de la deceleración rápida del miembro inferior durante la fase de balanceo terminal?",
    options: ["Cuádriceps Femoral", "Complejo Isquiotibial", "Glúteo Mayor", "Gastrocnemio"],
    correct: 1
  },
  {
    id: 2,
    text: "¿Cuál es el umbral de Variabilidad de la Frecuencia Cardíaca (HRV) que indica una recuperación parasimpática óptima en atletas de élite?",
    options: ["Baja variabilidad constante", "Alta variabilidad con RMSSD elevado", "Frecuencia cardíaca en reposo alta", "Patrón de onda sinusoidal"],
    correct: 1
  },
  {
    id: 3,
    text: "En el Velocity Based Training (VBT), ¿qué pérdida de velocidad porcentual suele indicar el inicio de la fatiga neuromuscular significativa?",
    options: ["2-5%", "10-15%", "20-30%", "40-50%"],
    correct: 2
  }
];

export const QuizSystem = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
  };

  const handleNext = () => {
    if (selectedOption === questions[currentQuestion].correct) {
      setScore(score + 1);
    }

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setScore(0);
    setShowResult(false);
  };

  const percentage = Math.round((score / questions.length) * 100);
  const isPassed = percentage >= 70;

  return (
    <div className="min-h-screen bg-[#121415] text-white font-['Space_Grotesk'] p-6 lg:p-12 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-zinc-900/50 border border-zinc-800 p-8 md:p-12 rounded-2xl relative overflow-hidden"
            >
              {/* Progress Header */}
              <div className="flex justify-between items-end mb-8">
                <div>
                  <span className="text-orange-600 font-black tracking-widest text-[10px] uppercase mb-2 block">
                    MODULE 04: BIOMECHANICS
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">
                    Kinetic Chain Assessment
                  </h2>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase mb-1">
                    <Clock size={14} /> 14:59
                  </div>
                  <span className="text-zinc-400 text-[10px] font-black uppercase">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-zinc-800 mb-12">
                <motion.div 
                  className="h-full bg-orange-600 shadow-[0_0_10px_rgba(255,95,0,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="mb-12">
                <p className="text-lg md:text-xl text-zinc-200 leading-relaxed font-medium">
                  {questions[currentQuestion].text}
                </p>
              </div>

              {/* Options */}
              <div className="grid gap-4 mb-12">
                {questions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`flex items-center gap-4 p-5 border transition-all text-left group ${
                      selectedOption === idx 
                      ? 'bg-orange-600/10 border-orange-600 text-orange-500' 
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 text-zinc-400'
                    }`}
                  >
                    <span className={`w-8 h-8 flex items-center justify-center rounded text-[10px] font-black ${
                      selectedOption === idx ? 'bg-orange-600 text-black' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-tight">{option}</span>
                  </button>
                ))}
              </div>

              {/* Footer Action */}
              <div className="flex justify-end">
                <button
                  disabled={selectedOption === null}
                  onClick={handleNext}
                  className={`flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-tighter transition-all ${
                    selectedOption === null 
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                    : 'bg-orange-600 text-black hover:bg-orange-500 shadow-[0_0_20px_rgba(255,95,0,0.2)]'
                  }`}
                >
                  {currentQuestion + 1 === questions.length ? 'FINALIZAR' : 'CONFIRMAR & SIGUIENTE'} <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-2xl text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="whitespace-nowrap text-8xl font-black italic -rotate-12 mb-20 uppercase">
                    GHC ACADEMY PERFORMANCE ASSESSMENT
                  </div>
                ))}
              </div>

              <div className="relative z-10">
                <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-8 ${
                  isPassed ? 'bg-orange-600/20 text-orange-600' : 'bg-red-600/20 text-red-600'
                }`}>
                  {isPassed ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                </div>

                <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4">
                  {isPassed ? 'APROBADO' : 'NO APTO'}
                </h2>
                
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="text-left">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Puntuación Final</p>
                    <p className="text-3xl font-black italic text-white">{percentage}%</p>
                  </div>
                  <div className="w-[1px] h-10 bg-zinc-800" />
                  <div className="text-left">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Resultado</p>
                    <p className={`text-xl font-black italic uppercase ${isPassed ? 'text-orange-500' : 'text-red-500'}`}>
                      {isPassed ? 'Certificable' : 'Reintentar'}
                    </p>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm max-w-md mx-auto mb-12 leading-relaxed">
                  {isPassed 
                    ? 'Has superado los estándares científicos de GHC Academy. Tu certificado de competencia técnica ha sido generado.' 
                    : 'No has alcanzado el umbral del 70% requerido para este módulo. Te recomendamos revisar el contenido del Módulo 04 antes del reintento.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isPassed ? (
                    <button className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-black px-8 py-4 text-xs font-black uppercase tracking-tighter transition-all">
                      <Award size={18} /> DESCARGAR CERTIFICADO
                    </button>
                  ) : (
                    <button 
                      onClick={resetQuiz}
                      className="flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 px-8 py-4 text-xs font-black uppercase tracking-tighter transition-all"
                    >
                      <RotateCcw size={18} /> REINTENTAR EXAMEN
                    </button>
                  )}
                  <button className="flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-white px-8 py-4 text-xs font-black uppercase tracking-tighter transition-all">
                    VOLVER AL CURSO
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
