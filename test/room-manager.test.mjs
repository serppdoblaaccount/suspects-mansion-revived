import test from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "../src/room-manager.mjs";

test("creates a six-character private room and adds its host", () => {
  const rooms = new RoomManager({ codeFactory: () => "ABCD23" });
  const room = rooms.createRoom({ playerId: "p1", playerName: " Detective ", now: 100 });
  assert.equal(room.code, "ABCD23");
  assert.equal(room.hostId, "p1");
  assert.equal(room.players[0].name, "Detective");
  assert.equal(room.status, "waiting");
});

test("allows players to join case-insensitively and prevents duplicates", () => {
  const rooms = new RoomManager({ codeFactory: () => "ABCD23" });
  rooms.createRoom({ playerId: "p1", playerName: "Host", now: 100 });
  let room = rooms.joinRoom({ code: "abcd23", playerId: "p2", playerName: "Guest", now: 101 });
  room = rooms.joinRoom({ code: "ABCD23", playerId: "p2", playerName: "Guest 2", now: 102 });
  assert.equal(room.players.length, 2);
  assert.equal(room.players[1].name, "Guest 2");
});

test("enforces capacity and host-only start with at least two players", () => {
  const rooms = new RoomManager({ maxPlayers: 2, codeFactory: () => "ABCD23" });
  rooms.createRoom({ playerId: "p1", playerName: "Host", now: 100 });
  assert.throws(() => rooms.startRoom({ code: "ABCD23", playerId: "p1", now: 100 }), /NEED_MORE_PLAYERS/);
  rooms.joinRoom({ code: "ABCD23", playerId: "p2", playerName: "Guest", now: 101 });
  assert.throws(() => rooms.startRoom({ code: "ABCD23", playerId: "p2", now: 102 }), /HOST_ONLY/);
  assert.throws(() => rooms.joinRoom({ code: "ABCD23", playerId: "p3", playerName: "Full", now: 102 }), /ROOM_FULL/);
  assert.equal(rooms.startRoom({ code: "ABCD23", playerId: "p1", now: 103 }).status, "playing");
});

test("transfers host when the host leaves and removes empty rooms", () => {
  const rooms = new RoomManager({ codeFactory: () => "ABCD23" });
  rooms.createRoom({ playerId: "p1", playerName: "Host", now: 100 });
  rooms.joinRoom({ code: "ABCD23", playerId: "p2", playerName: "Guest", now: 101 });
  assert.equal(rooms.leaveRoom({ code: "ABCD23", playerId: "p1", now: 102 }).hostId, "p2");
  assert.equal(rooms.leaveRoom({ code: "ABCD23", playerId: "p2", now: 103 }), null);
  assert.equal(rooms.getRoom("ABCD23", 103), null);
});

test("expires rooms and prunes stale entries", () => {
  const rooms = new RoomManager({ roomTtlMs: 50, codeFactory: () => "ABCD23" });
  rooms.createRoom({ playerId: "p1", playerName: "Host", now: 100 });
  assert.equal(rooms.getRoom("ABCD23", 149).code, "ABCD23");
  assert.equal(rooms.getRoom("ABCD23", 150), null);
  rooms.createRoom({ playerId: "p2", playerName: "New host", now: 200 });
  assert.equal(rooms.pruneExpired(250), 1);
});
