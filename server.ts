import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

// Import seed data for initialization
import {
  INITIAL_BOLOES,
  INITIAL_PARTIDAS,
  INITIAL_USUARIOS,
  INITIAL_PALPITES,
  INITIAL_NOTIFICACOES
} from "./src/data/seedData.ts";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "database.json");

// Express middleware
app.use(express.json({ limit: "20mb" }));

// Helper to initialize database file if not present
function initializeDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const initialState = {
      boloes: INITIAL_BOLOES,
      partidas: INITIAL_PARTIDAS,
      usuarios: INITIAL_USUARIOS,
      palpites: INITIAL_PALPITES,
      notificacoes: INITIAL_NOTIFICACOES,
      admins: [
        { id: "admin-default", username: "admin", pin: "1234", created_at: new Date().toISOString() }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2), "utf8");
    return initialState;
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting to initial state:", err);
    const initialState = {
      boloes: INITIAL_BOLOES,
      partidas: INITIAL_PARTIDAS,
      usuarios: INITIAL_USUARIOS,
      palpites: INITIAL_PALPITES,
      notificacoes: INITIAL_NOTIFICACOES,
      admins: [
        { id: "admin-default", username: "admin", pin: "1234", created_at: new Date().toISOString() }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2), "utf8");
    return initialState;
  }
}

// In-memory cache loaded once on start
let dbState = initializeDatabase();

// API ROUTES
app.get("/api/state", (req, res) => {
  res.json(dbState);
});

app.post("/api/state", (req, res) => {
  const updates = req.body;
  if (updates && typeof updates === "object") {
    // Merge or overwrite permitted keys
    if (Array.isArray(updates.boloes)) dbState.boloes = updates.boloes;
    if (Array.isArray(updates.partidas)) dbState.partidas = updates.partidas;
    if (Array.isArray(updates.usuarios)) dbState.usuarios = updates.usuarios;
    if (Array.isArray(updates.palpites)) dbState.palpites = updates.palpites;
    if (Array.isArray(updates.notificacoes)) dbState.notificacoes = updates.notificacoes;
    if (Array.isArray(updates.admins)) dbState.admins = updates.admins;

    // Persist to filesystem asynchronously
    fs.writeFile(DB_PATH, JSON.stringify(dbState, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing to database.json:", err);
      }
    });

    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid updates format" });
  }
});

// Full reset endpoint to return everyone to original seeded data
app.post("/api/reset", (req, res) => {
  const initialState = {
    boloes: INITIAL_BOLOES,
    partidas: INITIAL_PARTIDAS,
    usuarios: INITIAL_USUARIOS,
    palpites: INITIAL_PALPITES,
    notificacoes: INITIAL_NOTIFICACOES,
    admins: [
      { id: "admin-default", username: "admin", pin: "1234", created_at: new Date().toISOString() }
    ]
  };
  dbState = initialState;
  fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2), "utf8");
  res.json({ success: true, state: dbState });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
