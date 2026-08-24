import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { el } from "../lib/dom";
import { isInsideAdobe } from "../lib/cep";

const fs = window.cep_node?.require("fs") as typeof import("fs") | undefined;
const path = window.cep_node?.require("path") as typeof import("path") | undefined;
const os = window.cep_node?.require("os") as typeof import("os") | undefined;
const proc = window.cep_node?.require("process") as NodeJS.Process | undefined;

const EXTENDSCRIPT_COMPAT_HELPERS = [
  'function __mcpEscapeString(value) {',
  '    var text = String(value);',
  '    var backslash = String.fromCharCode(92);',
  '    var out = "";',
  '    for (var i = 0; i < text.length; i++) {',
  '        var code = text.charCodeAt(i);',
  '        if (code === 34) { out += backslash + String.fromCharCode(34); }',
  '        else if (code === 92) { out += backslash + backslash; }',
  '        else if (code === 8) { out += backslash + "b"; }',
  '        else if (code === 9) { out += backslash + "t"; }',
  '        else if (code === 10) { out += backslash + "n"; }',
  '        else if (code === 12) { out += backslash + "f"; }',
  '        else if (code === 13) { out += backslash + "r"; }',
  '        else if (code < 32 || code === 0x2028 || code === 0x2029) {',
  '            var hex = code.toString(16);',
  '            while (hex.length < 4) { hex = "0" + hex; }',
  '            out += backslash + "u" + hex;',
  '        }',
  '        else { out += text.charAt(i); }',
  '    }',
  '    return out;',
  '}',
  'var __mcpOwnProperty = Object.prototype.hasOwnProperty;',
  'function __mcpStringify(value) {',
  '    if (value === null) return "null";',
  '    var valueType = typeof value;',
  '    if (valueType === "string") return "\\"" + __mcpEscapeString(value) + "\\"";',
  '    if (valueType === "number") return isFinite(value) ? String(value) : "null";',
  '    if (valueType === "boolean") return value ? "true" : "false";',
  '    if (value instanceof Array) {',
  '        var arrayParts = [];',
  '        for (var i = 0; i < value.length; i++) {',
  '            arrayParts.push(__mcpStringify(value[i]));',
  '        }',
  '        return "[" + arrayParts.join(",") + "]";',
  '    }',
  '    if (valueType === "object") {',
  '        var objectParts = [];',
  '        for (var key in value) {',
  '            var isOwn = true;',
  '            try { isOwn = __mcpOwnProperty.call(value, key); } catch (ownError) { isOwn = true; }',
  '            if (!isOwn) continue;',
  '            var member;',
  '            try { member = value[key]; } catch (readError) { continue; }',
  '            if (typeof member === "undefined" || typeof member === "function") continue;',
  '            objectParts.push(__mcpStringify(String(key)) + ":" + __mcpStringify(member));',
  '        }',
  '        return "{" + objectParts.join(",") + "}";',
  '    }',
  '    return "null";',
  '}',
  'if (typeof JSON === "undefined") { JSON = {}; }',
  'JSON.stringify = __mcpStringify;',
  'function __mcpParse(text) {',
  '  var source = String(text);',
  '  var at = 0;',
  '  function fail(what) {',
  '    throw new Error("JSON.parse: " + what + " at position " + at);',
  '  }',
  '  function skipWhitespace() {',
  '    while (at < source.length) {',
  '      var code = source.charCodeAt(at);',
  '      if (code === 32 || code === 9 || code === 10 || code === 13) { at++; } else { break; }',
  '    }',
  '  }',
  '  function expect(code) {',
  '    if (source.charCodeAt(at) !== code) fail("expected character " + code);',
  '    at++;',
  '  }',
  '  function parseString() {',
  '    expect(34);',
  '    var out = "";',
  '    while (at < source.length) {',
  '      var code = source.charCodeAt(at);',
  '      if (code === 34) { at++; return out; }',
  '      if (code === 92) {',
  '        at++;',
  '        var esc = source.charCodeAt(at);',
  '        at++;',
  '        if (esc === 34) { out += String.fromCharCode(34); }',
  '        else if (esc === 92) { out += String.fromCharCode(92); }',
  '        else if (esc === 47) { out += "/"; }',
  '        else if (esc === 98) { out += String.fromCharCode(8); }',
  '        else if (esc === 102) { out += String.fromCharCode(12); }',
  '        else if (esc === 110) { out += String.fromCharCode(10); }',
  '        else if (esc === 114) { out += String.fromCharCode(13); }',
  '        else if (esc === 116) { out += String.fromCharCode(9); }',
  '        else if (esc === 117) {',
  '          var hex = source.substr(at, 4);',
  '          if (hex.length !== 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) fail("bad unicode escape");',
  '          out += String.fromCharCode(parseInt(hex, 16));',
  '          at += 4;',
  '        }',
  '        else fail("bad escape");',
  '        continue;',
  '      }',
  '      if (code < 32) fail("unescaped control character");',
  '      out += source.charAt(at);',
  '      at++;',
  '    }',
  '    fail("unterminated string");',
  '  }',
  '  function parseNumber() {',
  '    var start = at;',
  '    if (source.charCodeAt(at) === 45) at++;',
  '    while (at < source.length && source.charCodeAt(at) >= 48 && source.charCodeAt(at) <= 57) at++;',
  '    if (source.charCodeAt(at) === 46) {',
  '      at++;',
  '      while (at < source.length && source.charCodeAt(at) >= 48 && source.charCodeAt(at) <= 57) at++;',
  '    }',
  '    var exponent = source.charCodeAt(at);',
  '    if (exponent === 101 || exponent === 69) {',
  '      at++;',
  '      var sign = source.charCodeAt(at);',
  '      if (sign === 43 || sign === 45) at++;',
  '      while (at < source.length && source.charCodeAt(at) >= 48 && source.charCodeAt(at) <= 57) at++;',
  '    }',
  '    var literal = source.substring(start, at);',
  '    if (!/^-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][-+]?[0-9]+)?$/.test(literal)) fail("bad number");',
  '    return Number(literal);',
  '  }',
  '  function parseWord() {',
  '    if (source.substr(at, 4) === "true") { at += 4; return true; }',
  '    if (source.substr(at, 5) === "false") { at += 5; return false; }',
  '    if (source.substr(at, 4) === "null") { at += 4; return null; }',
  '    fail("unexpected token");',
  '  }',
  '  function parseValue() {',
  '    skipWhitespace();',
  '    var code = source.charCodeAt(at);',
  '    if (code === 34) return parseString();',
  '    if (code === 123) {',
  '      at++;',
  '      var object = {};',
  '      skipWhitespace();',
  '      if (source.charCodeAt(at) === 125) { at++; return object; }',
  '      for (;;) {',
  '        skipWhitespace();',
  '        var key = parseString();',
  '        skipWhitespace();',
  '        expect(58);',
  '        var member = parseValue();',
  '        if (key === "__proto__") {',
  '          if (typeof Object.defineProperty === "function") {',
  '            try {',
  '              Object.defineProperty(object, key, {',
  '                value: member, enumerable: true, writable: true, configurable: true',
  '              });',
  '            } catch (defineError) {}',
  '          }',
  '        } else {',
  '          object[key] = member;',
  '        }',
  '        skipWhitespace();',
  '        if (source.charCodeAt(at) === 44) { at++; continue; }',
  '        expect(125);',
  '        return object;',
  '      }',
  '    }',
  '    if (code === 91) {',
  '      at++;',
  '      var array = [];',
  '      skipWhitespace();',
  '      if (source.charCodeAt(at) === 93) { at++; return array; }',
  '      for (;;) {',
  '        array.push(parseValue());',
  '        skipWhitespace();',
  '        if (source.charCodeAt(at) === 44) { at++; continue; }',
  '        expect(93);',
  '        return array;',
  '      }',
  '    }',
  '    if (code === 45 || (code >= 48 && code <= 57)) return parseNumber();',
  '    return parseWord();',
  '  }',
  '  var result = parseValue();',
  '  skipWhitespace();',
  '  if (at < source.length) fail("unexpected trailing content");',
  '  return result;',
  '}',
  'JSON.parse = __mcpParse;'
].join('\n');

