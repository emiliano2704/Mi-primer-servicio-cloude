import { useState } from "react";
import "./Assistant.css";

const SUGGESTIONS = [
  "¿Qué cursos de programación hay?",
  "¿Cuántas horas suman los cursos publicados?",
  "¿Quién imparte cada curso?",
];

export default function Assistant({ api, token, onLogout }) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(value) {
    const trimmed = value.trim();
    if (trimmed.length < 5 || busy) return;
    setError("");
    setBusy(true);
    try {
      const result = await api("asistente", { method: "POST", body: JSON.stringify({ pregunta: trimmed }) }, token);
      setExchanges((current) => [...current, { question: trimmed, ...result }]);
      setQuestion("");
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    ask(question);
  }

  return <main className="assistant-page">
    <div className="assistant-heading">
      <div>
        <div className="eyebrow">ASISTENTE CLOUD CON IA</div>
        <h1>Pregúntale a tu <em>catálogo.</em></h1>
        <p>Consulta tus cursos en lenguaje natural. Cada respuesta utiliza la información guardada en Google Sheets.</p>
      </div>
      <div className="assistant-flow" aria-label="Flujo de la consulta"><span>01&nbsp; Pregunta</span><b>→</b><span>02&nbsp; Google Sheets + IA</span><b>→</b><span>03&nbsp; Respuesta</span></div>
    </div>

    <div className="assistant-layout">
      <section className="assistant-workspace" aria-label="Conversación con el asistente">
        <div className="assistant-workspace-head"><span className="assistant-spark" aria-hidden="true">✦</span><div><strong>Asistente de cursos</strong><small>Responde con los datos de tu catálogo</small></div><span className="assistant-live">Hoja Cursos</span></div>
        <div className="assistant-conversation" aria-live="polite">
          {exchanges.length === 0 && <div className="assistant-welcome"><div className="assistant-welcome-icon" aria-hidden="true">✦</div><h2>¿Qué necesitas saber?</h2><p>Pregunta por cursos, instructores, categorías, duración o estado. El asistente revisará los registros antes de responder.</p></div>}
          {exchanges.map((entry, index) => <div className="assistant-exchange" key={index}>
            <div className="assistant-question"><span>Tu pregunta</span><p>{entry.question}</p></div>
            <div className="assistant-answer"><div className="assistant-answer-label"><span aria-hidden="true">✦</span> Respuesta del asistente</div><p>{entry.respuesta}</p><div className="assistant-source">Fuente: {entry.fuente} <span>·</span> {entry.cursosConsultados} {entry.cursosConsultados === 1 ? "curso consultado" : "cursos consultados"}</div></div>
          </div>)}
          {busy && <div className="assistant-thinking" role="status"><span aria-hidden="true">✦</span> Consultando Google Sheets y generando la respuesta...</div>}
        </div>
        <div className="assistant-compose">
          {error && <div className="alert error" role="alert">{error}</div>}
          <form onSubmit={submit}>
            <label htmlFor="assistant-question">Escribe tu pregunta</label>
            <div className="assistant-input-row"><textarea id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={2} placeholder="Ej. ¿Qué cursos de programación están publicados?" disabled={busy}/><button className="button primary" disabled={busy || question.trim().length < 5}>{busy ? "Consultando..." : "Preguntar →"}</button></div>
            <div className="assistant-input-help">{question.length}/500 caracteres <span>Las respuestas se basan en la hoja Cursos.</span></div>
          </form>
        </div>
      </section>

      <aside className="assistant-guide" aria-label="Ayuda para consultar">
        <div className="assistant-guide-top"><span aria-hidden="true">✦</span><h2>Empieza con una pregunta</h2><p>Prueba una de estas consultas. Puedes cambiarla antes de enviarla.</p></div>
        <div className="assistant-suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)} disabled={busy}>{suggestion}<span aria-hidden="true">↗</span></button>)}</div>
        <div className="assistant-guide-note"><strong>De dónde sale la respuesta</strong><p>La API lee tus cursos de Google Sheets y envía esa información al servicio de IA. Si falta un dato, el asistente te lo indicará.</p></div>
      </aside>
    </div>
  </main>;
}
