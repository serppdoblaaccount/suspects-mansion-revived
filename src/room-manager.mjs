import { randomInt } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_MAX_PLAYERS = 8;
const DEFAULT_ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_RECONNECT_GRACE_MS = 30 * 1000;

function makeCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function cleanName(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\\s+/g, " ").slice(0, 18);
}

export class RoomManager {
  constructor({
    maxPlayers = DEFAULT_MAX_PLAYERS,
    roomTtlMs = DEFAULT_ROOM_TTL_MS,
    reconnectGraceMs = DEFAULT_RECONNECT_GRACE_MS,
    codeFactory = makeCode
  } = {}) {
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 16) {
      throw new RangeError("maxPlayers must be an integer between 2 and 16");
    }
    if (!Number.isFinite(roomTtlMs) || roomTtlMs <= 0) {
      throw new RangeError("roomTtlMs must be a positive number");
    }
    if (!Number.isFinite(reconnectGraceMs) || reconnectGraceMs < 0) {
      throw new RangeError("reconnectGraceMs must be a non-negative number");
    }
    this.maxPlayers = maxPlayers;
    this.roomTtlMs = roomTtlMs;
    this.reconnectGraceMs = reconnectGraceMs;
    this.codeFactory = codeFactory;
    this.rooms = new Map();
  }

  createRoom({ playerId, playerName, now = Date.now() }) {
    if (!playerId || typeof playerId !== "string") throw new TypeError("playerId is required");
    const name = cleanName(playerName);
    if (!name) throw new TypeError("A player name is required");

    let code;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      code = this.codeFactory();
      if (typeof code === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(code) && !this.rooms.has(code)) break;
      code = null;
    }
    if (!code) throw new Error("Could not allocate a unique room code");

    const room = {
      code,
      hostId: playerId,
      status: "waiting",
      revision: 1,
      createdAt: now,
      expiresAt: now + this.roomTtlMs,
      players: [{
        id: playerId,
        name,
        joinedAt: now,
        connected: true,
        disconnectedAt: null,
        reconnectUntil: null
      }]
    };
    this.rooms.set(code, room);
    return this.getRoom(code, now);
  }

  joinRoom({ code, playerId, playerName, now = Date.now() }) {
    const normalizedCode = String(code ?? "").trim().toUpperCase();
    const room = this.#getActiveRoom(normalizedCode, now);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!playerId || typeof playerId !== "string") throw new TypeError("playerId is required");
    const name = cleanName(playerName);
    if (!name) throw new TypeError("A player name is required");

    const existing = room.players.find((player) => player.id === playerId);
    if (existing) {
      if (!existing.connected) throw new Error("PLAYER_DISCONNECTED");
      if (existing.name !== name) {
        existing.name = name;
        room.revision += 1;
      }
      return this.getRoom(normalizedCode, now);
    }
    if (room.status !== "waiting") throw new Error("ROOM_ALREADY_STARTED");
    if (room.players.length >= this.maxPlayers) throw new Error("ROOM_FULL");
    room.players.push({
      id: playerId,
      name,
      joinedAt: now,
      connected: true,
      disconnectedAt: null,
      reconnectUntil: null
    });
    room.revision += 1;
    return this.getRoom(normalizedCode, now);
  }

  disconnectPlayer({ code, playerId, now = Date.now() }) {
    const normalizedCode = String(code ?? "").trim().toUpperCase();
    const room = this.#getActiveRoom(normalizedCode, now);
    if (!room) return null;
    const player = room.players.find((entry) => entry.id === playerId);
    if (!player) return null;
    if (!player.connected) return this.getRoom(normalizedCode, now);

    player.connected = false;
    player.disconnectedAt = now;
    player.reconnectUntil = now + this.reconnectGraceMs;
    room.revision += 1;
    return this.getRoom(normalizedCode, now);
  }

  reconnectPlayer({ code, playerId, now = Date.now() }) {
    const normalizedCode = String(code ?? "").trim().toUpperCase();
    const room = this.#getActiveRoom(normalizedCode, now);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    const player = room.players.find((entry) => entry.id === playerId);
    if (!player) throw new Error("PLAYER_NOT_FOUND");
    if (player.connected) return this.getRoom(normalizedCode, now);
    if (player.reconnectUntil <= now) throw new Error("RECONNECT_EXPIRED");

    player.connected = true;
    player.disconnectedAt = null;
    player.reconnectUntil = null;
    room.revision += 1;
    return this.getRoom(normalizedCode, now);
  }

  leaveRoom({ code, playerId, now = Date.now() }) {
    const normalizedCode = String(code ?? "").trim().toUpperCase();
    const room = this.#getActiveRoom(normalizedCode, now);
    if (!room) return null;
    const playerIndex = room.players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) return this.getRoom(normalizedCode, now);

    room.players.splice(playerIndex, 1);
    if (room.players.length === 0) {
      this.rooms.delete(normalizedCode);
      return null;
    }
    if (room.hostId === playerId) {
      room.hostId = (room.players.find((player) => player.connected) ?? room.players[0]).id;
    }
    room.revision += 1;
    return this.getRoom(normalizedCode, now);
  }

  startRoom({ code, playerId, now = Date.now() }) {
    const normalizedCode = String(code ?? "").trim().toUpperCase();
    const room = this.#getActiveRoom(normalizedCode, now);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostId !== playerId) throw new Error("HOST_ONLY");
    const host = room.players.find((player) => player.id === playerId);
    if (!host?.connected) throw new Error("HOST_DISCONNECTED");
    if (room.status !== "waiting") throw new Error("ROOM_ALREADY_STARTED");
    if (room.players.filter((player) => player.connected).length < 2) {
      throw new Error("NEED_MORE_PLAYERS");
    }
    room.status = "playing";
    room.revision += 1;
    return this.getRoom(normalizedCode, now);
  }

  getRoom(code, now = Date.now()) {
    const room = this.#getActiveRoom(String(code ?? "").trim().toUpperCase(), now);
    if (!room) return null;
    return Object.freeze({
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      revision: room.revision,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      maxPlayers: this.maxPlayers,
      players: room.players.map((player) => Object.freeze({
        id: player.id,
        name: player.name,
        connected: player.connected
      }))
    });
  }

  pruneExpired(now = Date.now()) {
    let removedRooms = 0;
    for (const [code, room] of this.rooms) {
      if (room.expiresAt <= now) {
        this.rooms.delete(code);
        removedRooms += 1;
      } else if (!this.#pruneDisconnected(room, now)) {
        removedRooms += 1;
      }
    }
    return removedRooms;
  }

  #pruneDisconnected(room, now) {
    const previousLength = room.players.length;
    room.players = room.players.filter((player) => (
      player.connected || player.reconnectUntil > now
    ));
    if (room.players.length === previousLength) return true;
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return false;
    }
    if (!room.players.some((player) => player.id === room.hostId)) {
      room.hostId = (room.players.find((player) => player.connected) ?? room.players[0]).id;
    }
    room.revision += 1;
    return true;
  }

  #getActiveRoom(code, now) {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.expiresAt <= now) {
      this.rooms.delete(code);
      return null;
    }
    return this.#pruneDisconnected(room, now) ? room : null;
  }
}
