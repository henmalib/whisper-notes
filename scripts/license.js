const fs = require("fs");
const path = require("path");

function readTextSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function parseCSV(text) {
  const rows = [];
  let i = 0,
    field = "",
    row = [],
    inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function findLicenseFile(dir) {
  if (!dir || !exists(dir)) return null;
  const candidates = [
    "LICENSE",
    "LICENSE.txt",
    "LICENSE.md",
    "LICENCE",
    "LICENCE.txt",
    "LICENCE.md",
    "COPYING",
    "COPYRIGHT",
    "NOTICE",
  ];
  for (const c of candidates) {
    const p = path.join(dir, c);
    if (exists(p) && fs.statSync(p).isFile()) return p;
  }
  const files = fs.readdirSync(dir);
  const first = files.find(
    (f) => /^licen[sc]e/i.test(f) || /^(copying|copyright|notice)$/i.test(f),
  );
  return first ? path.join(dir, first) : null;
}

function loadNpmEntries() {
  const FRONTEND_DIR = "frontend";
  const p = "node_licenses.json";
  if (!exists(p)) return [];
  const raw = JSON.parse(readTextSafe(p) || "{}");

  function resolveLicenseText(info, pkgName) {
    // 1) Try explicit licenseFile (absolute or relative)
    let lf = info.licenseFile;
    if (lf) {
      // absolute path works as-is
      if (!path.isAbsolute(lf)) {
        // resolve relative to package path if present
        if (info.path) {
          const candidate = path.resolve(info.path, lf);
          if (exists(candidate) && fs.statSync(candidate).isFile()) {
            const t = readTextSafe(candidate);
            if (t) return t;
          }
        }
        // otherwise relative to the frontend working dir
        const frontendCandidate = path.resolve(FRONTEND_DIR, lf);
        if (
          exists(frontendCandidate) &&
          fs.statSync(frontendCandidate).isFile()
        ) {
          const t = readTextSafe(frontendCandidate);
          if (t) return t;
        }
      } else {
        const t = readTextSafe(lf);
        if (t) return t;
      }
    }

    // 2) Try the package install path from license-checker
    if (info.path) {
      const f = findLicenseFile(info.path);
      if (f) {
        const t = readTextSafe(f);
        if (t) return t;
      }
    }

    // 3) Fallback: look under frontend/node_modules/<pkgName>
    // Works for scoped packages too (e.g. @scope/name)
    const nodeModulesDir = path.join(FRONTEND_DIR, "node_modules", pkgName);
    if (exists(nodeModulesDir) && fs.statSync(nodeModulesDir).isDirectory()) {
      const f = findLicenseFile(nodeModulesDir);
      if (f) {
        const t = readTextSafe(f);
        if (t) return t;
      }
    }

    return null;
  }

  return Object.entries(raw).map(([pkgId, info]) => {
    // Derive name/version robustly for scoped packages
    let name = pkgId,
      version = "";
    if (info.version) {
      version = String(info.version);
      const at = pkgId.lastIndexOf("@");
      name = at > 0 ? pkgId.slice(0, at) : info.name || pkgId;
    } else {
      const at = pkgId.lastIndexOf("@");
      if (at > 0) {
        name = pkgId.slice(0, at);
        version = pkgId.slice(at + 1);
      }
    }

    const licField = info.licenses;
    const licenses = Array.isArray(licField)
      ? licField
      : licField
        ? [licField]
        : [];

    const licenseText = resolveLicenseText(info, name);
    const url = info.repository || info.homepage || null;

    return {
      package: name,
      version,
      ecosystem: "npm",
      licenses: uniq(licenses),
      licenseText,
      url,
    };
  });
}

function readGoLicenseText(mod) {
  const baseRoot = "licenses_go";
  if (!exists(baseRoot)) return null;

  // collect possible folders: exact match and any "@version" suffixed ones
  const bases = [];
  const exact = path.join(baseRoot, mod);
  if (exists(exact) && fs.statSync(exact).isDirectory()) {
    bases.push(exact);
  } else {
    for (const d of fs.readdirSync(baseRoot)) {
      const full = path.join(baseRoot, d);
      if (!fs.statSync(full).isDirectory()) continue;
      const at = d.lastIndexOf("@");
      const baseName = at > 0 ? d.slice(0, at) : d;
      if (baseName === mod) bases.push(full);
    }
  }

  if (!bases.length) return null;

  const chunks = [];
  for (const base of bases) {
    const entries = fs.readdirSync(base, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      const n = e.name.toLowerCase();
      if (
        n.startsWith("license") ||
        n === "copying" ||
        n === "copyright" ||
        n === "notice" ||
        n.endsWith(".license") ||
        n.endsWith(".licence")
      ) {
        const text = readTextSafe(path.join(base, e.name));
        if (text) {
          chunks.push(
            `----- ${path.relative(baseRoot, path.join(base, e.name))} -----\n${text}`,
          );
        }
      }
    }
  }

  return chunks.length ? chunks.join("\n\n") : null;
}

function loadGoCSV() {
  const candidates = [
    "go_licenses.csv",
    path.join("backend", "go_licenses.csv"),
  ];
  const p = candidates.find(exists);
  if (!p) return { header: [], rows: [] };

  const text = readTextSafe(p) || "";
  const rows = parseCSV(text.trim());
  if (!rows.length) return { header: [], rows: [] };

  // Detect if the first row is a real header (v1) or data (v2 default)
  const first = rows[0].map((h) => (h || "").trim().toLowerCase());
  const looksLikeHeader = first.some((h) =>
    /^(module|library|package|version|license(_type)?|licenses?|license_url|url|homepage)$/.test(
      h,
    ),
  );

  if (looksLikeHeader) {
    const header = rows.shift().map((h) => (h || "").trim().toLowerCase());
    return { header, rows };
  }

  // v2 default: no header, columns are: module, license_url, license_type
  return {
    header: ["module", "license_url", "license_type"],
    rows,
  };
}

function loadGoEntries() {
  const { header, rows } = loadGoCSV();

  if (!header.length || !rows.length) {
    // fallback: read saved files if CSV missing/empty
    const base = "licenses_go";
    if (!exists(base)) return [];
    const mods = fs
      .readdirSync(base)
      .filter(
        (d) =>
          exists(path.join(base, d)) &&
          fs.statSync(path.join(base, d)).isDirectory(),
      );
    return mods.map((mod) => ({
      package: mod,
      version: "",
      ecosystem: "go",
      licenses: [],
      licenseText: readGoLicenseText(mod),
      url: null,
    }));
  }

  const iMod =
    header.indexOf("module") !== -1
      ? header.indexOf("module")
      : header.indexOf("library") !== -1
        ? header.indexOf("library")
        : header.indexOf("package");

  const iVer = header.indexOf("version");
  const iLic = ["license_type", "license", "licenses"]
    .map((h) => header.indexOf(h))
    .find((i) => i !== -1);
  const iUrl = ["license_url", "url", "homepage"]
    .map((h) => header.indexOf(h))
    .find((i) => i !== -1);

  const out = [];
  for (const cols of rows) {
    const module = (iMod >= 0 ? cols[iMod] : "").trim();
    if (!module) continue;

    const version = iVer >= 0 ? (cols[iVer] || "").trim() : "";
    const licRaw = iLic >= 0 ? (cols[iLic] || "").trim() : "";
    const url = iUrl >= 0 ? (cols[iUrl] || "").trim() || null : null;

    const licenseText = readGoLicenseText(module);
    const licenses = licRaw
      ? licRaw
          .split(/[|,\/]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    out.push({
      package: module,
      version,
      ecosystem: "go",
      licenses: uniq(licenses),
      licenseText,
      url,
    });
  }
  return out;
}

const npm = loadNpmEntries();
const go = loadGoEntries();
const merged = [...npm, ...go]
  .filter((e) => e && e.package)
  .sort(
    (a, b) =>
      a.ecosystem.localeCompare(b.ecosystem) ||
      a.package.localeCompare(b.package),
  );

ensureDir("frontend/src/assets");
fs.writeFileSync(
  "frontend/src/assets/licenses.json",
  JSON.stringify(merged, null, 2),
  "utf8",
);
console.log(
  `Wrote ${merged.length} entries -> frontend/src/assets/licenses.json`,
);
