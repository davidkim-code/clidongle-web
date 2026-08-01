/*
 * client-v2.js — CLI Dongle management UI for WebSerial protocol 2.
 * v1 + the Bluetooth keyboards panel (scan/pair with passkey callout,
 * paired-list management) driven by CMD:BT_* and unsolicited BT: events.
 * Loaded by index.html after the version handshake. Uses window.CLID:
 *   CLID.sendCommand(str) -> Promise<string[]>   (response lines)
 *   CLID.log(text, cls)                            (append to console)
 *   CLID.onLine(fn)                                (async BT:/AI* lines)
 *   CLID.hasBt                                     (capability from VERSION)
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
    <section id="hk-section">
      <h2>Shortcuts <button id="hk-refresh" style="float:right">Refresh</button></h2>
      <p class="muted">A shortcut replaces the key you press. <b>Remaps</b> stay separate:
      a remap swaps one key for another on press <i>and</i> release (so it repeats when held),
      while a shortcut fires an action once. Where both apply, the shortcut wins.</p>
      <table id="hk-table"><thead><tr><th>Shortcut</th><th>Does</th><th></th></tr></thead><tbody></tbody></table>
      <p id="hk-empty" class="muted" hidden>No shortcuts.</p>

      <div class="row" style="margin-top:.6rem">
        <button id="hk-capture" class="primary">Record on keyboard…</button>
        <span class="muted">Press the shortcut, then press what it should do.</span>
      </div>

      <h3 style="margin-top:1rem">Or build one here</h3>
      <div class="row">
        <div><label>Shortcut</label>
          <span id="hk-tmods"></span>
          <select id="hk-tkey"></select>
        </div>
      </div>
      <div class="row">
        <div><label>Action</label>
          <select id="hk-kind">
            <option value="chord">Send keys</option>
            <option value="media">Media key</option>
            <option value="macro">Run macro</option>
            <option value="rec">Play recording</option>
          </select>
        </div>
        <div id="hk-chord-wrap">
          <span id="hk-amods"></span>
          <select id="hk-akey"></select>
        </div>
        <div id="hk-media-wrap" hidden><select id="hk-media"></select></div>
        <div id="hk-name-wrap" hidden><input id="hk-name" placeholder="macro trigger / recording name"></div>
        <button id="hk-add" class="primary">Add shortcut</button>
      </div>
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
    <section id="bt-section">
      <h2>Bluetooth keyboards <button id="bt-refresh" style="float:right">Refresh</button></h2>
      <p id="bt-nobt" class="muted" hidden>This board has no radio — Bluetooth is unavailable.</p>
      <p id="bt-status" class="muted">…</p>
      <p id="bt-active" hidden style="margin:.2rem 0 .6rem">
        <button id="bt-disc-now">Disconnect current keyboard</button>
        <span class="muted" style="font-size:.8rem"> — frees the slot for pairing another</span>
      </p>
      <div id="bt-passkey" class="banner warn" hidden style="font-size:1.05rem"></div>
      <p class="muted" style="margin:.6rem 0 .2rem">Paired</p>
      <table id="bt-paired"><tbody></tbody></table>
      <p id="bt-paired-empty" class="muted" hidden>No paired keyboards.</p>
      <p class="muted" style="margin:.8rem 0 .2rem">Nearby
        <button id="bt-scan" style="float:right">Scan</button></p>
      <p class="muted" style="font-size:.8rem">Put the keyboard in pairing mode, click Scan,
        then Pair on its row. If a 6-digit code appears, type it <b>on the new keyboard</b> and press Enter.</p>
      <table id="bt-nearby"><tbody></tbody></table>
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
          <div><label>Model</label><input id="ai-model" placeholder="gemini-flash-lite-latest"></div>
          <button id="ai-model-set">Set model</button>
        </div>
        <div class="row">
          <div><label>Response timeout (5–120s)</label><input id="ai-timeout" type="number" min="5" max="120" placeholder="30"></div>
          <button id="ai-timeout-set">Set timeout</button>
        </div>
        <p id="ai-bt-lock" class="muted" hidden><b>Browser mode is required right now:</b>
        a Bluetooth keyboard is connected, and running the dongle's own Wi-Fi at
        the same time crashes it. Disconnect the BT keyboard to re-enable device mode.</p>
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
          <div><input id="aim-name" placeholder="name (e.g. gemini-flash-lite-latest)"></div>
          <div><input id="aim-url" placeholder="optional custom URL"></div>
          <button id="aim-add" class="primary">Add</button>
        </div>
      </details>
    </section>
    <section>
      <h2>Passwords <button id="pw-refresh" style="float:right">Refresh</button></h2>
      <p id="pw-status" class="muted">…</p>
      <div id="pw-master-row" class="row">
        <div><label id="pw-master-label">Master password</label>
        <small id="pw-master-hint">Typed on your keyboard, never over USB serial.</small></div>
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
      <h2>Storage <button id="st-refresh" style="float:right">Refresh</button></h2>
      <div id="st-meters"></div>
      <p id="st-note" class="muted" hidden></p>
      <p class="muted">Each store has a fixed number of slots; the meters show how full each is. Unlock the vault to see password usage.</p>
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

  let aiTimeout = 30, aiModelName = "gemini-flash-lite-latest";
  async function refreshAI() {
    const st = (await send("CMD:AI_STATUS"))[0] || "";   // OK:AI,<0|1>,<model>,<tpl>,<timeout>
    const p = st.split(",");
    const model = p[2] || "", tpl = p[3] || "";
    aiTimeout = parseInt(p[4], 10) || 30;
    aiModelName = model || "gemini-flash-lite-latest";
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
  // On-device AI drives WiFi + TLS on the same radio as the BLE link, and that
  // combination WEDGES the firmware — the dongle drops off USB and the watchdog
  // reboots it (AI/future/bluetooth-keyboard/12-phase6-coexistence.md). The
  // firmware refuses the call, but the UI should never ask for it in the first
  // place: force browser mode for as long as a BT keyboard is connected.
  let aiViaBeforeBt = null;
  function setAiRadioLock(btConnected) {
    const sel = $("ai-via");
    if (!sel || CLID.hasWifi === false) return;   // no-WiFi boards are already locked
    const dev = sel.querySelector('option[value="device"]');
    const note = $("ai-bt-lock");
    if (btConnected) {
      if (aiViaBeforeBt === null) aiViaBeforeBt = sel.value;
      sel.value = "browser";
      if (dev) dev.disabled = true;
      if (note) note.hidden = false;
    } else {
      if (dev) dev.disabled = false;
      if (note) note.hidden = true;
      if (aiViaBeforeBt !== null) { sel.value = aiViaBeforeBt; aiViaBeforeBt = null; }
    }
  }

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
    refreshStorage();
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
    refreshStorage();
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
  // The master is never sent over the wire: we ask the dongle to prompt for it
  // on the physical keyboard, where it is echoed as '*' and goes straight into
  // the vault. Anything on this machine can open the serial port, so a
  // CMD:PW_SETMASTER,<master> would hand the master to every such process.
  $("pw-master-btn").onclick = async () => {
    const unlock = $("pw-master-btn").textContent === "Unlock";
    const r = (await send(unlock ? "CMD:PW_UNLOCK" : "CMD:PW_SETMASTER"))[0] || "";
    if (r.startsWith("ERR:")) { alert(r.slice(4)); return; }
    CLID.log("[pw] type the master on your keyboard, then Enter", "dbg");
    alert("Click into a text field (this page's notes box is fine), then type "
        + (unlock ? "your master password" : "a new master password")
        + " on the keyboard and press Enter.\n\nIt shows as * and is never "
        + "sent over USB serial. Esc cancels.");
    // The dongle answers immediately; the vault state changes only once the
    // user has finished typing, so poll for a while instead of once.
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const st = (await send("CMD:PW_STATUS"))[0] || "";
      const p = st.split(",");
      if (p.length >= 3 && (p[2] === "1" || (!unlock && p[1] === "1"))) break;
    }
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
  $("c-reset").onclick = () => {
    if (!confirm("Factory reset — erase EVERYTHING on the dongle?\n\n" +
      "Macros, remaps, the password vault, saved WiFi, the AI key + templates + models, " +
      "notes, and recordings will all be wiped, and the dongle reboots. This cannot be undone.")) return;
    send("CMD:FACTORY_RESET");
    banner("warn", "Factory-resetting and rebooting the dongle…");
    setTimeout(() => { disconnect(); banner("ok", "Factory reset complete — click <b>Connect</b> to reconnect to a clean device."); }, 1800);
  };
  $("c-reboot").onclick = () => send("CMD:REBOOT");
  $("c-export").onclick = async () => {
    const lines = dataLines(await send("CMD:EXPORT"));
    // The vault arrives as pwvault.0..N followed by pwvault.end=<bytes>. A
    // dropped line would otherwise be written to disk as a perfectly
    // innocent-looking backup that cannot restore your passwords, so refuse
    // to save an incomplete one.
    const chunks = lines.filter((l) => /^pwvault\.\d+=/.test(l));
    const endLine = lines.find((l) => /^pwvault\.end=/.test(l));
    if (chunks.length || endLine) {
      const indices = chunks.map((l) => parseInt(l.slice(8), 10)).sort((a, b) => a - b);
      const contiguous = indices.every((v, i) => v === i);
      if (!endLine || !contiguous || !indices.length) {
        alert("Export looks incomplete — the password vault did not arrive in full, "
            + "so this backup was NOT saved. Try again.");
        return;
      }
    }
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
    // Vault chunks must arrive in order; the dongle stages them and only
    // replaces the vault when pwvault.end matches the staged length, so a
    // truncated file leaves the existing vault untouched.
    for (const l of lines) await send("CMD:IMPORT_LINE," + l);
    await send("CMD:CONFIG_SAVE");
    refreshMacros(); refreshRemaps(); refreshWifi();
    refreshAI(); refreshTemplates(); refreshModels();
    refreshNotes(); refreshPw(); refreshStorage(); refreshHotkeys();
    alert(`Imported ${lines.length} settings.`);
  };
  $("raw-send").onclick = () => { const v = $("raw").value.trim(); if (v) send(v); };
  $("raw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("raw-send").click(); });

  // --- Storage meters ---  (OK:STORAGE,pw=<u>/<m>,notes=<u>/<m>,...)
  async function refreshStorage() {
    const st = (await send("CMD:STORAGE"))[0] || "";
    const host = $("st-meters"), note = $("st-note");
    if (!st.startsWith("OK:STORAGE")) {
      host.innerHTML = "<p class='muted'>Storage info needs newer firmware.</p>";
      note.hidden = true; return;
    }
    const LABELS = { pw: "Passwords", notes: "Notes", wifi: "WiFi networks",
      tpl: "AI templates", models: "AI models", macros: "Macros",
      remaps: "Key remaps", rec: "Recorded macros" };
    host.innerHTML = "";
    let anyFull = false, anyWarn = false;
    for (const seg of st.slice(11).split(",")) {          // 11 = "OK:STORAGE,".length
      const eq = seg.indexOf("=");
      if (eq < 0) continue;
      const key = seg.slice(0, eq), sl = seg.slice(eq + 1).split("/");
      if (key === "wifi" && CLID.hasWifi === false) continue;   // no radio on this board
      const max = parseInt(sl[1], 10) || 0;
      const locked = sl[0] === "locked";
      const used = locked ? 0 : (parseInt(sl[0], 10) || 0);
      const pct = max ? Math.min(100, Math.round(used / max * 100)) : 0;
      const isFull = !locked && max > 0 && used >= max;
      const isWarn = !locked && !isFull && pct >= 80;
      if (isFull) anyFull = true; else if (isWarn) anyWarn = true;
      const cls = isFull ? " full" : (isWarn ? " warn" : "");
      const div = document.createElement("div");
      div.className = "meter" + (locked ? " locked" : "");
      div.innerHTML =
        '<div class="meter-top"><span class="meter-label"></span><span class="meter-val"></span></div>' +
        '<div class="meter-bar"><div class="meter-fill' + cls + '" style="width:' + (locked ? 0 : pct) + '%"></div></div>';
      div.querySelector(".meter-label").textContent = LABELS[key] || key;
      div.querySelector(".meter-val").textContent = locked ? "🔒 unlock to view" : (used + " / " + max);
      host.appendChild(div);
    }
    if (anyFull) { note.textContent = "⚠ A store is full — delete entries or export a backup before adding more."; note.hidden = false; }
    else if (anyWarn) { note.textContent = "Some stores are getting full."; note.hidden = false; }
    else note.hidden = true;
  }
  $("st-refresh").onclick = refreshStorage;

  refreshMacros();
  refreshRemaps();
  //--------------------------------------------------------------------
  // Bluetooth keyboards (protocol 2)
  //--------------------------------------------------------------------
  function btesc(s) {
    return String(s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }


  //-- Shortcuts (hotkeys) ----------------------------------------------------
  // Keys are chosen from a list rather than typed as keycodes: nobody knows
  // that CapsLock is 0x39. The same names are used for the trigger and the
  // action, so the two pickers stay consistent.
  const HK_KEYS = [
    ["Space", 0x2C], ["Enter", 0x28], ["Escape", 0x29], ["Tab", 0x2B],
    ["Backspace", 0x2A], ["CapsLock", 0x39],
    ["Up", 0x52], ["Down", 0x51], ["Left", 0x50], ["Right", 0x4F],
  ];
  for (let i = 0; i < 26; i++) HK_KEYS.push([String.fromCharCode(65 + i), 0x04 + i]);
  for (let i = 1; i <= 9; i++)  HK_KEYS.push([String(i), 0x1D + i]);
  HK_KEYS.push(["0", 0x27]);
  for (let i = 1; i <= 12; i++) HK_KEYS.push(["F" + i, 0x39 + i]);

  const HK_MEDIA = [
    ["Volume up", 0xE9], ["Volume down", 0xEA], ["Mute", 0xE2],
    ["Play/Pause", 0xCD], ["Next track", 0xB5], ["Previous track", 0xB6],
    ["Stop", 0xB7],
  ];
  const HK_MODS = [["Ctrl", 0x01], ["Shift", 0x02], ["Alt", 0x04], ["Cmd/Win", 0x08]];

  function hkFillKeys(sel) {
    sel.innerHTML = "";
    for (const [name, code] of HK_KEYS) {
      const o = document.createElement("option");
      o.value = String(code); o.textContent = name;
      sel.appendChild(o);
    }
  }
  function hkFillMods(host, idPrefix) {
    host.innerHTML = "";
    for (const [name, bit] of HK_MODS) {
      const id = idPrefix + bit;
      const l = document.createElement("label");
      l.style.marginRight = ".5rem";
      l.innerHTML = `<input type="checkbox" id="${id}" value="${bit}"> ${name}`;
      host.appendChild(l);
    }
  }
  function hkReadMods(idPrefix) {
    let m = 0;
    for (const [, bit] of HK_MODS) {
      const el = $(idPrefix + bit);
      if (el && el.checked) m |= bit;
    }
    return m;
  }
  function hkKeyName(code) {
    const hit = HK_KEYS.find((k) => k[1] === code);
    return hit ? hit[0] : "0x" + code.toString(16);
  }
  function hkModsName(m) {
    return HK_MODS.filter(([, b]) => m & b).map(([n]) => n).join("+");
  }
  function hkCombo(mods, key) {
    const m = hkModsName(mods);
    return (m ? m + "+" : "") + hkKeyName(key);
  }

  async function refreshHotkeys() {
    const lines = await send("CMD:HOTKEY_LIST");
    const tb = $("hk-table").querySelector("tbody");
    tb.innerHTML = "";
    let n = 0;
    for (const l of lines) {
      const m = l.match(/^DATA:hk,(\d+),(\d+),(\w+),(.*)$/);
      if (!m) continue;
      n++;
      const tmods = +m[1], tkey = +m[2], kind = m[3], rest = m[4];
      let does = rest;
      if (kind === "chord") {
        const [am, ak] = rest.split(",").map(Number);
        does = "Send " + hkCombo(am, ak);
      } else if (kind === "media") {
        const hit = HK_MEDIA.find((x) => x[1] === +rest);
        does = "Media: " + (hit ? hit[0] : rest);
      } else if (kind === "macro") { does = "Macro " + rest; }
      else { does = "Recording " + rest; }
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><code>${hkCombo(tmods, tkey)}</code></td><td>${does}</td><td></td>`;
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        await send(`CMD:HOTKEY_DELETE,${tmods},${tkey}`);
        await send("CMD:CONFIG_SAVE");
        refreshHotkeys();
      };
      tr.children[2].appendChild(del);
      tb.appendChild(tr);
    }
    $("hk-empty").hidden = n > 0;
  }

  async function refreshBt() {
    if (CLID.hasBt === false) {
      $("bt-nobt").hidden = false;
      $("bt-status").hidden = true;
      $("bt-scan").disabled = true;
      return;
    }
    const st = await send("CMD:BT_STATUS");
    const p = (st[0] || "").split(",");   // OK:BT,<has>,<state>,<found>,<bonded>
    const parked = p[2] === "parked-usb";
    $("bt-status").textContent = p[1] !== "1" ? "unavailable"
      : parked
        ? `paused — a USB keyboard is plugged into the dongle (${p[4] || 0} bonded)`
        : `radio on · ${p[2] || "?"} · ${p[4] || 0} bonded`;
    // While a USB keyboard is attached, BT stays parked by policy: only one
    // keyboard source at a time. Unplug it and the watch resumes by itself.
    $("bt-scan").disabled = parked;
    // A keyboard can be connected WITHOUT a bond (devices that refuse
    // pairing but accept a plain HID connection) — it then has no row in
    // the paired table, so offer a disconnect here whenever a link is up.
    $("bt-active").hidden = p[2] !== "connected";
    setAiRadioLock(p[2] === "connected");
    const lines = await send("CMD:BT_LIST");
    const tb = $("bt-paired").querySelector("tbody");
    tb.innerHTML = "";
    let n = 0;
    for (const l of lines) {
      const m = l.match(/^DATA:bt,(\d+),([^,]+),(.*),(\d),(\d)$/);
      if (!m) continue;
      n++;
      const [, idx, addr, name, connected, auto] = m;
      const tr = document.createElement("tr");
      // Actions wrap inside the cell — a nowrap row overflowed the panel.
      tr.innerHTML =
        `<td>${connected === "1" ? "●" : "○"} <b>${btesc(name)}</b><br>
           <span class="muted" style="font-size:.8rem">${btesc(addr)}</span></td>
         <td>
           <div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end;align-items:center">
             ${connected === "1"
               ? `<button data-bt="disconnect">Disconnect</button>`
               : `<button data-bt="connect" data-i="${idx}">Connect</button>`}
             <button data-bt="rename" data-i="${idx}" data-n="${btesc(name)}">Rename</button>
             <button data-bt="forget" data-i="${idx}" data-n="${btesc(name)}">Forget</button>
             <label style="white-space:nowrap"><input type="checkbox" data-bt="auto"
               data-i="${idx}" ${auto === "1" ? "checked" : ""}> auto</label>
           </div>
         </td>`;
      tb.appendChild(tr);
    }
    $("bt-paired-empty").hidden = n > 0;
  }

  $("bt-refresh").onclick = refreshBt;
  $("bt-disc-now").onclick = async () => { await send("CMD:BT_DISCONNECT"); refreshBt(); };

  hkFillKeys($("hk-tkey"));
  hkFillKeys($("hk-akey"));
  hkFillMods($("hk-tmods"), "hk-tm");
  hkFillMods($("hk-amods"), "hk-am");
  {
    const sel = $("hk-media");
    for (const [name, usage] of HK_MEDIA) {
      const o = document.createElement("option");
      o.value = String(usage); o.textContent = name;
      sel.appendChild(o);
    }
  }
  $("hk-kind").onchange = () => {
    const k = $("hk-kind").value;
    $("hk-chord-wrap").hidden = k !== "chord";
    $("hk-media-wrap").hidden = k !== "media";
    $("hk-name-wrap").hidden = !(k === "macro" || k === "rec");
  };
  $("hk-refresh").onclick = () => refreshHotkeys();
  $("hk-capture").onclick = async () => {
    const r = (await send("CMD:HOTKEY_CAPTURE"))[0] || "";
    if (r.startsWith("ERR:")) { alert(r.slice(4)); return; }
    alert("On your keyboard: press the shortcut, then press what it should do.\n\n"
        + "Click into a text field first — the dongle types its prompts there.\n"
        + "Esc cancels; it gives up after 60 seconds.");
    for (let i = 0; i < 30; i++) {
      await new Promise((r2) => setTimeout(r2, 1000));
      const before = $("hk-table").querySelector("tbody").children.length;
      await refreshHotkeys();
      if ($("hk-table").querySelector("tbody").children.length !== before) break;
    }
    await send("CMD:CONFIG_SAVE");
    refreshHotkeys();
  };
  $("hk-add").onclick = async () => {
    const tm = hkReadMods("hk-tm"), tk = $("hk-tkey").value;
    const kind = $("hk-kind").value;
    let cmd = `CMD:HOTKEY_ADD,${tm},${tk},${kind},`;
    if (kind === "chord")      cmd += `${hkReadMods("hk-am")},${$("hk-akey").value}`;
    else if (kind === "media") cmd += $("hk-media").value;
    else {
      const nm = $("hk-name").value.trim();
      if (!nm) { alert("Enter the macro trigger or recording name."); return; }
      cmd += nm;
    }
    const r = (await send(cmd))[0] || "";
    if (r.startsWith("ERR:")) { alert(r.slice(4)); return; }
    await send("CMD:CONFIG_SAVE");
    $("hk-name").value = "";
    refreshHotkeys();
  };
  $("bt-scan").onclick = async () => {
    $("bt-nearby").querySelector("tbody").innerHTML = "";
    await send("CMD:BT_SCAN");
  };

  $("bt-paired").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-bt]");
    if (!b) return;
    const i = b.dataset.i;
    switch (b.dataset.bt) {
      case "connect":    await send("CMD:BT_CONNECT," + i); break;
      case "disconnect": await send("CMD:BT_DISCONNECT"); break;
      case "forget":
        if (confirm(`Forget "${b.dataset.n}"? It will need to be paired again.`))
          await send("CMD:BT_FORGET," + i);
        break;
      case "rename": {
        const name = prompt("New name:", b.dataset.n);
        if (name) await send(`CMD:BT_RENAME,${i},${name}`);
        break;
      }
    }
    refreshBt();
  });
  $("bt-paired").addEventListener("change", async (e) => {
    const cb = e.target.closest('input[data-bt="auto"]');
    if (cb) { await send(`CMD:BT_AUTO,${cb.dataset.i},${cb.checked ? 1 : 0}`); refreshBt(); }
  });

  // Delegate on the whole section: the nearby rows are (re)built from BT:SCAN
  // events, so binding to the table body alone was fragile.
  $("bt-section").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-pair]");
    if (!b) return;
    CLID.log("[ui] pair clicked for scan index " + b.dataset.pair, "dbg");
    await send("CMD:BT_PAIR," + b.dataset.pair);
  });

  // Unsolicited BT: events keep the panel live (doc 04 §4).
  CLID.onLine((line) => {
    if (!line.startsWith("BT:")) return;
    const p = line.split(",");
    if (line.startsWith("BT:SCAN,")) {
      // BT:SCAN,<idx>,<addr>,<rssi>,<name>
      const [, idx, addr, rssi, ...nm] = p;
      const name = nm.join(",");
      const tb = $("bt-nearby").querySelector("tbody");
      let tr = tb.querySelector(`tr[data-idx="${idx}"]`);
      if (!tr) { tr = document.createElement("tr"); tr.dataset.idx = idx; tb.appendChild(tr); }
      tr.innerHTML =
        `<td><b>${btesc(name)}</b> <span class="muted">${btesc(addr)} · ${btesc(rssi)} dBm</span></td>
         <td style="text-align:right"><button class="primary" data-pair="${idx}">Pair</button></td>`;
    } else if (line.startsWith("BT:PASSKEY,")) {
      const digits = (p[1] || "").split("").join(" ");
      $("bt-passkey").innerHTML =
        `Type this on the <b>new keyboard</b>, then press Enter: <b style="letter-spacing:.2em">${btesc(digits)}</b>`;
      $("bt-passkey").hidden = false;
    } else if (line.startsWith("BT:PAIRED") || line.startsWith("BT:PAIR_FAIL") ||
               line.startsWith("BT:CONNECTED") || line.startsWith("BT:DISCONNECTED") ||
               line.startsWith("BT:FORGOTTEN") || line.startsWith("BT:WATCHING")) {
      if (!line.startsWith("BT:PAIR_RETRY")) $("bt-passkey").hidden = true;
      refreshBt();
    }
  });

  refreshWifi();
  refreshAI();
  refreshTemplates();
  refreshModels();
  refreshNotes();
  refreshPw();
  refreshRec();
  refreshBt();
  refreshHotkeys();
})();
