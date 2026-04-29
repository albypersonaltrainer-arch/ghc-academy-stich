import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, Lock, FileText, ChevronDown, PlayCircle, Download, Eye, ArrowRight } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  locked?: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export const CourseViewer = () => {
  const [activeLesson, setActiveLesson] = useState('lesson-4');

  const modules: Module[] = [
    {
      id: 'mod-1',
      title: '01. FOUNDATIONS',
      lessons: [
        { id: 'lesson-1', title: 'Physiological Principles', duration: '12:45', completed: true },
        { id: 'lesson-2', title: 'Metabolic pathways', duration: '15:20', completed: true },
      ]
    },
    {
      id: 'mod-2',
      title: '02. APPLIED KINEMATICS',
      lessons: [
        { id: 'lesson-3', title: 'Force Vectors in Deadlifts', duration: '18:45', completed: true },
        { id: 'lesson-4', title: 'Biomechanics of the Squat', duration: '28:15', completed: false },
        { id: 'lesson-5', title: 'Torque Analysis', duration: '15:30', completed: false, locked: true },
      ]
    },
    {
      id: 'mod-3',
      title: '03. NUTRITIONAL SCIENCE',
      lessons: [
        { id: 'lesson-6', title: 'Macro Optimization', duration: '22:10', completed: false, locked: true },
      ]
    }
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#121415] text-zinc-100 font-['Space_Grotesk']">
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-10">
        
        {/* VIDEO PLAYER SECTION */}
        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-2xl group mb-8">
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,95,0,0.4)]"
            >
              <Play fill="currentColor" size={32} />
            </motion.button>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800">
            <div className="h-full bg-orange-600 w-1/3 shadow-[0_0_10px_rgba(255,95,0,0.5)]" />
          </div>
        </div>

        {/* LESSON INFO & PDF SECTION */}
        <div className="max-w-4xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <span className="text-orange-600 font-black tracking-widest text-[10px] uppercase mb-2 block">MODULE 02 • LESSON 04</span>
              <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">Biomechanics of the Squat</h1>
            </div>
            <button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-black px-6 py-3 text-xs font-black uppercase tracking-tighter transition-all">
              NEXT LESSON <ArrowRight size={16} />
            </button>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-12 max-w-2xl">
            An in-depth analysis of joint kinematics and force distribution during the eccentric and concentric phases of the barbell back squat. Master the technical parameters required for elite load management.
          </p>

          {/* PROTECTED PDF VIEWER */}
          <div className="relative border border-zinc-800 bg-zinc-900/50 rounded-xl p-8 overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="whitespace-nowrap text-6xl font-black italic -rotate-12 mb-20">
                  GHC ACADEMY SECURITY PROTOCOL · CONFIDENTIAL · DO NOT REDISTRIBUTE
                </div>
              ))}
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-16 h-20 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-orange-600">
                <FileText size={32} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold uppercase italic tracking-tight mb-1">Análisis Cinemático.pdf</h3>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Technical diagrams and force-curve datasets. (4.2 MB)</p>
              </div>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-4 py-2 border border-zinc-700 hover:border-orange-600/50 text-xs font-bold uppercase transition-colors">
                  <Eye size={14} /> VIEW
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold uppercase transition-colors">
                  <Download size={14} /> DOWNLOAD
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800/50">
              <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest text-center">
                User: JUAN@DEMO • IP: 192.168.1.104 • PROTECTED CONTENT SYSTEM V.2.04
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR: LESSON LIST */}
      <aside className="w-full lg:w-96 bg-zinc-950/50 border-l border-zinc-800 p-6 overflow-y-auto max-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Course Modules</h2>
          <div className="bg-orange-600/10 text-orange-500 px-2 py-1 text-[10px] font-black uppercase tracking-tighter rounded">
            32% COMPLETED
          </div>
        </div>

        <div className="space-y-6">
          {modules.map((mod) => (
            <div key={mod.id} className="space-y-2">
              <div className="flex items-center justify-between group cursor-pointer py-2">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">
                  {mod.title}
                </h3>
                <ChevronDown size={14} className="text-zinc-600" />
              </div>
              <div className="space-y-1">
                {mod.lessons.map((lesson) => (
                  <div 
                    key={lesson.id}
                    onClick={() => !lesson.locked && setActiveLesson(lesson.id)}
                    className={`group flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                      activeLesson === lesson.id 
                        ? 'bg-orange-600/10 border-l-4 border-orange-600 shadow-[0_0_15px_rgba(255,95,0,0.1)]' 
                        : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    {lesson.completed ? (
                      <CheckCircle size={18} className="text-orange-600" />
                    ) : lesson.locked ? (
                      <Lock size={18} className="text-zinc-700" />
                    ) : (
                      <PlayCircle size={18} className={activeLesson === lesson.id ? 'text-orange-600' : 'text-zinc-500'} />
                    )}
                    <div className="flex-1">
                      <p className={`text-xs font-bold uppercase tracking-tight ${
                        lesson.locked ? 'text-zinc-700' : activeLesson === lesson.id ? 'text-orange-500' : 'text-zinc-300'
                      }`}>
                        {lesson.title}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-bold">{lesson.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
