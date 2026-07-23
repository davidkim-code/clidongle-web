/*
 * client-v1.js — CLI Dongle management UI for WebSerial protocol 1.
 * Loaded by index.html after the version handshake. Uses window.CLID:
 *   CLID.sendCommand(str) -> Promise<string[]>   (response lines)
 *   CLID.log(text, cls)                            (append to console)
 * The client builds its UI into #app and owns nothing about the connection.
 */
(function () {
  "use strict";
  const CLID = window.CLID;
  if (!CLID) return;
  const app = document.getElementById("app");

  app.innerHTML = `
    <section>
      <h2>Add macro</h2>
      <div class="row">
        <div><label>Trigger</label><input id="m-trig" placeholder="brb"></div>
        <div><label>Expansion (\\n = newline)</label><input id="m-exp" placeholder="be right back"></div>
        <button id="m-add" class="primary">Add</button>
      </div>
    </section>
    <section>
      <h2>Macros <button id="m-refresh" style="float:right">Refresh</button></h2>
      <table id="m-table"><thead><tr><th>Trigger</th><th>Expansion</th><th></th></tr></thead><tbody></tbody></table>
      <p id="m-empty" class="muted" hidden>No macros.</p>
    </section>
    <section>
      <h2>Add remap</h2>
      <div class="row">
        <div><label>From key</label><input id="r-from" placeholder="CapsLock"></div>
        <div><label>To key</label><input id="r-to" placeholder="Escape"></div>
        <button id="r-add" class="primary">Add</button>
      </div>
      <p class="muted">Names: letters, digits, CapsLock, Escape, Enter, Tab, Space, F1–F12, arrows, Ctrl/Alt/Shift/Cmd…</p>
    </section>
    <section>
      <h2>Remaps <button id="r-refresh" style="float:right">Refresh</button></h2>
      <table id="r-table"><thead><tr><th>From</th><th>To</th></tr></thead><tbody></tbody></table>
      <p id="r-empty" class="muted" hidden>No remaps.</p>
    </section>
    <section id="wifi-section">
      <h2>WiFi <button id="w-refresh" style="float:right">Refresh</button></h2>
      <p id="w-nowifi" class="muted" hidden>This board has no wireless module — WiFi is unavailable. (AI still works via <b>Browser</b> mode below.)</p>
      <p id="w-status" class="muted">not connected</p>
      <div class="row">
        <div><label>Add network SSID</label><input id="w-ssid" placeholder="MyNetwork"></div>
        <div><label>Password</label><input id="w-pass" type="password" placeholder="secret"></div>
        <button id="w-add" class="primary">Add</button>
      </div>
      <p class="muted" style="margin:.6rem 0 .2rem">Saved networks</p>
      <table id="w-saved"><tbody></tbody></table>
      <p id="w-saved-empty" class="muted" hidden>None saved.</p>
      <p class="muted" style="margin:.8rem 0 .2rem">Nearby <button id="w-scan" style="float:right">Scan</button></p>
      <table id="w-scan-t"><tbody></tbody></table>
    </section>
    <section>
      <h2>AI · Gemini <button id="ai-refresh" style="float:right">Refresh</button></h2>
      <p id="ai-status" class="muted">…</p>
      <div class="row">
        <div><label>Ask via</label><select id="ai-via">
          <option value="device">Device (on-board Wi-Fi)</option>
          <option value="browser">Browser (this computer's network)</option>
        </select></div>
      </div>
      <div id="ai-chat" class="log" style="min-height:6rem;margin:.4rem 0"></div>
      <div class="row">
        <div><input id="ai-prompt" placeholder="Ask Gemini…  (needs an API key)"></div>
        <button id="ai-send" class="primary">Send</button>
      </div>
      <div class="row" style="align-items:center">
        <label style="display:flex;align-items:center;gap:.4rem;margin:0;font-size:.85rem"><input type="checkbox" id="ai-continue" checked style="width:auto"> Continue conversation (send history as context)</label>
        <button id="ai-newchat">New chat</button>
      </div>
      <details style="margin-top:.6rem">
        <summary class="muted">API key &amp; model</summary>
        <div class="row" style="margin-top:.5rem">
          <div><label>API key</label><input id="ai-key" type="password" placeholder="paste, then Set"></div>
          <button id="ai-key-set" class="primary">Set</button>
          <button id="ai-key-clear">Clear</button>
        </div>
        <div class="row">
          <div><label>Model</label><input id="ai-model" placeholder="gemini-2.5-flash"></div>
          <button id="ai-model-set">Set model</button>
        </div>
        <div class="row">
          <div><label>Response timeout (5–120s)</label><input id="ai-timeout" type="number" min="5" max="120" placeholder="30"></div>
          <button id="ai-timeout-set">Set timeout</button>
        </div>
        <p class="muted">One API key (above) is used by both modes. Device mode: the key stays AES-256 encrypted on the device, which makes the request over Wi-Fi. Browser mode: this page fetches the key from the dongle and calls Gemini directly, then the dongle types the answer — works with no wireless module.</p>
      </details>
      <details style="margin-top:.5rem">
        <summary class="muted">Templates &amp; models</summary>
        <p class="muted" style="margin:.6rem 0 .2rem">Templates — the active one (●) is the system prompt for every question</p>
        <table id="ait-table"><tbody></tbody></table>
        <p id="ait-empty" class="muted" hidden>No templates.</p>
        <div class="row">
          <div><input id="ait-name" placeholder="name (e.g. coach)"></div>
          <div><input id="ait-prompt" placeholder="system prompt"></div>
          <button id="ait-add" class="primary">Add</button>
        </div>
        <p class="muted" style="margin:.9rem 0 .2rem">Models — the active one (●) is used for requests</p>
        <table id="aim-table"><tbody></tbody></table>
        <p id="aim-empty" class="muted" hidden>No saved models.</p>
        <div class="row">
          <div><input id="aim-name" placeholder="name (e.g. gemini-2.5-flash)"></div>
          <div><input id="aim-url" placeholder="optional custom URL"></div>
          <button id="aim-add" class="primary">Add</button>
        </div>
      </details>
    </section>
    <section>
      <h2>Passwords <button id="pw-refresh" style="float:right">Refresh</button></h2>
      <p id="pw-status" class="muted">…</p>
      <div id="pw-master-row" class="row">
        <div><label id="pw-master-label">Master password</label><input id="pw-master" type="password" placeholder="master…"></div>
        <button id="pw-master-btn" class="primary">Unlock</button>
        <button id="pw-forgot" hidden>Forgot? Reset vault</button>
      </div>
      <div id="pw-manage" hidden>
        <table id="pw-table"><tbody></tbody></table>
        <p id="pw-empty" class="muted" hidden>No entries.</p>
        <div class="row">
          <div><label>Service</label><input id="pw-svc" placeholder="github"></div>
          <div><label>URL (optional)</label><input id="pw-url" placeholder="https://…"></div>
        </div>
        <div class="row">
          <div><label>Username</label><input id="pw-user" placeholder="user"></div>
          <div><label>Password</label><input id="pw-pass" type="password" placeholder="secret"></div>
          <button id="pw-add" class="primary">Add</button>
          <button id="pw-lock">Lock</button>
        </div>
        <div class="row">
          <div><label>Auto-lock after (minutes, 0 = immediate)</label><input id="pw-autolock" type="number" min="0" max="1440" placeholder="15"></div>
          <button id="pw-autolock-set">Set</button>
        </div>
        <details style="margin-top:.6rem">
          <summary class="muted">Bulk import (CSV) &amp; danger zone</summary>
          <p class="muted" style="margin:.5rem 0 .2rem">One entry per line: <code>service,url,username,password</code> (URL may be blank)</p>
          <textarea id="pw-csv" rows="4" placeholder="github,https://github.com,dave,s3cret"></textarea>
          <div class="row"><button id="pw-import" class="primary">Import CSV</button></div>
          <div class="row" style="margin-top:.6rem"><button id="pw-reset">Reset vault (wipe all)</button></div>
        </details>
      </div>
      <p class="muted">The vault is AES-256 encrypted with your master password (never stored). Retrieve on the keyboard with <code>pw,&lt;service&gt;[,u|up]</code>.</p>
    </section>
    <section>
      <h2>Notes <button id="note-refresh" style="float:right">Refresh</button></h2>
      <table id="note-table"><tbody></tbody></table>
      <p id="note-empty" class="muted" hidden>No notes.</p>
      <div class="row">
        <div><label>Name</label><input id="note-name" placeholder="shopping"></div>
      </div>
      <div class="row">
        <div style="flex:1"><label>Body (multi-line ok)</label><textarea id="note-body" rows="3" placeholder="one per line…"></textarea></div>
      </div>
      <div class="row"><button id="note-add" class="primary">Add note</button></div>
    </section>
    <section id="edit-section" hidden>
      <h2 id="edit-title">Edit</h2>
      <textarea id="edit-body" rows="6"></textarea>
      <div class="row" style="margin-top:.5rem">
        <button id="edit-save" class="primary">Save</button>
        <button id="edit-cancel">Cancel</button>
        <span id="edit-dirty" class="muted"></span>
      </div>
    </section>
    <section>
      <h2>Recorded macros <button id="rec-refresh" style="float:right">Refresh</button></h2>
      <p class="muted">Timed keystroke recordings — record on the physical keyboard, replay anywhere. Recording stops on the exit key (default Caps Lock); playback aborts on ESC.</p>
      <table id="rec-table"><tbody></tbody></table>
      <p id="rec-empty" class="muted" hidden>No recordings.</p>
      <div class="row">
        <div><label>New recording name</label><input id="rec-name" placeholder="login"></div>
        <button id="rec-start" class="primary">Record</button>
      </div>
      <div class="row">
        <div><label>Exit key</label><input id="rec-exitkey" placeholder="CapsLock"></div>
        <button id="rec-exitkey-set">Set</button>
      </div>
    </section>
    <section>
      <h2>Config</h2>
      <div class="row">
        <button id="c-save" class="primary">Save to flash</button>
        <button id="c-load">Load from flash</button>
        <button id="c-reset">Factory reset</button>
        <button id="c-reboot">Reboot device</button>
      </div>
      <p class="muted">Macros and remaps live in RAM until you Save; saved config is restored on boot.</p>
      <p class="muted" style="margin:.8rem 0 .2rem">Backup — a full versioned export/import of all settings</p>
      <div class="row">
        <button id="c-export">Export settings…</button>
        <button id="c-import">Import settings…</button>
        <input type="file" id="c-import-file" accept=".conf,.txt" hidden>
      </div>
      <p class="muted">⚠ The backup file contains your WiFi passwords and API key in the clear — keep it safe.</p>
    </section>
    <section>
      <h2>Console</h2>
      <div class="row">
        <div><input id="raw" placeholder="CMD:STATUS  (or a plain command like macro,brb,hi)"></div>
        <button id="raw-send">Send</button>
      </div>
      <div id="log" class="log"></div>
    </section>`;

  const $ = (id) => document.getElementById(id);
  CLID._logEl = $("log");

  const send = (c) => CLID.sendCommand(c);
  const dataLines = (lines) => lines.filter((l) => l.startsWith("DATA:")).map((l) => l.slice(5));
  // Match settings_fmt.c: escape \, newline, CR so a value fits on one line.
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  const unesc = (s) => s.replace(/\\(.)/g, (_, c) => (c === "n" ? "\n" : c === "r" ? "\r" : c));

  // Shared multi-line editor used by notes and templates. Save is a no-op if
  // nothing changed; a dirty marker shows unsaved edits.
  let editKind = null, editName = "", editOrig = "";
  async function openEditor(kind, name) {
    const get = kind === "note" ? "CMD:NOTE_GET," : "CMD:AIT_GET,";
    const d = dataLines(await send(get + name))[0] || "";
    editKind = kind; editName = name; editOrig = unesc(d);
    $("edit-title").textContent = (kind === "note" ? "Note: " : "Template: ") + name;
    $("edit-body").value = editOrig;
    $("edit-dirty").textContent = "";
    $("edit-section").hidden = false;
    $("edit-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function closeEditor() { editKind = null; $("edit-section").hidden = true; }
  $("edit-body").addEventListener("input", () => {
    $("edit-dirty").textContent = $("edit-body").value !== editOrig ? "• unsaved changes" : "";
  });
  $("edit-cancel").onclick = closeEditor;
  $("edit-save").onclick = async () => {
    if (!editKind) return;
    if ($("edit-body").value === editOrig) { closeEditor(); return; }  // nothing changed -> nothing to save
    const body = esc($("edit-body").value);
    if (editKind === "note") { await send("CMD:NOTE_SET," + editName + "," + body); closeEditor(); refreshNotes(); }
    else { await send("CMD:AIT_ADD," + editName + "," + body); closeEditor(); refreshTemplates(); refreshAI(); }
  };

  async function refreshMacros() {
    const rows = dataLines(await send("CMD:MACRO_LIST"));
    const tb = $("m-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const d of rows) {
      const i = d.indexOf(",");
      const trig = d.slice(0, i), exp = d.slice(i + 1);
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td><td></td>";
      tr.children[0].textContent = trig;
      tr.children[1].textContent = exp;
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => { await send("CMD:MACRO_DELETE," + trig); refreshMacros(); };
      tr.children[2].appendChild(del);
      tb.appendChild(tr);
    }
    $("m-empty").hidden = rows.length > 0;
  }

  async function refreshRemaps() {
    const rows = dataLines(await send("CMD:REMAP_LIST"));
    const tb = $("r-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const d of rows) {
      const [from, to] = d.split(",");
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${from}</td><td>${to}</td>`;
      tb.appendChild(tr);
    }
    $("r-empty").hidden = rows.length > 0;
  }

  $("m-add").onclick = async () => {
    const t = $("m-trig").value.trim(), e = $("m-exp").value;
    if (!t || !e) return;
    await send(`CMD:MACRO_ADD,${t},${e}`);
    $("m-trig").value = ""; $("m-exp").value = "";
    refreshMacros();
  };
  $("r-add").onclick = async () => {
    const f = $("r-from").value.trim(), t = $("r-to").value.trim();
    if (!f || !t) return;
    await send(`CMD:REMAP_ADD,${f},${t}`);
    $("r-from").value = ""; $("r-to").value = "";
    refreshRemaps();
  };
  // --- WiFi ---
  async function refreshWifi() {
    if (CLID.hasWifi === false) return;   // no radio on this board
    const st = (await send("CMD:WIFI_STATUS"))[0] || "";      // OK:WIFI,status,ssid,ip
    const p = st.split(",");
    const status = p[1] || "?", ssid = p[2] || "", ip = p[3] || "";
    $("w-status").textContent = ssid
      ? `${status} — ${ssid} (${ip})`
      : `${status}`;
    const saved = dataLines(await send("CMD:WIFI_LIST"));
    const tb = $("w-saved").querySelector("tbody");
    tb.innerHTML = "";
    for (const s of saved) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td style='text-align:right'></td>";
      tr.children[0].textContent = s;
      const conn = document.createElement("button");
      conn.textContent = "Connect";
      conn.onclick = async () => { await send("CMD:WIFI_CONNECT," + s); setTimeout(refreshWifi, 1500); };
      const forget = document.createElement("button");
      forget.textContent = "Forget";
      forget.style.marginLeft = ".4rem";
      forget.onclick = async () => { await send("CMD:WIFI_FORGET," + s); refreshWifi(); };
      tr.children[1].append(conn, forget);
      tb.appendChild(tr);
    }
    $("w-saved-empty").hidden = saved.length > 0;
  }

  async function scanWifi() {
    await send("CMD:WIFI_SCAN");                 // trigger a fresh scan
    setTimeout(async () => {
      const rows = dataLines(await send("CMD:WIFI_SCAN"));   // ssid,rssi,secured
      const tb = $("w-scan-t").querySelector("tbody");
      tb.innerHTML = "";
      for (const d of rows) {
        const parts = d.split(",");
        const ssid = parts[0], rssi = parts[1], sec = parts[2] === "1";
        if (!ssid) continue;
        const tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td class='muted'></td><td style='text-align:right'></td>";
        tr.children[0].textContent = ssid + (sec ? " 🔒" : "");
        tr.children[1].textContent = rssi + " dBm";
        const use = document.createElement("button");
        use.textContent = "Use";
        use.onclick = () => { $("w-ssid").value = ssid; $("w-pass").focus(); };
        tr.children[2].appendChild(use);
        tb.appendChild(tr);
      }
    }, 2500);
  }

  $("w-add").onclick = async () => {
    const s = $("w-ssid").value.trim(), p = $("w-pass").value;
    if (!s) return;
    await send(`CMD:WIFI_ADD,${s},${p}`);
    $("w-ssid").value = ""; $("w-pass").value = "";
    refreshWifi();
  };
  $("w-refresh").onclick = refreshWifi;
  $("w-scan").onclick = scanWifi;

  // --- AI (Gemini) ---
  function appendChat(who, text) {
    const div = document.createElement("div");
    div.className = who === "you" ? "tx" : (who === "err" ? "err" : "rx");
    div.style.whiteSpace = "pre-wrap";
    div.textContent = (who === "you" ? "User: " : who === "err" ? "" : "AI: ") + text;
    $("ai-chat").appendChild(div);
    $("ai-chat").scrollTop = $("ai-chat").scrollHeight;
    return div;
  }
  // A subtle system line in the chat (not a user/AI turn, never recorded).
  function appendNote(text) {
    const div = document.createElement("div");
    div.className = "muted";
    div.style.fontSize = ".8rem";
    div.style.margin = ".15rem 0";
    div.textContent = text;
    $("ai-chat").appendChild(div);
    $("ai-chat").scrollTop = $("ai-chat").scrollHeight;
  }

  // Conversation history for continued chats. Each turn: {role:"user"|"model", text}.
  let chatTurns = [], pendingQ = "";
  function recordTurn(q, ans) {
    chatTurns.push({ role: "user", text: q }, { role: "model", text: ans });
    while (chatTurns.length > 20) chatTurns.shift();   // cap so the prompt stays small
  }
  // Device mode ships the whole transcript to the dongle, whose prompt/request
  // buffers are 8 KB (WS_AI_MAX / REQ_MAX); after JSON-escaping + the HTTP
  // wrapper the usable prompt is ~6-7 KB. So in device mode we trim the oldest
  // turns to a safe raw budget, always keeping the newest question. Browser
  // mode calls Gemini directly and has no such limit — send the full history.
  const DEVICE_PROMPT_BUDGET = 6000;             // bytes of raw prompt (pre-escape)
  const _enc = new TextEncoder();
  const byteLen = (s) => _enc.encode(s).length;
  const turnLine = (x) => (x.role === "user" ? "User" : "AI") + ": " + x.text;
  let lastCtxTrimmed = false;                     // set by buildPrompt when it drops turns

  // Prepend the conversation transcript as context when "Continue conversation"
  // is on, so the model has the running history.
  function buildPrompt(q) {
    lastCtxTrimmed = false;
    if (!$("ai-continue").checked || chatTurns.length === 0) return q;
    const head = "Ongoing conversation — continue it.\n\n";
    const tail = "\nUser: " + q;

    let turns = chatTurns;
    if ($("ai-via").value !== "browser") {         // device mode: fit the dongle's buffer
      const budget = DEVICE_PROMPT_BUDGET - byteLen(head) - byteLen(tail);
      const kept = [];
      let used = 0;
      for (let i = chatTurns.length - 1; i >= 0; i--) {
        const cost = byteLen(turnLine(chatTurns[i])) + 1;   // +1 for the joining newline
        if (used + cost > budget) { lastCtxTrimmed = true; break; }
        used += cost;
        kept.unshift(chatTurns[i]);
      }
      if (kept.length === 0) return q;             // nothing fits (huge question) — send it alone
      turns = kept;
    }
    return head + turns.map(turnLine).join("\n") + tail;
  }

  let aiTimeout = 30, aiModelName = "gemini-2.5-flash";
  async function refreshAI() {
    const st = (await send("CMD:AI_STATUS"))[0] || "";   // OK:AI,<0|1>,<model>,<tpl>,<timeout>
    const p = st.split(",");
    const model = p[2] || "", tpl = p[3] || "";
    aiTimeout = parseInt(p[4], 10) || 30;
    aiModelName = model || "gemini-2.5-flash";
    $("ai-status").textContent = (p[1] === "1" ? "key set" : "no key set") +
                                 (model ? " · " + model : "") +
                                 (tpl ? " · template: " + tpl : "") +
                                 " · " + aiTimeout + "s timeout";
    if (model) $("ai-model").placeholder = model;
    $("ai-timeout").placeholder = String(aiTimeout);
  }

  // --- AI templates ---
  async function refreshTemplates() {
    const rows = dataLines(await send("CMD:AIT_LIST"));   // name,active
    const tb = $("ait-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const d of rows) {
      const i = d.lastIndexOf(",");
      const name = d.slice(0, i), active = d.slice(i + 1) === "1";
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td style='text-align:right'></td>";
      tr.children[0].textContent = name + (active ? " ●" : "");
      const use = document.createElement("button");
      use.textContent = active ? "Unset" : "Use";
      use.onclick = async () => { await send(active ? "CMD:AIT_NONE" : "CMD:AIT_USE," + name); refreshTemplates(); refreshAI(); };
      const ed = document.createElement("button");
      ed.textContent = "View/Edit"; ed.style.marginLeft = ".4rem";
      ed.onclick = () => openEditor("template", name);
      const del = document.createElement("button");
      del.textContent = "Delete"; del.style.marginLeft = ".4rem";
      del.onclick = async () => { await send("CMD:AIT_DELETE," + name); refreshTemplates(); refreshAI(); };
      tr.children[1].append(use, ed, del);
      tb.appendChild(tr);
    }
    $("ait-empty").hidden = rows.length > 0;
  }
  $("ait-add").onclick = async () => {
    const n = $("ait-name").value.trim(), p = $("ait-prompt").value;
    if (!n || !p) return;
    await send("CMD:AIT_ADD," + n + "," + esc(p));
    $("ait-name").value = ""; $("ait-prompt").value = "";
    refreshTemplates();
  };

  // --- AI models ---
  async function refreshModels() {
    const rows = dataLines(await send("CMD:AIMODEL_LIST"));   // name,active,url
    const tb = $("aim-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const d of rows) {
      const parts = d.split(",");
      const name = parts[0], active = parts[1] === "1", url = parts.slice(2).join(",");
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td class='muted' style='font-size:.85em;word-break:break-all'></td><td style='text-align:right'></td>";
      tr.children[0].textContent = name + (active ? " ●" : "");
      tr.children[1].textContent = url || "(gemini default)";
      const use = document.createElement("button");
      use.textContent = "Use";
      use.onclick = async () => { await send("CMD:AIMODEL_USE," + name); refreshModels(); refreshAI(); };
      const del = document.createElement("button");
      del.textContent = "Delete"; del.style.marginLeft = ".4rem";
      del.onclick = async () => { await send("CMD:AIMODEL_DELETE," + name); refreshModels(); refreshAI(); };
      tr.children[2].append(use, del);
      tb.appendChild(tr);
    }
    $("aim-empty").hidden = rows.length > 0;
  }
  $("aim-add").onclick = async () => {
    const n = $("aim-name").value.trim(), u = $("aim-url").value.trim();
    if (!n) return;
    await send("CMD:AIMODEL_ADD," + n + "," + u);
    $("aim-name").value = ""; $("aim-url").value = "";
    refreshModels();
  };

  // The answer is async: CMD:AI_ASK acks with OK:AI_PENDING, then the reply
  // arrives later as OK:AI + DATA: lines + END (or ERR:AI,<msg>).
  // The async AI answer has its own framing (AIBEGIN / AIDATA: / AIEND / AIERR:)
  // so it never collides with a synchronous command's DATA:/END response.
  let aiPending = null, aiLines = [], aiCollecting = false, aiTimer = null;
  function stopTimer() { if (aiTimer) { clearInterval(aiTimer); aiTimer = null; } }
  CLID.onLine((line) => {
    if (line === "AIBEGIN") { aiCollecting = true; aiLines = []; return; }
    if (aiCollecting) {
      if (line.startsWith("AIDATA:")) { aiLines.push(line.slice(7)); return; }
      if (line === "AIEND") {
        aiCollecting = false; stopTimer();
        const ans = aiLines.join("\n");
        if (aiPending) { aiPending.textContent = "AI: " + ans; aiPending = null; }
        else appendChat("ai", ans);
        recordTurn(pendingQ, ans);
        return;
      }
    }
    if (line.startsWith("AIERR:")) {
      aiCollecting = false; stopTimer();
      const msg = line.slice(6) || "error";
      if (aiPending) { aiPending.textContent = "⚠ " + msg; aiPending.className = "err"; aiPending = null; }
      else appendChat("err", "⚠ " + msg);
    }
  });

  function askAI() {
    const q = $("ai-prompt").value.trim();
    if (!q) return;
    $("ai-prompt").value = "";
    appendChat("you", q);
    const prompt = buildPrompt(q);                           // adds context; trims it in device mode
    if (lastCtxTrimmed)
      appendNote("⚠ Older context trimmed to fit Device mode (~6 KB). Switch “Ask via” to Browser to keep the full history.");
    pendingQ = q;
    aiPending = appendChat("ai", "");
    let left = aiTimeout;
    const tick = () => { if (aiPending) aiPending.textContent = "AI: …waiting… (" + left + "s)"; };
    tick();
    stopTimer();
    aiTimer = setInterval(() => { left = Math.max(0, left - 1); tick(); }, 1000);
    if ($("ai-via").value === "browser") askBrowser(prompt);
    else send("CMD:AI_ASK," + esc(prompt));                  // escaped: multi-turn context has newlines
  }

  function finishBrowser(text, isErr) {
    stopTimer();
    if (aiPending) { aiPending.textContent = text; aiPending.className = isErr ? "err" : "rx"; aiPending = null; }
  }
  // Browser mode reuses the device's stored key (fetched once, over serial).
  let browserKey = "";
  async function deviceKey() {
    if (browserKey) return browserKey;
    const r = (await send("CMD:AI_GETKEY"))[0] || "";
    if (r.startsWith("OK:AIKEY,")) browserKey = r.slice(9);
    return browserKey;
  }
  async function askBrowser(prompt) {
    const key = await deviceKey();
    if (!key) { finishBrowser("⚠ no API key set on the device (set one above)", true); return; }
    try {
      const body = { contents: [{ parts: [{ text: prompt }] }] };
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${aiModelName}:generateContent?key=${encodeURIComponent(key)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
      const ans = (((j.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || "(no text)";
      finishBrowser("AI: " + ans, false);
      recordTurn(pendingQ, ans);
      send("CMD:TYPE," + esc(ans));                          // dongle types the answer
    } catch (e) {
      finishBrowser("⚠ " + (e.message || e), true);
    }
  }
  $("ai-newchat").onclick = () => { chatTurns = []; $("ai-chat").innerHTML = ""; };

  $("ai-send").onclick = askAI;
  $("ai-prompt").addEventListener("keydown", (e) => { if (e.key === "Enter") askAI(); });
  $("ai-refresh").onclick = refreshAI;
  $("ai-key-set").onclick = async () => {
    const k = $("ai-key").value.trim();
    if (!k) return;
    await send("CMD:AI_KEY," + k);
    $("ai-key").value = "";
    browserKey = "";           // re-fetch for browser mode
    refreshAI();
  };
  $("ai-key-clear").onclick = async () => { await send("CMD:AI_CLEARKEY"); browserKey = ""; refreshAI(); };
  $("ai-model-set").onclick = async () => {
    const m = $("ai-model").value.trim();
    if (!m) return;
    await send("CMD:AI_MODEL," + m);
    $("ai-model").value = "";
    refreshAI();
  };
  $("ai-timeout-set").onclick = async () => {
    const t = $("ai-timeout").value.trim();
    if (!t) return;
    await send("CMD:AI_TIMEOUT," + t);
    $("ai-timeout").value = "";
    refreshAI();
  };
  // On a board without Wi-Fi, force browser mode (on-device AI isn't possible)
  // and grey out the whole WiFi panel — there's no radio to configure.
  if (CLID.hasWifi === false) {
    $("ai-via").value = "browser";
    const dev = $("ai-via").querySelector('option[value="device"]');
    if (dev) dev.disabled = true;
    const wsec = $("wifi-section");
    if (wsec) {
      $("w-nowifi").hidden = false;
      $("w-status").hidden = true;
      wsec.style.opacity = ".55";
      wsec.querySelectorAll("input,button,select").forEach(el => { el.disabled = true; });
    }
  }

  // --- Notes ---
  async function refreshNotes() {
    const rows = dataLines(await send("CMD:NOTE_LIST"));
    const tb = $("note-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const name of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td style='text-align:right'></td>";
      tr.children[0].textContent = name;
      const ed = document.createElement("button");
      ed.textContent = "View/Edit";
      ed.onclick = () => openEditor("note", name);
      const del = document.createElement("button");
      del.textContent = "Delete"; del.style.marginLeft = ".4rem";
      del.onclick = async () => { await send("CMD:NOTE_DELETE," + name); refreshNotes(); if (editKind === "note" && editName === name) closeEditor(); };
      tr.children[1].append(ed, del);
      tb.appendChild(tr);
    }
    $("note-empty").hidden = rows.length > 0;
  }
  $("note-add").onclick = async () => {
    const n = $("note-name").value.trim(), b = $("note-body").value;
    if (!n || !b) return;
    await send("CMD:NOTE_ADD," + n + "," + esc(b));
    $("note-name").value = ""; $("note-body").value = "";
    refreshNotes();
  };
  $("note-refresh").onclick = refreshNotes;

  // --- Passwords ---
  async function refreshPw() {
    const st = (await send("CMD:PW_STATUS"))[0] || "";   // OK:PW,<exists>,<unlocked>,<autolock>
    const p = st.split(",");
    const exists = p[1] === "1", unlocked = p[2] === "1", autolock = p[3] || "15";
    $("pw-status").textContent = (!exists ? "no vault yet — set a master password to create one"
                                          : (unlocked ? "unlocked" : "locked"))
                                 + " · auto-lock " + (autolock === "0" ? "immediate" : autolock + " min");
    $("pw-autolock").placeholder = autolock;
    $("pw-master-label").textContent = exists ? "Master password" : "Set a master password";
    $("pw-master-btn").textContent = exists ? "Unlock" : "Create vault";
    $("pw-forgot").hidden = !exists || unlocked;   // only when locked with a vault
    $("pw-master-row").hidden = unlocked;
    $("pw-manage").hidden = !unlocked;
    if (unlocked) refreshPwList();
  }
  async function refreshPwList() {
    const rows = dataLines(await send("CMD:PW_LIST"));
    const tb = $("pw-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const svc of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td style='text-align:right'></td>";
      tr.children[0].textContent = svc;
      const rev = document.createElement("button");
      rev.textContent = "Reveal";
      rev.onclick = async () => {
        const r = (await send("CMD:PW_GET," + svc))[0] || "";   // OK:PW,url,user,pass
        if (r.startsWith("OK:PW,")) {
          const q = r.slice(6).split(",");
          alert(svc + "\nURL: " + (q[0] || "—") + "\nUser: " + q[1] + "\nPass: " + q.slice(2).join(","));
        }
      };
      const del = document.createElement("button");
      del.textContent = "Delete"; del.style.marginLeft = ".4rem";
      del.onclick = async () => { if (confirm("Delete " + svc + "?")) { await send("CMD:PW_DELETE," + svc); refreshPwList(); } };
      tr.children[1].append(rev, del);
      tb.appendChild(tr);
    }
    $("pw-empty").hidden = rows.length > 0;
  }
  $("pw-master-btn").onclick = async () => {
    const m = $("pw-master").value;
    if (!m) return;
    const unlock = $("pw-master-btn").textContent === "Unlock";
    const r = (await send((unlock ? "CMD:PW_UNLOCK," : "CMD:PW_SETMASTER,") + m))[0] || "";
    $("pw-master").value = "";
    if (r.startsWith("ERR:")) alert(r.slice(4));
    refreshPw();
  };
  $("pw-lock").onclick = async () => { await send("CMD:PW_LOCK"); refreshPw(); };
  $("pw-autolock-set").onclick = async () => {
    const m = $("pw-autolock").value.trim();
    if (m === "") return;
    await send("CMD:PW_AUTOLOCK," + m);
    $("pw-autolock").value = "";
    refreshPw();
  };
  $("pw-add").onclick = async () => {
    const s = $("pw-svc").value.trim(), u = $("pw-url").value.trim();
    const user = $("pw-user").value, pass = $("pw-pass").value;
    if (!s || !user) return;
    await send("CMD:PW_ADD," + s + "," + u + "," + user + "," + pass);
    $("pw-svc").value = ""; $("pw-url").value = ""; $("pw-user").value = ""; $("pw-pass").value = "";
    refreshPwList();
  };
  $("pw-import").onclick = async () => {
    const lines = $("pw-csv").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let ok = 0;
    for (const l of lines) {
      const parts = l.split(",");                 // service,url,username,password
      if (parts.length < 4) continue;
      const cmd = "CMD:PW_ADD," + parts[0] + "," + parts[1] + "," + parts[2] + "," + parts.slice(3).join(",");
      if (((await send(cmd))[0] || "").startsWith("OK:")) ok++;
    }
    $("pw-csv").value = "";
    alert("Imported " + ok + " of " + lines.length + " entries.");
    refreshPwList();
  };
  async function pwReset() {
    if (confirm("Wipe the entire vault AND master password? This cannot be undone.")) { await send("CMD:PW_RESET"); refreshPw(); }
  }
  $("pw-reset").onclick = pwReset;
  $("pw-forgot").onclick = pwReset;   // forgot master -> wipe + start over
  $("pw-refresh").onclick = refreshPw;

  // --- Recorded macros ---
  async function refreshRec() {
    const rows = dataLines(await send("CMD:REC_LIST"));   // name,events
    const tb = $("rec-table").querySelector("tbody");
    tb.innerHTML = "";
    for (const d of rows) {
      const i = d.lastIndexOf(",");
      const name = d.slice(0, i), events = d.slice(i + 1);
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td class='muted'></td><td style='text-align:right'></td>";
      tr.children[0].textContent = name;
      tr.children[1].textContent = events + " events";
      const play = document.createElement("button");
      play.textContent = "Play";
      play.onclick = () => send("CMD:REC_PLAY," + name);
      const del = document.createElement("button");
      del.textContent = "Delete"; del.style.marginLeft = ".4rem";
      del.onclick = async () => { await send("CMD:REC_DELETE," + name); refreshRec(); };
      tr.children[2].append(play, del);
      tb.appendChild(tr);
    }
    $("rec-empty").hidden = rows.length > 0;
  }
  $("rec-start").onclick = async () => {
    const n = $("rec-name").value.trim();
    if (!n) return;
    await send("CMD:REC_START," + n);
    $("rec-name").value = "";
    alert(`Recording "${n}" — type on the physical keyboard now, then press the exit key (Caps Lock) to stop. Then hit Refresh.`);
  };
  $("rec-exitkey-set").onclick = async () => {
    const k = $("rec-exitkey").value.trim();
    if (!k) return;
    await send("CMD:REC_EXITKEY," + k);
    $("rec-exitkey").value = "";
  };
  $("rec-refresh").onclick = refreshRec;

  $("m-refresh").onclick = refreshMacros;
  $("r-refresh").onclick = refreshRemaps;
  $("c-save").onclick = () => send("CMD:CONFIG_SAVE");
  $("c-load").onclick = async () => { await send("CMD:CONFIG_LOAD"); refreshMacros(); refreshRemaps(); };
  $("c-reset").onclick = async () => {
    if (confirm("Erase all saved macros and remaps?")) { await send("CMD:CONFIG_RESET"); refreshMacros(); refreshRemaps(); }
  };
  $("c-reboot").onclick = () => send("CMD:REBOOT");
  $("c-export").onclick = async () => {
    const lines = dataLines(await send("CMD:EXPORT"));
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clidongle-settings.conf";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $("c-import").onclick = () => $("c-import-file").click();
  $("c-import-file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    if (!confirm(`Import settings from "${file.name}"? It merges into the current settings.`)) return;
    const lines = (await file.text()).split(/\r?\n/).filter((l) => l.trim());
    for (const l of lines) await send("CMD:IMPORT_LINE," + l);
    await send("CMD:CONFIG_SAVE");
    refreshMacros(); refreshRemaps(); refreshWifi();
    refreshAI(); refreshTemplates(); refreshModels();
    alert(`Imported ${lines.length} settings.`);
  };
  $("raw-send").onclick = () => { const v = $("raw").value.trim(); if (v) send(v); };
  $("raw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("raw-send").click(); });

  refreshMacros();
  refreshRemaps();
  refreshWifi();
  refreshAI();
  refreshTemplates();
  refreshModels();
  refreshNotes();
  refreshPw();
  refreshRec();
})();