function getDefaultTempPath(): string {
  if (!os || !path) return "";
  const base = (os.platform() === 'win32') ? (proc?.env?.TEMP || proc?.env?.TMP || 'C:\\Temp') : '/tmp';
  return path.join(base, 'premiere-mcp-bridge');
}

function getPanelConfigPath(): string {
  if (!os || !path || !fs) return "";
  const home = proc?.env?.USERPROFILE || os.homedir() || "C:\\";
  const configDir = path.join(home, '.premiere-mcp-bridge');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'config.json');
}

function ensureDirectory(dirPath: string) {
  if (!dirPath || !fs || !path) return null;
  const resolvedPath = path.resolve(dirPath);
  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }
  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error('Temp path is not a directory: ' + resolvedPath);
  }
  return resolvedPath;
}

interface CommandItem {
  id: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  script: string;
}

interface LogItem {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

class MCPPremiereBridge {
  public isConnected = false;
  public tempDirectory = '';
  public commandQueue: CommandItem[] = [];
  public logs: LogItem[] = [];
  public isProcessing = false;
  private pollIntervalId: any = null;
  private csInterface = (window as any).__adobe_cep__;
  private onStateChange: () => void = () => {};

  constructor() {
    this.loadConfig();
  }

  public bindListener(cb: () => void) {
    this.onStateChange = cb;
  }

