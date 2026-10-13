const { randomUUID } = require("node:crypto");

const HEADERS = ["ID", "Nombre", "Categoría", "Instructor", "Duración", "Estado", "Descripción", "Fecha"];
const STATUSES = ["Publicado", "Borrador"];

function validateCourse(value) {
  const course = {
    nombre: String(value?.nombre || "").trim(),
    categoria: String(value?.categoria || "").trim(),
    instructor: String(value?.instructor || "").trim(),
    duracion: Number(value?.duracion),
    estado: String(value?.estado || "").trim(),
    descripcion: String(value?.descripcion || "").trim(),
  };
  if (course.nombre.length < 3 || course.nombre.length > 80) throw new Error("El nombre debe tener entre 3 y 80 caracteres.");
  if (!course.categoria || course.categoria.length > 50) throw new Error("Selecciona una categoría válida.");
  if (course.instructor.length < 3 || course.instructor.length > 80) throw new Error("El instructor debe tener entre 3 y 80 caracteres.");
  if (!Number.isInteger(course.duracion) || course.duracion < 1 || course.duracion > 500) throw new Error("La duración debe ser de 1 a 500 horas.");
  if (!STATUSES.includes(course.estado)) throw new Error("Selecciona un estado válido.");
  if (course.descripcion.length > 300) throw new Error("La descripción no puede superar 300 caracteres.");
  return course;
}

function rowToCourse(row) {
  const [id, nombre, categoria, instructor, duracion, estado, descripcion, fecha] = row;
  return { id, nombre: nombre || "", categoria: categoria || "", instructor: instructor || "", duracion: Number(duracion) || 0, estado: estado || "", descripcion: descripcion || "", fecha: fecha || "" };
}

function courseToRow(course) {
  return [course.id, course.nombre, course.categoria, course.instructor, course.duracion, course.estado, course.descripcion, course.fecha];
}

function createCoursesService(sheets, spreadsheetId, tab = "Cursos") {
  if (!spreadsheetId) throw new Error("Falta GOOGLE_SHEET_ID.");
  const range = (cells) => `'${tab.replaceAll("'", "''")}'!${cells}`;

  async function readRows() {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: range("A:H") });
    const rows = response.data.values || [];
    if (rows.length && HEADERS.some((header, index) => rows[0][index] !== header)) throw new Error("La primera fila de Google Sheets debe contener los encabezados indicados en README.md.");
    return rows;
  }

  async function list() {
    return (await readRows()).slice(1).filter((row) => row[0]).map(rowToCourse);
  }

  async function create(input) {
    const course = { id: randomUUID(), ...validateCourse(input), fecha: new Date().toISOString() };
    await readRows();
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: range("A:H"), valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: [courseToRow(course)] },
    });
    return course;
  }

  async function update(id, input) {
    const rows = await readRows();
    const index = rows.findIndex((row, i) => i > 0 && row[0] === id);
    if (index < 0) return null;
    const course = { id, ...validateCourse(input), fecha: rows[index][7] || new Date().toISOString() };
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: range(`A${index + 1}:H${index + 1}`), valueInputOption: "RAW",
      requestBody: { values: [courseToRow(course)] },
    });
    return course;
  }

  async function remove(id) {
    const rows = await readRows();
    const index = rows.findIndex((row, i) => i > 0 && row[0] === id);
    if (index < 0) return false;
    const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" });
    const sheet = metadata.data.sheets.find((item) => item.properties.title === tab);
    if (!sheet) throw new Error(`No existe la pestaña ${tab}.`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 } } }] },
    });
    return true;
  }

  return { list, create, update, remove };
}

module.exports = { HEADERS, validateCourse, createCoursesService };
