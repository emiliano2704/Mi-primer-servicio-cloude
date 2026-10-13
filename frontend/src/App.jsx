import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "";
const CATEGORIES = ["Programación", "Diseño", "Negocios", "Idiomas", "Tecnología", "Otro"];
const EMPTY = { nombre: "", categoria: "Programación", instructor: "", duracion: "", estado: "Publicado", descripcion: "" };

async function api(path, options = {}, token = "") {
  const response = await fetch(API + "/api/" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
  });
  let data = {};
  try { data = await response.json(); } catch { /* Empty response */ }
  if (!response.ok) {
    const error = new Error(data.mensaje || "No se pudo conectar con el servidor.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api("login", { method: "POST", body: JSON.stringify({ usuario, contrasena }) });
      onLogin(result.token, usuario);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="login-page">
    <div className="login-art">
      <div className="login-brand"><span className="brand-symbol">A</span> AULA CLOUD</div>
      <div className="login-art-main"><div className="eyebrow">GESTIÓN ACADÉMICA / 2026</div><h1>Un lugar para<br/><em>organizar</em> el<br/>aprendizaje.</h1><p>Administra tus cursos de forma sencilla. Cada cambio queda guardado en la nube.</p><div className="art-line">CURSOS · INSTRUCTORES · HORAS</div></div>
      <div className="art-footer">React + API REST + Google Sheets</div>
    </div>
    <main className="login-panel"><div className="login-content">
      <div className="mobile-brand"><span className="brand-symbol">A</span> AULA CLOUD</div>
      <div className="eyebrow">ACCESO AL SISTEMA</div><h2>Bienvenido de nuevo</h2><p className="muted">Inicia sesión para administrar tu catálogo de cursos.</p>
      <form onSubmit={submit} className="login-form">
        <label htmlFor="usuario">Usuario</label><input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" placeholder="Tu usuario" required />
        <label htmlFor="contrasena">Contraseña</label><input id="contrasena" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" placeholder="Tu contraseña" required />
        {error && <div className="alert error" role="alert">{error}</div>}
        <button className="button primary login-button" disabled={busy}>{busy ? "Ingresando..." : "Iniciar sesión →"}</button>
      </form><p className="login-footnote">Acceso de administración · Sistema Cloud de Cursos</p>
    </div></main>
  </div>;
}

function CourseForm({ initial, onClose, onSave, busy }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [error, setError] = useState("");
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.nombre.trim().length < 3 || form.instructor.trim().length < 3) return setError("Nombre e instructor deben tener al menos 3 caracteres.");
    if (Number(form.duracion) < 1 || Number(form.duracion) > 500) return setError("La duración debe ser de 1 a 500 horas.");
    try { await onSave(form); } catch (err) { setError(err.message); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className="modal-head"><div><div className="eyebrow">CATÁLOGO DE CURSOS</div><h2 id="form-title">{initial ? "Editar curso" : "Nuevo curso"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button></div>
      <form className="course-form" onSubmit={submit}>
        <div className="field wide"><label htmlFor="nombre">Nombre del curso</label><input id="nombre" name="nombre" value={form.nombre} onChange={change} maxLength="80" placeholder="Ej. Fundamentos de React" required autoFocus/></div>
        <div className="field"><label htmlFor="categoria">Categoría</label><select id="categoria" name="categoria" value={form.categoria} onChange={change}>{CATEGORIES.map((name) => <option key={name}>{name}</option>)}</select></div>
        <div className="field"><label htmlFor="instructor">Instructor</label><input id="instructor" name="instructor" value={form.instructor} onChange={change} maxLength="80" placeholder="Nombre del instructor" required/></div>
        <div className="field"><label htmlFor="duracion">Duración (horas)</label><input id="duracion" name="duracion" type="number" min="1" max="500" value={form.duracion} onChange={change} placeholder="Ej. 24" required/></div>
        <div className="field"><label htmlFor="estado">Estado</label><select id="estado" name="estado" value={form.estado} onChange={change}><option>Publicado</option><option>Borrador</option></select></div>
        <div className="field wide"><label htmlFor="descripcion">Descripción <span className="muted">(opcional)</span></label><textarea id="descripcion" name="descripcion" value={form.descripcion} onChange={change} maxLength="300" rows="3" placeholder="¿Qué aprenderán los estudiantes?"/></div>
        {error && <div className="alert error wide" role="alert">{error}</div>}
        <div className="form-actions wide"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Guardando..." : initial ? "Guardar cambios" : "Agregar curso"}</button></div>
      </form>
    </section>
  </div>;
}

function Dashboard({ token, username, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try { setCourses(await api("cursos", {}, token)); }
    catch (err) { if (err.status === 401) onLogout(); else setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    api("cursos", {}, token)
      .then(setCourses)
      .catch((err) => { if (err.status === 401) onLogout(); else setError(err.message); })
      .finally(() => setLoading(false));
  }, [token, onLogout]);
  const filtered = useMemo(() => courses.filter((course) => course.nombre.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")) && (category === "Todas" || category === course.categoria)), [courses, search, category]);
  const published = courses.filter((course) => course.estado === "Publicado").length;
  const hours = courses.reduce((sum, course) => sum + Number(course.duracion || 0), 0);
  async function save(form) {
    setBusy(true);
    try {
      const editing = modal && modal !== "new";
      await api(editing ? "cursos/" + encodeURIComponent(modal.id) : "cursos", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) }, token);
      setModal(null);
      setMessage(editing ? "Curso actualizado correctamente." : "Curso agregado correctamente.");
      await load();
    } finally { setBusy(false); }
  }
  async function remove(course) {
    if (!window.confirm('¿Deseas eliminar "' + course.nombre + '"? Esta acción no se puede deshacer.')) return;
    setBusy(true);
    setError("");
    try { await api("cursos/" + encodeURIComponent(course.id), { method: "DELETE" }, token); setMessage("Curso eliminado correctamente."); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="side-brand"><span className="brand-symbol">A</span><span>AULA<span className="brand-light">CLOUD</span><small>GESTIÓN DE CURSOS</small></span></div>
      <nav aria-label="Navegación principal"><div className="side-label">ESPACIO DE TRABAJO</div><div className="nav-active">▣ <span>Cursos</span></div></nav>
      <div className="side-bottom"><div className="cloud-note">☁ <span>Sincronizado con<br/><strong>Google Sheets</strong></span></div><button className="logout" onClick={onLogout}>↪ &nbsp; Cerrar sesión</button></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div>Panel <span>/</span> <strong>Cursos</strong></div><div className="topbar-right"><i/> Sistema en línea <span className="avatar" aria-label={"Sesión de " + username}>{username.slice(0, 1).toUpperCase()}</span></div></header>
      <main className="dashboard">
        <div className="page-heading"><div><div className="eyebrow">CENTRO DE APRENDIZAJE</div><h1>Mis cursos<span>.</span></h1><p>Organiza tu oferta educativa desde un solo lugar.</p></div><button className="button primary add-button" onClick={() => setModal("new")}>＋ Nuevo curso</button></div>
        <section className="summary-grid" aria-label="Resumen de cursos">
          <div className="summary-card"><div className="summary-label">TOTAL DE CURSOS</div><strong>{courses.length.toString().padStart(2, "0")}</strong><p>En tu catálogo</p></div>
          <div className="summary-card"><div className="summary-label">PUBLICADOS</div><strong>{published.toString().padStart(2, "0")}</strong><p>Disponibles para consulta</p></div>
          <div className="summary-card accent"><div className="summary-label">HORAS DE FORMACIÓN</div><strong>{hours}</strong><p>En todos los cursos</p></div>
        </section>
        <section className="catalog" aria-labelledby="catalog-title">
          <div className="catalog-heading"><div><div className="eyebrow">EXPLORA Y ADMINISTRA</div><h2 id="catalog-title">Catálogo de cursos</h2></div><span>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</span></div>
          <div className="toolbar"><div className="search"><span aria-hidden="true">⌕</span><input aria-label="Buscar cursos por nombre" placeholder="Buscar por nombre..." value={search} onChange={(event) => setSearch(event.target.value)}/></div><div className="filter"><label htmlFor="category-filter">Categoría</label><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option>Todas</option>{CATEGORIES.map((name) => <option key={name}>{name}</option>)}</select></div></div>
          {message && <div className="alert success" role="status">{message}<button onClick={() => setMessage("")} aria-label="Cerrar mensaje">×</button></div>}
          {error && <div className="alert error" role="alert">{error}<button onClick={load}>Reintentar</button></div>}
          {loading ? <div className="empty-state">Cargando cursos desde Google Sheets...</div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-symbol">▣</div><h3>{courses.length ? "Sin resultados" : "Tu catálogo está vacío"}</h3><p>{courses.length ? "Prueba otra búsqueda o categoría." : "Agrega tu primer curso para comenzar."}</p>{!courses.length && <button onClick={() => setModal("new")}>Agregar curso →</button>}</div> :
            <div className="table-wrap"><table><thead><tr><th>CURSO</th><th>CATEGORÍA</th><th>INSTRUCTOR</th><th>DURACIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{filtered.map((course) => <tr key={course.id}><td><strong className="course-name">{course.nombre}</strong>{course.descripcion && <small className="course-description">{course.descripcion}</small>}</td><td><span className="category-pill">{course.categoria}</span></td><td>{course.instructor}</td><td>{course.duracion} h</td><td><span className={"status " + (course.estado === "Publicado" ? "published" : "draft")}>● {course.estado}</span></td><td><div className="row-actions"><button onClick={() => setModal(course)} aria-label={"Editar " + course.nombre} title="Editar">✎</button><button className="danger" onClick={() => remove(course)} disabled={busy} aria-label={"Eliminar " + course.nombre} title="Eliminar">▤</button></div></td></tr>)}</tbody></table></div>}
        </section>
        <footer>Aula Cloud · Sistema de cursos <span>Datos almacenados en Google Sheets</span></footer>
      </main>
    </div>
    {modal && <CourseForm key={modal === "new" ? "new" : modal.id} initial={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={save} busy={busy}/>}
  </div>;
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("aula_token") || "");
  const [username, setUsername] = useState(() => sessionStorage.getItem("aula_user") || "");
  function onLogin(value, user) { sessionStorage.setItem("aula_token", value); sessionStorage.setItem("aula_user", user); setToken(value); setUsername(user); }
  function onLogout() { sessionStorage.removeItem("aula_token"); sessionStorage.removeItem("aula_user"); setToken(""); setUsername(""); }
  return token ? <Dashboard token={token} username={username} onLogout={onLogout}/> : <Login onLogin={onLogin}/>;
}
