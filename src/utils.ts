/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mapping of common soccer teams/nations to standard ISO 3166-1 alpha-2 codes
const TEAM_TO_COUNTRY_CODE: Record<string, string> = {
  // Portuguese names
  "brasil": "br",
  "argentina": "ar",
  "frança": "fr",
  "franca": "fr",
  "alemanha": "de",
  "espanha": "es",
  "itália": "it",
  "italia": "it",
  "portugal": "pt",
  "inglaterra": "gb",
  "uruguai": "uy",
  "colômbia": "co",
  "colombia": "co",
  "holanda": "nl",
  "países baixos": "nl",
  "paises baixos": "nl",
  "bélgica": "be",
  "belgica": "be",
  "japão": "jp",
  "japao": "jp",
  "eua": "us",
  "estados unidos": "us",
  "marrocos": "ma",
  "croácia": "hr",
  "croacia": "hr",
  "senegal": "sn",
  "camarões": "cm",
  "camaroes": "cm",
  "méxico": "mx",
  "mexico": "mx",
  "canadá": "ca",
  "canada": "ca",
  "equador": "ec",
  "suíça": "ch",
  "suica": "ch",
  "suécia": "se",
  "suecia": "se",
  "dinamarca": "dk",
  "coreia do sul": "kr",
  "arábia saudita": "sa",
  "arabia saudita": "sa",
  "gales": "gb-wls",
  "chile": "cl",
  "paraguai": "py",
  "peru": "pe",
  "venezuela": "ve",
  "bolívia": "bo",
  "bolivia": "bo",
  "egito": "eg",
  "gana": "gh",
  "nigéria": "ng",
  "nigeria": "ng",
  "austrália": "au",
  "australia": "au",
  "nova zelândia": "nz",
  "nova zelandia": "nz",
};

/**
 * Automagically returns a high-resolution PNG Flag URL for a given team name, or a default placeholder.
 */
export function getTeamFlagUrl(teamName: string): string {
  const normalized = teamName.trim().toLowerCase();
  
  // Try to find exact or partial match
  let code = "";
  for (const [key, value] of Object.entries(TEAM_TO_COUNTRY_CODE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      code = value;
      break;
    }
  }

  if (code) {
    return `https://flagcdn.com/w160/${code}.png`;
  }

  // Generate a random-looking but deterministic avatar flag/color based on string hash for unmatched teams
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % 8;
  const colors = ["3b82f6", "10b981", "f59e0b", "ef4444", "8b5cf6", "ec4899", "14b8a6", "6366f1"];
  const color = colors[colorIndex];
  
  // Return an attractive UI Avatars placeholder depicting the team initials in deep theme colors
  const initials = normalized.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || normalized.slice(0, 2).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=128&bold=true`;
}

/**
 * Exports data to CSV, fully Excel friendly by including the UTF-8 BOM.
 */
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(";"),
    ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(";"))
  ].join("\n");

  // UTF-8 BOM to make Excel read Portuguese accents correctly
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats values to Brazilian Real (BRL).
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

/**
 * Formats a raw date state into Brazilian locale date format.
 */
export function formatLocalDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}