  public log(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push({ timestamp, message, level });
    if (this.logs.length > 100) this.logs.shift();
    this.onStateChange();
    console.log(`[MCP-Bridge] ${message}`);
  }

  private loadConfig() {
    try {
      if (!fs) return;
      const configPath = getPanelConfigPath();
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.tempDirectory) {
          this.tempDirectory = config.tempDirectory;
        }
      }
      if (!this.tempDirectory) {
        this.tempDirectory = getDefaultTempPath();
      }
    } catch (e) {
      this.log('Error loading config: ' + (e as Error).message, 'error');
    }
  }

  public saveConfig(newPath: string) {
    try {
      this.tempDirectory = newPath;
      if (fs) {
        const ensuredDir = ensureDirectory(this.tempDirectory);
        if (!ensuredDir) throw new Error('Could not create temp directory');
        fs.writeFileSync(path!.join(ensuredDir, 'config.json'), JSON.stringify({ tempDirectory: this.tempDirectory }, null, 2));
        fs.writeFileSync(getPanelConfigPath(), JSON.stringify({ tempDirectory: this.tempDirectory }, null, 2));
      }
      this.log('Configuration saved successfully.', 'info');
    } catch (e) {
      this.log('Error saving config: ' + (e as Error).message, 'error');
    }
  }

  public startBridge() {
    if (this.isConnected) return;
    this.log('Starting MCP Bridge...', 'info');
    
    try {
      if (fs) {
        const ensured = ensureDirectory(this.tempDirectory);
        if (!ensured) throw new Error('Failed to access temp directory');
      }
      this.isConnected = true;
      this.isProcessing = false;
      this.startCommandPolling();
      this.log('Bridge started. Listening in: ' + this.tempDirectory, 'info');
      this.testPremiereConnection();
    } catch (e) {
      this.isConnected = false;
      this.log('Could not start bridge: ' + (e as Error).message, 'error');
    }
  }

  public stopBridge() {
    if (!this.isConnected) return;
    this.log('Stopping MCP Bridge...', 'info');
    this.isConnected = false;
    this.isProcessing = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.onStateChange();
  }

  private startCommandPolling() {
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    this.pollIntervalId = setInterval(() => {
      if (this.isConnected && !this.isProcessing) {
        this.pollFolder();
      }
    }, 250);
  }

  private pollFolder() {
    if (!fs || !path) return;
    try {
      const resolved = ensureDirectory(this.tempDirectory);
      if (!resolved) return;
      const files = fs.readdirSync(resolved);
      for (const file of files) {
        if (file.startsWith('command-') && file.endsWith('.json')) {
          this.processCommandFile(path.join(resolved, file));
          return; // Process one command at a time
        }
      }
    } catch (e) {
      this.log('Error polling directory: ' + (e as Error).message, 'error');
    }
  }

  private writeResponseAtomic(responseFile: string, payload: any) {
    if (!fs) return;
    const staging = responseFile + '.part';
    fs.writeFileSync(staging, JSON.stringify(payload, null, 2));
    fs.renameSync(staging, responseFile);
  }

  private processCommandFile(filePath: string) {
    if (!fs || !path) return;
    this.isProcessing = true;
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const command = JSON.parse(fileContent);
      this.log('Processing command ID: ' + command.id, 'info');
      
      this.commandQueue.push({
        id: command.id,
        status: 'pending',
        script: (command.script || '').substring(0, 45) + '...'
      });
      if (this.commandQueue.length > 20) this.commandQueue.shift();

      this.updateCommandStatus(command.id, 'executing');
      
      this.executeExtendScript(command.script, (err, result) => {
        const responseFile = filePath.replace('command-', 'response-');
        try {
          if (err) {
            this.writeResponseAtomic(responseFile, { success: false, error: err.message, timestamp: new Date().toISOString() });
            this.updateCommandStatus(command.id, 'failed');
            this.log('Command failed: ' + err.message, 'error');
          } else {
            this.writeResponseAtomic(responseFile, { success: true, result: result, timestamp: new Date().toISOString() });
            this.updateCommandStatus(command.id, 'completed');
            this.log('Command completed successfully.', 'info');
          }
          try { fs.unlinkSync(filePath); } catch (_) {}
        } catch (eWrite) {
          this.log('Error writing response: ' + (eWrite as Error).message, 'error');
        }
        this.isProcessing = false;
      }, command.timeoutMs);
    } catch (e) {
      this.log('Error loading command file: ' + (e as Error).message, 'error');
      try {
        const responseFile = filePath.replace('command-', 'response-');
        this.writeResponseAtomic(responseFile, { success: false, error: (e as Error).message, timestamp: new Date().toISOString() });
        try { fs.unlinkSync(filePath); } catch (_) {}
      } catch (_) {}
      this.isProcessing = false;
    }
  }

  private updateCommandStatus(commandId: string, status: CommandItem['status']) {
    for (const cmd of this.commandQueue) {
      if (cmd.id === commandId) {
        cmd.status = status;
        break;
      }
    }
    this.onStateChange();
  }

  private executeExtendScript(script: string, callback: (err: Error | null, res: any) => void, requestedTimeoutMs?: number) {
    if (!this.csInterface) {
      callback(new Error('CSInterface is not active in browser preview mode.'), null);
      return;
    }

    const fullScript = EXTENDSCRIPT_COMPAT_HELPERS + '\n' + script;
    let settled = false;
    let timeoutMs = 45000;
    if (typeof requestedTimeoutMs === 'number' && requestedTimeoutMs > timeoutMs) {
      timeoutMs = requestedTimeoutMs;
    }

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      callback(new Error('ExtendScript execution timed out after ' + timeoutMs + 'ms.'), null);
    }, timeoutMs);

    this.csInterface.evalScript(fullScript, (result: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      if (result === 'EvalScript error.' || result === 'EvalScript error') {
        callback(new Error('ExtendScript evaluation failed inside Adobe.'), null);
        return;
      }

      if (typeof result === 'string' && result.indexOf('Error') === 0) {
        callback(new Error(result), null);
        return;
      }

      try {
        const parsed = JSON.parse(result);
        callback(null, parsed);
      } catch (_) {
        callback(null, result);
      }
    });
  }

  public testPremiereConnection() {
    this.log('Testing Premiere Pro connection...', 'info');
    const testScript = '(function(){ try { return JSON.stringify({ ok: true, appVersion: app.version, projectName: (app.project && app.project.name) ? app.project.name : "No project open" }); } catch(e){ return JSON.stringify({ error: String(e) }); } })();';
    this.executeExtendScript(testScript, (err, res) => {
      if (err) {
        this.log('Premiere connection failed: ' + err.message, 'error');
      } else {
        this.log('Premiere connection successful. Active project: ' + (res.projectName || 'None'), 'info');
      }
    });
  }

  public runDiagnostics() {
    this.log('Running diagnostics sweep...', 'info');
    const scripts = [
      { name: 'App Version check', code: 'app.version' },
      { name: 'Active Project check', code: 'app.project ? app.project.name : "null"' },
      { name: 'Active Sequence check', code: 'app.project.activeSequence ? app.project.activeSequence.name : "null"' }
    ];

    let index = 0;
    const runNext = () => {
      if (index >= scripts.length) {
        this.log('Diagnostics completed.', 'info');
        return;
      }
      const item = scripts[index];
      this.executeExtendScript(`(function(){ try { return ""+(${item.code}); } catch(e){ return "Err: "+e.message; } })()`, (err, res) => {
        if (err) {
          this.log(`Diagnostic "${item.name}" failed: ${err.message}`, 'error');
        } else {
          this.log(`Diagnostic "${item.name}" result: ${res}`, 'info');
        }
        index++;
        runNext();
      });
    };
    runNext();
  }
}

