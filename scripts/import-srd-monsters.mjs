/**
 * Turn the 5e-bits 2014 SRD monster JSON (CC-BY-4.0) into the creature rows this app seeds.
 * Source: https://github.com/5e-bits/5e-database (src/2014/en/5e-SRD-Monsters.json)
 *
 * ponytail: legendary pools are stored as 3, which is what the SRD stat blocks use. A monster that
 * states a different pool would need that number written into the legendary sentence.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CR = { 0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
const crText = (n) => CR[n] ?? String(n);

const speedText = (s) => {
  if (!s || typeof s !== "object") return null;
  const parts = [];
  if (s.walk) parts.push(s.walk);
  for (const k of ["fly", "swim", "climb", "burrow", "hover"]) if (s[k]) parts.push(`${k} ${s[k]}`);
  return parts.join(", ") || null;
};

const joinList = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x.name)).filter(Boolean).join(", ") || null;
  return null;
};

const sensesText = (s) => {
  if (!s || typeof s !== "object") return null;
  const parts = [];
  for (const [k, v] of Object.entries(s)) {
    if (k === "passive_perception") parts.push(`passive Perception ${v}`);
    else parts.push(`${k} ${v}`);
  }
  return parts.join(", ") || null;
};

const line = (entry) => {
  let name = entry.name;
  if (entry.usage?.type === "recharge on roll") name = `${name} (Recharge ${entry.usage.min_value ?? 5}-6)`;
  return `${name}. ${entry.desc}`;
};

const raw = new URL("./srd-monsters.json", import.meta.url);
if (!existsSync(raw)) {
  const res = await fetch("https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Monsters.json");
  if (!res.ok) throw new Error(`SRD download failed: ${res.status}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
}
const monsters = JSON.parse(readFileSync(raw, "utf8"));
const rows = monsters.map((m) => {
  const abilities = {
    str: m.strength, dex: m.dexterity, con: m.constitution, int: m.intelligence, wis: m.wisdom, cha: m.charisma,
  };
  const saves = (m.proficiencies ?? [])
    .filter((p) => String(p.proficiency?.index ?? "").startsWith("saving-throw"))
    .map((p) => `${p.proficiency.name.replace("Saving Throw: ", "")} +${p.value}`);
  const skills = (m.proficiencies ?? [])
    .filter((p) => String(p.proficiency?.index ?? "").startsWith("skill-"))
    .map((p) => `${p.proficiency.name.replace("Skill: ", "")} +${p.value}`);
  const ac = m.armor_class?.[0]?.value ?? m.armor_class ?? null;
  const notes = [];
  const vuln = joinList(m.damage_vulnerabilities);
  const immune = joinList(m.damage_immunities);
  if (vuln) notes.push(`Vulnerable to ${vuln}.`);
  if (immune) notes.push(`Immune to ${immune}.`);
  const parts = [...notes];
  if (m.special_abilities?.length) parts.push(m.special_abilities.map(line).join(" "));
  if (m.actions?.length) parts.push(m.actions.map(line).join(" "));
  if (m.reactions?.length) parts.push(`Reactions. ${m.reactions.map(line).join(" ")}`);
  if (m.legendary_actions?.length) {
    parts.push(`Legendary Actions. The ${m.name.toLowerCase()} can take 3 legendary actions. ${m.legendary_actions.map(line).join(" ")}`);
  }
  const text = parts.join(" ") || m.name;
  return {
    index: m.index,
    name: m.name,
    size: m.size,
    type: m.type,
    alignment: typeof m.alignment === "string" ? m.alignment : "unaligned",
    armorClass: ac == null ? null : String(ac),
    hitPoints: m.hit_points == null ? null : `${m.hit_points}${m.hit_points_roll ? ` (${m.hit_points_roll})` : ""}`,
    speed: speedText(m.speed),
    abilities,
    savingThrows: saves.join(", ") || null,
    skills: skills.join(", ") || null,
    damageResistances: joinList(m.damage_resistances),
    senses: sensesText(m.senses),
    languages: m.languages || null,
    challenge: `${crText(m.challenge_rating)} (${Number(m.xp).toLocaleString("en-US")} XP)`,
    text,
    source: "SRD",
    pdfPages: [],
  };
});

const out = new URL("../content/srd/creatures.json", import.meta.url);
mkdirSync(new URL("../content/srd/", import.meta.url), { recursive: true });
writeFileSync(out, JSON.stringify(rows));
console.log(`wrote ${rows.length} creatures`);
