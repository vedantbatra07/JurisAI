"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Scale } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("JurisAI interface error", error); }, [error]);

  return (
    <main className="fatal-error">
      <div className="fatal-error-card">
        <div className="fatal-brand"><Scale size={24} /></div>
        <AlertTriangle className="fatal-alert" size={28} />
        <h1>JurisAI hit a temporary problem</h1>
        <p>Your question hasn’t been submitted again. Reload the consultation and try once more.</p>
        <button onClick={reset}><RotateCcw size={17} /> Reload consultation</button>
      </div>
    </main>
  );
}

