const db = await Deno.openKv();

export async function getAllSessions() {
  const entries = await db.list({ prefix: [] });
  let sessions = [];
  for await (const entry of entries) {
    sessions.push(entry.value);
  }
  return sessions;
}

export async function getNewSessionId() {
  let n = 1;
  while ((await db.get(["session" + n])).value != null) {
    n += 1;
  }
  return "session" + n;
}

export async function getSessionData(id) {
  return (await db.get([id])).value;
}

export async function setSessionData(id, data) {
  await db.set([id], data);
  return;
}

export async function deleteSessionData(id) {
  await db.delete([id]);
  return;
}

export async function clearAllData() {
  const entries = db.list({ prefix: [] });
  for await (const entry of entries) {
    db.delete(entry.key);
  }
}

export async function cleanupExpiredSessions() {
  const entries = db.list({ prefix: [] });
  for await (const entry of entries) {
    const session_id = entry.key[0];
    const session_data = await getSessionData(session_id);
    if (Date.now() > session_data.expires) {
      deleteSessionData(session_id);
    }
  }
}
