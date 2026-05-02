'use client';

import { useEffect, useMemo, useState } from 'react';

type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  course_type: 'curso' | 'minicurso' | 'perla';
  level: 'principiante' | 'intermedio' | 'avanzado';
  price: number;
  duration_minutes?: number;
  has_certificate?: boolean;
  categories?: { name: string; slug: string } | null;
  subcategories?: { name: string; slug: string } | null;
};

const fallbackCourses: Course[] = [
  {
    id: '1',
    title: 'Entrenador Personal Nivel 1',
    slug: 'entrenador-personal-nivel-1',
    subtitle: 'La base científica para empezar a entrenar personas con criterio.',
    description: 'Curso principal de GHC Academy para formar entrenadores personales desde una base sólida, científica y aplicable.',
    course_type: 'curso',
    level: 'principiante',
    price: 497,
    duration_minutes: 900,
    has_certificate: true,
    categories: { name: 'Formación de Entrenadores', slug: 'formacion-entrenadores' },
    subcategories: { name: 'Entrenador Personal Base', slug: 'entrenador-personal-base' },
  },
  {
    id: '2',
    title: 'Entrenador Personal Nivel 2',
    slug: 'entrenador-personal-nivel-2',
    subtitle: 'Programación, control de cargas y progresión avanzada.',
    description: 'Segundo nivel de formación para entrenadores personales que quieren ir más allá de lo básico.',
    course_type: 'curso',
    level: 'intermedio',
    price: 697,
    duration_minutes: 1200,
    has_certificate: true,
    categories: { name: 'Formación de Entrenadores', slug: 'formacion-entrenadores' },
    subcategories: { name: 'Entrenador Personal Base', slug: 'entrenador-personal-base' },
  },
  {
    id: '3',
    title: 'Entrenador Personal Nivel 3',
    slug: 'entrenador-personal-nivel-3',
    subtitle: 'Alto rendimiento, casos complejos y ciencia aplicada.',
    description: 'Nivel avanzado para entrenadores que quieren dominar la intervención física con criterio profesional.',
    course_type: 'curso',
    level: 'avanzado',
    price: 897,
    duration_minutes: 1500,
    has_certificate: true,
    categories: { name: 'Formación de Entrenadores', slug: 'formacion-entrenadores' },
    subcategories: { name: 'Entrenador Personal Base', slug: 'entrenador-personal-base' },
  },
  {
    id: '4',
    title: 'Entrenador Especializado en Lipedema',
    slug: 'entrenador-especializado-lipedema',
    subtitle: 'Especialización profesional para trabajar con mujeres con lipedema desde la ciencia.',
    description: 'Curso especializado para entrenadores que quieran intervenir con criterio en casos de lipedema.',
    course_type: 'curso',
    level: 'avanzado',
    price: 797,
    duration_minutes: 1000,
    has_certificate: true,
    categories: { name: 'Formación de Entrenadores', slug: 'formacion-entrenadores' },
    subcategories: { name: 'Especialización en Patologías', slug: 'especializacion-patologias' },
  },
  {
    id: '5',
    title: 'Perla: Por qué caminar no basta en lipedema',
    slug: 'perla-caminar-no-basta-lipedema',
    subtitle: 'Una explicación breve, directa y científica.',
    description: 'Microcontenido de menos de 5 minutos para entender un concepto clave.',
    course_type: 'perla',
    level: 'principiante',
    price: 19,
    duration_minutes: 5,
    has_certificate: false,
    categories: { name: 'Formación de Entrenadores', slug: 'formacion-entrenadores' },
    subcategories: { name: 'Especialización en Patologías', slug: 'especializacion-patologias' },
  },
];

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>(fallbackCourses);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('todos');
  const [type, setType] = useState('todos');

  useEffect(() => {
    async function loadCourses() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setLoading(false);
          return;
        }

        const endpoint =
          `${supabaseUrl}/rest/v1/courses` +
          '?select=id,title,slug,subtitle,description,course_type,level,price,duration_minutes,has_certificate,categories(name,slug),subcategories(name,slug)' +
          '&status=eq.published' +
          '&order=created_at.desc';

        const response = await fetch(endpoint, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (!response.ok) {
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
        }
      } catch {
        // Si Supabase falla, dejamos los cursos de seguridad para que la web nunca quede en blanco.
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const searchText = `${course.title} ${course.subtitle ?? ''} ${course.description ?? ''} ${course.categories?.name ?? ''} ${course.subcategories?.name ?? ''}`.toLowerCase();

      const matchesQuery = searchText.includes(query.toLowerCase());
      const matchesLevel = level === 'todos' || course.level === level;
      const matchesType = type === 'todos' || course.course_type === type;

      return matchesQuery && matchesLevel && matchesType;
    });
  }, [courses, query, level, type]);

  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <section className="relative overflow-hidden px-6 py-10 md:px-12 lg:px-20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-[#00FF41] blur-[160px]" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#00FF41] blur-[180px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <header className="mb-12 flex flex-col gap-6 border-b border-[#00FF41]/20 pb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.4em] text-[#00FF41]">
                GHC Academy
              </p>
              <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight md:text-6xl">
                Cursos basados en ciencia real
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
                Formación premium en entrenamiento, salud, nutrición, patologías,
                ciencia del movimiento y preparación física.
              </p>
            </div>

            <a
              href="/"
              className="rounded-full border border-[#00FF41]/40 px-5 py-3 text-sm font-bold uppercase tracking-widest text-[#00FF41] transition hover:bg-[#00FF41] hover:text-black"
            >
              Volver al inicio
            </a>
          </header>

          <section className="mb-10 grid gap-4 rounded-3xl border border-[#00FF41]/20 bg-white/[0.03] p-5 backdrop-blur-xl md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-white/40">
                Buscar
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por lipedema, fuerza, nutrición, +40..."
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#00FF41]/70"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-white/40">
                Nivel
              </label>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00FF41]/70"
              >
                <option value="todos">Todos</option>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-white/40">
                Tipo
              </label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00FF41]/70"
              >
                <option value="todos">Todos</option>
                <option value="curso">Curso</option>
                <option value="minicurso">Minicurso</option>
                <option value="perla">Perla</option>
              </select>
            </div>
          </section>

          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-white/50">
              {loading ? 'Conectando con Supabase...' : `${filteredCourses.length} contenidos encontrados`}
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-[#00FF41]">
              Sport Through Science
            </p>
          </div>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <article
                key={course.id}
                className="group relative overflow-hidden rounded-3xl border border-[#00FF41]/20 bg-white/[0.035] p-6 shadow-[0_0_40px_rgba(0,255,65,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#00FF41]/60 hover:shadow-[0_0_70px_rgba(0,255,65,0.18)]"
              >
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#00FF41]/10 blur-3xl transition group-hover:bg-[#00FF41]/20" />

                <div className="relative">
                  <div className="mb-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#00FF41] px-3 py-1 text-xs font-black uppercase tracking-widest text-black">
                      {course.course_type}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/60">
                      {course.level}
                    </span>
                  </div>

                  <h2 className="mb-3 text-2xl font-black leading-tight">
                    {course.title}
                  </h2>

                  <p className="mb-4 text-sm font-semibold text-[#00FF41]">
                    {course.subtitle}
                  </p>

                  <p className="mb-6 min-h-20 text-sm leading-7 text-white/60">
                    {course.description}
                  </p>

                  <div className="mb-6 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="mb-1 text-white/35">Categoría</p>
                      <p className="font-bold text-white/80">{course.categories?.name ?? 'General'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="mb-1 text-white/35">Duración</p>
                      <p className="font-bold text-white/80">{course.duration_minutes ?? 0} min</p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-2xl border border-[#00FF41]/20 bg-[#00FF41]/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                      Precio
                    </p>
                    <p className="text-3xl font-black text-[#00FF41]">
                      {Number(course.price).toLocaleString('es-ES')}€
                    </p>
                  </div>

                  <button className="w-full rounded-2xl bg-[#00FF41] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(0,255,65,0.45)]">
                    Ver contenido
                  </button>

                  {course.has_certificate && (
                    <p className="mt-4 text-center text-xs text-white/40">
                      Incluye certificado al completar la formación
                    </p>
                  )}
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
