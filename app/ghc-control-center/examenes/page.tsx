"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const BUILD_ID = "GHC-EXAMS-LEGACY-REDIRECT-V3 · redirección a panel Exámenes · 2026-06-13";

export default function ExamsLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ghc-control-center?tab=examenes");
  }, [router]);

  return (
    <main className="redirect-page">
      <style jsx global>{styles}</style>

      <section className="redirect-card">
        <p className="eyebrow">GHC Academy · Exámenes</p>
        <h1>Redirigiendo al panel principal</h1>
        <p>
          El centro de exámenes ahora vive dentro del Control Center. Te estamos llevando a la pestaña
          Exámenes integrada.
        </p>

        <div className="redirect-actions">
          <button type="button" onClick={() => router.replace("/ghc-control-center?tab=examenes")}>
            Ir a Exámenes
          </button>
          <button type="button" className="ghost" onClick={() => router.replace("/ghc-control-center")}>
            Ir al panel
          </button>
        </div>

        <code>{BUILD_ID}</code>
      </section>
    </main>
  );
}

const styles = `
  :root {
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background: #050706;
    color: #f4f6f2;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  button {
    font: inherit;
  }

  .redirect-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background:
      radial-gradient(circle at 18% 12%, rgba(99, 229, 70, 0.14), transparent 34rem),
      radial-gradient(circle at 86% 88%, rgba(244, 246, 242, 0.07), transparent 38rem),
      linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0)),
      #050706;
  }

  .redirect-card {
    width: min(760px, 100%);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 28px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.026)),
      rgba(10, 14, 12, 0.94);
    box-shadow: 0 32px 100px rgba(0, 0, 0, 0.42);
    padding: clamp(26px, 4vw, 42px);
    text-align: center;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: #63e546;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 11px;
    font-weight: 950;
  }

  .redirect-card h1 {
    margin: 0;
    font-size: clamp(36px, 5vw, 62px);
    line-height: 0.92;
    letter-spacing: -0.065em;
  }

  .redirect-card p:not(.eyebrow) {
    max-width: 560px;
    margin: 18px auto 0;
    color: rgba(244, 246, 242, 0.68);
    line-height: 1.65;
  }

  .redirect-actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 24px;
  }

  .redirect-actions button {
    min-height: 44px;
    border: 0;
    border-radius: 999px;
    padding: 0 18px;
    background: linear-gradient(135deg, #7cff55, #63e546);
    color: #061008;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .redirect-actions button:hover {
    transform: translateY(-1px);
  }

  .redirect-actions button.ghost {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #f4f6f2;
  }

  .redirect-card code {
    display: block;
    width: fit-content;
    max-width: 100%;
    margin: 24px auto 0;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid rgba(99, 229, 70, 0.22);
    border-radius: 999px;
    background: rgba(99, 229, 70, 0.06);
    color: rgba(244, 246, 242, 0.58);
    padding: 8px 11px;
    font-size: 11px;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    .redirect-card {
      border-radius: 22px;
    }

    .redirect-actions {
      display: grid;
    }

    .redirect-actions button {
      width: 100%;
    }
  }
`;
