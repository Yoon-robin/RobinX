// 사이트 첫 화면의 실제 앱 시연. 앱 코드(src/main.tsx)보다 먼저 읽힌다 (vite.config.mjs).
// 1) 엔진 대신 가짜 응답을 준다. 실제 PC를 읽거나 바꾸는 일은 없다 (브라우저 안이라 할 수도 없다).
// 2) tour.js가 화면을 차례로 눌러 가며 남은 흔적 정리 → 저장공간 → 시작프로그램 → 복구 기록을 보여 준다.
import {
  appList,
  backups as savedBackups,
  icons,
  leftovers,
  now,
  removed,
  startup as startupItems,
  storage,
} from "./data.mjs"
import { runTour } from "./tour.js"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 사이트와 같은 출처라서, 앱이 저장하는 설정(테마 등)이 사이트 쪽 저장소에 남지 않게 메모리에만 둔다
try {
  const mem = new Map()
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => void mem.set(k, String(v)),
      removeItem: (k) => void mem.delete(k),
      clear: () => mem.clear(),
      key: (i) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size
      },
    },
  })
} catch {
  // 바꾸지 못하면 앱의 기본값(어두운 터미널 모양)을 그대로 쓴다
}

// ── 가짜 PC의 상태 (시연 중에 바뀐다) ─────────────────────────────
const installed = appList.filter((a) => a.id !== removed.id)
const store = [
  ["Microsoft.WindowsCalculator_8wekyb3d8bbwe", "계산기", "Microsoft Corporation", "store", "2026-03-04"],
  ["Microsoft.WindowsTerminal_8wekyb3d8bbwe", "터미널", "Microsoft Corporation", "store", "2026-08-11"],
  ["Contoso.LineApp_abc", "Contoso Line of Business", "Contoso, Inc.", "sideloaded", "2025-12-01"],
].map(([fam, name, publisher, source, date]) => ({
  id: "msix:" + fam.toLowerCase(),
  displayName: name,
  publisher,
  version: "11.2409.0.0",
  installDate: date,
  installLocation: null,
  familyName: fam,
  source,
}))
const backups = savedBackups.filter((op) => op.appName !== removed.displayName)
const startup = startupItems.map((s) => ({ ...s }))
const backupBytes = () =>
  backups.reduce((n, op) => n + op.items.reduce((m, i) => m + (i.status === "removed" ? (i.sizeBytes ?? 0) : 0), 0), 0)

// Tauri Channel로 진행 상황을 보낸다 (core.js의 Channel이 transformCallback으로 등록한 함수)
const channel = (ch) => {
  let index = 0
  return (message) => ch && window["_" + ch.id]?.({ message, index: index++ })
}

const handlers = {
  app_mode: () => "app",
  boot_info: () => ({
    user: "user",
    computer: "DESKTOP-DEMO",
    home: String.raw`C:\Users\user`,
    os: "Windows 11 Pro 25H2",
    build: "26200.6899",
    cpu: "AMD Ryzen 7 7700 8-Core Processor",
    threads: 16,
    memoryTotal: 34_359_738_368,
    memoryFree: 19_000_000_000,
    uptimeSecs: 11_520,
    systemDrive: "C:",
    diskTotal: 1_000e9,
    diskFree: 214e9,
    admin: false,
  }),
  list_installed_apps: () => installed,
  measure_app_sizes: () => ({}),
  get_app_icon: ({ id }) => icons[id] ?? null,
  list_store_apps: () => store,
  uninstall_command_preview: ({ id }) => installed.find((a) => a.id === id)?.uninstallCommand ?? "",
  recently_removed: () => [removed],
  scan_leftovers: async () => {
    await sleep(1600)
    return leftovers
  },
  clean_leftovers: async ({ appName, itemIds, onProgress }) => {
    const send = channel(onProgress)
    const items = leftovers.items.filter((i) => itemIds.includes(i.id))
    for (const [n, item] of items.entries()) {
      send({ files: n * 40, bytes: 0, done: n, total: items.length, current: item.location })
      await sleep(320)
    }
    const op = {
      id: `${now}000-demo`,
      appName,
      createdAt: Math.floor(Date.now() / 1000),
      items: items.map((i) => ({ ...i, status: "removed", error: null })),
    }
    backups.unshift(op)
    return op
  },
  list_backups: () => backups,
  backup_usage: () => ({ count: backups.length, bytes: backupBytes(), expired: 0 }),
  list_startup_items: () => startup,
  set_startup_enabled: async ({ id, enabled }) => {
    await sleep(160)
    const entry = startup.find((s) => s.id === id)
    Object.assign(entry, { enabled, disabledAt: enabled ? null : Math.floor(Date.now() / 1000), changedByUs: !enabled })
    return entry
  },
  scan_storage: async ({ onItem, onProgress }) => {
    const item = channel(onItem)
    const progress = channel(onProgress)
    for (const [n, category] of storage.entries()) {
      progress({ files: category.files, bytes: category.bytes, done: n, total: storage.length, current: category.name })
      await sleep(380)
      item(category)
    }
    return storage
  },
  disk_usage: () => ({ drive: "C:\\", total: 1_000e9, free: 214e9 }),
  list_drives: () => [{ letter: "C", label: "Windows", total: 1_000e9, free: 214e9, system: true }],
  get_settings: () => ({ backupRetentionDays: 30, retentionChoices: [30, 90, 180], exclusions: [] }),
}

window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} }
window.__TAURI_INTERNALS__ = {
  metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
  transformCallback: (cb) => {
    const id = Math.floor(Math.random() * 2 ** 31)
    window["_" + id] = cb
    return id
  },
  unregisterCallback: (id) => delete window["_" + id],
  invoke: async (cmd, args = {}) => {
    if (cmd in handlers) return structuredClone(await handlers[cmd](args))
    if (cmd.startsWith("list")) return []
    return null
  },
}

runTour()
