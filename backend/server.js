require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(
    __dirname,
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

app.get("/", (req, res) => {
  res.json({
    mensaje: "Mi primer servicio Cloud",
    estado: "Online",
    tecnologia: "Node.js + Express + Google Sheets",
  });
});

app.get("/api/productos", async (req, res) => {
  try {
    const respuesta = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Hoja 1!A2:D",
    });

    const filas = respuesta.data.values || [];

    const productos = filas.map(([id, nombre, precio, categoria]) => ({
      id: Number(id),
      nombre,
      precio: Number(precio),
      categoria,
    }));

    res.json(productos);
  } catch (error) {
    console.error("Error al consultar Google Sheets:", error.message);

    res.status(500).json({
      mensaje: "No fue posible obtener los productos de Google Sheets.",
    });
  }
});

app.get("/api/estado", (req, res) => {
  res.json({
    estado: "Online",
    servidor: "Node.js",
    servicio: "Cloud API",
    version: "1.0",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});