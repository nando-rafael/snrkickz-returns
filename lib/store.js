const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TICKETS_FILE)) {
    fs.writeFileSync(TICKETS_FILE, "[]", "utf-8");
  }
}

function readTickets() {
  ensureStore();
  const raw = fs.readFileSync(TICKETS_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTickets(tickets) {
  ensureStore();
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), "utf-8");
}

function createTicket(ticket) {
  const tickets = readTickets();
  tickets.push(ticket);
  writeTickets(tickets);
  return ticket;
}

function getTicket(id) {
  return readTickets().find((t) => t.id === id) || null;
}

function updateTicket(id, patch) {
  const tickets = readTickets();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tickets[idx] = { ...tickets[idx], ...patch, updatedAt: new Date().toISOString() };
  writeTickets(tickets);
  return tickets[idx];
}

function listTickets() {
  return readTickets().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function generateTicketId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RET-${rand}`;
}

module.exports = {
  createTicket,
  getTicket,
  updateTicket,
  listTickets,
  generateTicketId,
};