// Persist the bridge between navigation mounts
let activeBridge: MCPPremiereBridge | null = null;

export function MCPBridgePage(): HTMLElement {
  if (!activeBridge) {
    activeBridge = new MCPPremiereBridge();
  }

  const root = el("div.saad-curves-container");
  let inputEl: HTMLInputElement;

  function render() {
    const bridge = activeBridge!;
    const hostAvailable = isInsideAdobe();

    root.replaceChildren();

    // 1. Header
    root.appendChild(Header());
    root.appendChild(PageHeader("MCP Bridge"));

    // 2. Main content container
    const mainContent = el("div.saad-curves-layout", { style: { padding: "16px", display: "flex", flexDirection: "column", gap: "16px" } });

    // Status Panel
    const statusGrid = el("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        marginBottom: "8px"
      }
    },
      el("div.meta-card", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "12px", background: "rgba(20,31,41,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" } },
        el("span", { style: { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#6e8393" } }, "Bridge Status"),
        el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
          el("span", {
            style: {
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: bridge.isConnected ? "#10b981" : "#ef4444",
              boxShadow: bridge.isConnected ? "0 0 10px #10b981" : "none"
            }
          }),
          el("span", { style: { fontSize: "13px", fontWeight: "600" } }, bridge.isConnected ? "CONNECTED" : "DISCONNECTED")
        )
      ),
      el("div.meta-card", { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "12px", background: "rgba(20,31,41,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" } },
        el("span", { style: { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#6e8393" } }, "Premiere Pro Connection"),
        el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
          el("span", {
            style: {
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: (bridge.isConnected && hostAvailable) ? "#10b981" : "#ef4444",
              boxShadow: (bridge.isConnected && hostAvailable) ? "0 0 10px #10b981" : "none"
            }
          }),
          el("span", { style: { fontSize: "13px", fontWeight: "600" } }, (bridge.isConnected && hostAvailable) ? "READY" : "OFFLINE")
        )
      )
    );
    mainContent.appendChild(statusGrid);

    // Configuration Card
    inputEl = el("input", {
      type: "text",
      value: bridge.tempDirectory,
      placeholder: "e.g. C:\\Users\\PC\\AppData\\Local\\Temp\\premiere-mcp-bridge",
      style: {
        width: "100%",
        padding: "10px 12px",
        background: "rgba(10,18,26,0.8)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "6px",
        color: "#fff",
        fontSize: "13px",
        marginTop: "6px"
      }
    }) as HTMLInputElement;

    const configCard = el("div.saad-curves-presets", { style: { padding: "16px", background: "rgba(20, 31, 41, 0.4)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" } },
      el("div", { style: { fontSize: "12px", color: "#9cb2c3", marginBottom: "12px" } }, 
        "This shared folder acts as the communications bridge between your AI client and Premiere. It must match your client's PREMIERE_TEMP_DIR environment variable."
      ),
      el("label", { style: { fontSize: "11px", color: "#6e8393", fontWeight: "bold", textTransform: "uppercase" } }, "Bridge Temp Directory"),
      inputEl,
      el("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
        el("button.btn-secondary", {
          onClick: () => {
            bridge.saveConfig(inputEl.value);
            render();
          },
          style: { padding: "8px 16px", fontSize: "12px" }
        }, "Save Directory"),
        el("button.btn-secondary", {
          onClick: () => {
            inputEl.value = getDefaultTempPath();
            bridge.saveConfig(inputEl.value);
            render();
          },
          style: { padding: "8px 16px", fontSize: "12px", opacity: "0.8" }
        }, "Reset Default")
      )
    );
    mainContent.appendChild(configCard);

    // Controls Panel
    const controlsCard = el("div.saad-curves-presets", { style: { display: "flex", gap: "10px", padding: "16px", background: "rgba(20, 31, 41, 0.4)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" } },
      el("button.btn-primary", {
        disabled: bridge.isConnected,
        onClick: () => {
          bridge.saveConfig(inputEl.value);
          bridge.startBridge();
          render();
        },
        style: { flex: 1, padding: "12px" }
      }, "Start Bridge"),
      el("button.btn-secondary", {
        disabled: !bridge.isConnected,
        onClick: () => {
          bridge.stopBridge();
          render();
        },
        style: { flex: 1, padding: "12px" }
      }, "Stop Bridge"),
      el("button.btn-secondary", {
        onClick: () => {
          bridge.runDiagnostics();
        },
        style: { padding: "12px", display: "flex", alignItems: "center" }
      }, "Run Diagnostics")
    );
    mainContent.appendChild(controlsCard);

    // Command Queue Card
    const commandList = el("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } });
    if (bridge.commandQueue.length === 0) {
      commandList.appendChild(el("div", { style: { fontSize: "12px", color: "#6e8393", fontStyle: "italic", textAlign: "center", padding: "12px" } }, "No commands received in this session."));
    } else {
      bridge.commandQueue.slice(-5).reverse().forEach(cmd => {
        commandList.appendChild(el("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(10,18,26,0.4)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px"
          }
        },
          el("span", { style: { fontFamily: "monospace", color: "#e0e0e0" } }, cmd.script),
          el("span", {
            style: {
              fontSize: "10px",
              fontWeight: "bold",
              padding: "2px 6px",
              borderRadius: "4px",
              background: cmd.status === 'completed' ? "rgba(16,185,129,0.15)" : cmd.status === 'executing' ? "rgba(59,130,246,0.15)" : cmd.status === 'failed' ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              color: cmd.status === 'completed' ? "#10b981" : cmd.status === 'executing' ? "#3b82f6" : cmd.status === 'failed' ? "#ef4444" : "#f59f0b"
            }
          }, cmd.status.toUpperCase())
        ));
      });
    }

    const queueCard = el("div.saad-curves-presets", { style: { padding: "16px", background: "rgba(20, 31, 41, 0.4)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" } },
      el("div", { style: { fontSize: "11px", color: "#6e8393", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" } }, "Command Queue"),
      commandList
    );
    mainContent.appendChild(queueCard);

    // Logs Card
    const logsContainer = el("div", {
      style: {
        maxHeight: "150px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        background: "rgba(8,15,22,0.8)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "6px",
        padding: "8px"
      }
    });

    if (bridge.logs.length === 0) {
      logsContainer.appendChild(el("div", { style: { fontSize: "11px", color: "#6e8393", textAlign: "center", padding: "8px" } }, "Bridge log empty."));
    } else {
      bridge.logs.forEach(log => {
        logsContainer.appendChild(el("div", {
          style: {
            fontSize: "11px",
            fontFamily: "monospace",
            lineHeight: "1.4",
            borderLeft: `2.5px solid ${log.level === 'error' ? '#ef4444' : log.level === 'warning' ? '#f59f0b' : '#3b82f6'}`,
            paddingLeft: "6px",
            color: log.level === 'error' ? "#fca5a5" : log.level === 'warning' ? "#fde047" : "#cbd5e1"
          }
        }, `[${log.timestamp}] ${log.message}`));
      });
      setTimeout(() => {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }, 50);
    }

    const logsCard = el("div.saad-curves-presets", { style: { padding: "16px", background: "rgba(20, 31, 41, 0.4)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" } },
      el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
        el("div", { style: { fontSize: "11px", color: "#6e8393", fontWeight: "bold", textTransform: "uppercase" } }, "Activity Log"),
        el("button.btn-secondary", {
          onClick: () => {
            bridge.logs = [];
            render();
          },
          style: { padding: "2px 8px", fontSize: "10px" }
        }, "Clear")
      ),
      logsContainer
    );
    mainContent.appendChild(logsCard);

    root.appendChild(mainContent);
  }

  activeBridge.bindListener(render);
  render();

  return root;
}
