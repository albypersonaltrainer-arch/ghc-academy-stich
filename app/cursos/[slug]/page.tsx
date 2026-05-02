'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const neon = '#00FF41';

export default function CourseDetailPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // 1. Obtener curso por slug
        const courseRes = await fetch(
          `${url}/rest/v1/courses?slug=eq.${slug}&limit=1`,
          {
            headers: {
              apikey: key!,
              Authorization: `Bearer ${key}`,
            },
          }
        );

        const courseData = await courseRes.json();

        if (!courseData.length) {
          setLoading(false);
          return;
        }

        const c = courseData[0];
        setCourse(c);

        // 2. DEBUG (IMPORTANTE)
        console.log('COURSE ID:', c.id);

        // 3. Traer TODOS los módulos (sin filtro)
        const modulesRes = await fetch(
          `${url}/rest/v1/modules?select=*`,
          {
            headers: {
              apikey: key!,
              Authorization: `Bearer ${key}`,
            },
          }
        );

        const modulesData = await modulesRes.json();

        console.log('ALL MODULES:', modulesData);

        // 4. Filtrar en frontend
        const filtered = modulesData.filter(
          (m: any) => m.course_id === c.id
        );

        console.log('FILTERED MODULES:', filtered);

        setModules(filtered);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  if (loading) return <div style={{ padding: 40 }}>Cargando...</div>;

  return (
    <main style={{ padding: 40 }}>
      <Link href="/cursos" style={{ color: neon }}>
        ← Volver a cursos
      </Link>

      <h1>{course?.title}</h1>

      <h2>Módulos</h2>

      {modules.length === 0 && (
        <div style={{ border: '1px solid red', padding: 20 }}>
          No hay módulos (problema de conexión course_id)
        </div>
      )}

      {modules.map((m) => (
        <div key={m.id} style={{ marginTop: 20 }}>
          <h3>{m.title}</h3>
        </div>
      ))}
    </main>
  );
}
