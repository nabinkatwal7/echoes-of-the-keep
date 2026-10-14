import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GiHearts, GiRoundShield } from "react-icons/gi";
import { classIcon } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Ornament } from "@/app/components/ui/Ornament";
import { ABILITIES, SKILLS, type Skill } from "@/engine/abilities";
import { explain } from "@/engine/character";
import { CLASS_RULES } from "@/engine/classes/rules";
import { SUBCLASSES } from "@/engine/classes/subclasses";
import { requireUser } from "@/lib/auth";
import { deleteCharacter } from "@/lib/characters/actions";
import { deriveStored, prereqContext } from "@/lib/characters/derive";
import { getOwnedCharacter } from "@/lib/characters/queries";
import { combineHouseRules, readHouseRules } from "@/lib/campaigns/houseRules";
import { prisma } from "@/lib/prisma";
import { SRD_SUBCLASSES, showCreature, showSpell, srdOnly, srdWhere } from "@/lib/srd";
import { InventoryPanel } from "./InventoryPanel";
import { LevelUpPanel } from "./LevelUpPanel";
import { CompanionsPanel } from "./CompanionsPanel";
import { SheetTools } from "./SheetTools";
import { ResourcesPanel } from "./ResourcesPanel";
import type { Companion, CompanionKind } from "@/lib/characters/companionActions";
import { collectEffects } from "@/engine/effects";
import { attacksPerAction } from "@/engine/progression";
import { SpellsPanel, type CasterView } from "./SpellsPanel";
import { CASTER_KIND, CLASS_NAME, maxSpellLevel, spellLimits, type SpellSelection } from "@/engine/classes/spellcasting";
import { CASTING_ABILITY } from "@/engine/spells";
import { resourceViews, slotViews } from "@/lib/characters/play";
import { ClassOptions } from "./ClassOptions";
import { SheetCache } from "@/app/components/SheetCache";
import { MobileHpBar } from "./MobileHpBar";
import { VitalsPanel } from "./VitalsPanel";
import type { InventoryItem } from "@/lib/characters/inventory";
import type { Purse } from "@/engine/economy";

export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const FULL: Record<string, string> = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await getOwnedCharacter((await params).id, user.id);
  return { title: c?.name ?? "Hero" };
}

export default async function CharacterSheet({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await getOwnedCharacter((await params).id, user.id);
  if (!c) notFound();

  const d = deriveStored(c);
  const [catalogRows, myItems] = await Promise.all([
    prisma.equipmentItem.findMany({ select: { index: true, name: true, cost: true, category: true }, orderBy: { name: "asc" } }),
    prisma.homebrewEntry.findMany({ where: { ownerId: user.id, kind: "item" }, select: { id: true, name: true, data: true } }),
  ]);
  const catalog = [
    ...catalogRows,
    ...myItems.map((h) => ({ index: `homebrew-${h.id}`, name: h.name, cost: String((h.data as { cost?: string }).cost ?? "0 gp"), category: String((h.data as { category?: string }).category ?? "Adventuring Gear") })),
  ];
  const feats = await prisma.feat.findMany({ where: srdWhere("feat"), select: { index: true, name: true, prerequisite: true }, orderBy: { name: "asc" } });
  const classes = c.classes as { classIndex: string; level: number; subclassIndex?: string }[];
  const subclassNames = classes.map((k) => SUBCLASSES.find((s) => s.index === k.subclassIndex)?.name).filter(Boolean);
  const proficient = new Set(c.skillProficiencies as Skill[]);
  const saveProf = new Set(CLASS_RULES[classes[0].classIndex]?.saves ?? []);
  const Icon = classIcon(classes[0].classIndex);
  // spellcasting: one section per caster class, with the spells that class could choose
  const spellState = (c.spells ?? {}) as { byClass?: Record<string, SpellSelection>; concentration?: { spell: string; name: string } | null };
  const casterClasses = classes.filter((k) => CASTER_KIND[k.classIndex] && maxSpellLevel(k.classIndex, k.level) > 0);
  const links = await prisma.campaignCharacter.findMany({ where: { characterId: c.id }, select: { campaignId: true, campaign: { select: { settings: true } } } });
  const campaignIds = links.map((l) => l.campaignId);
  const house = combineHouseRules(links.map((l) => readHouseRules(l.campaign.settings)));
  const options = casterClasses.length
    ? await prisma.spell.findMany({
        where: {
          AND: [
            { OR: [{ campaignId: null }, ...(campaignIds.length ? [{ campaignId: { in: campaignIds } }] : [])] },
            { OR: casterClasses.map((k) => ({ classes: { has: CLASS_NAME[k.classIndex] }, level: { lte: maxSpellLevel(k.classIndex, k.level) } })) },
          ],
        },
        select: { index: true, name: true, level: true, school: true, ritual: true, concentration: true, classes: true, source: true },
        orderBy: [{ level: "asc" }, { name: "asc" }],
      })
    : [];
  const casters: CasterView[] = casterClasses.map((k) => ({
    classIndex: k.classIndex,
    className: CLASS_NAME[k.classIndex],
    level: k.level,
    limits: spellLimits(k.classIndex, k.level, d.abilities[CASTING_ABILITY[k.classIndex]].score)!,
    maxSpellLevel: maxSpellLevel(k.classIndex, k.level),
    selection: spellState.byClass?.[k.classIndex] ?? { known: [], prepared: [], spellbook: [] },
    options: options.filter((o) => showSpell(o.name, o.source) && o.classes.includes(CLASS_NAME[k.classIndex]) && o.level <= maxSpellLevel(k.classIndex, k.level)),
  }));
  const slots = slotViews(c);
  const creatures = (await prisma.creature.findMany({ where: { campaignId: null }, select: { index: true, name: true, challenge: true }, orderBy: { name: "asc" } })).filter((c) => showCreature(c.name));
  const companionKinds: CompanionKind[] = [];
  if (classes.some((k) => k.classIndex === "druid")) companionKinds.push("wild-shape");
  if (classes.some((k) => k.classIndex === "ranger" && k.subclassIndex === "beast-master")) companionKinds.push("beast-companion");
  if (classes.some((k) => k.classIndex === "wizard")) companionKinds.push("familiar");
  const fx = collectEffects({ raceIndex: c.raceIndex, subraceIndex: c.subraceIndex, feats: c.feats as string[], classes, armor: null });
  const perAction = attacksPerAction(classes);
  const hpPct = Math.max(0, Math.min(100, Math.round((c.currentHp / d.maxHp) * 100)));

  async function remove() {
    "use server";
    await deleteCharacter(c!.id);
    redirect("/characters");
  }

  return (
    <article className="flex flex-col gap-8 pb-24 md:pb-0">
      <Link href="/characters" className="eyebrow hover:text-goldBright">
        ← All heroes
      </Link>

      {/* header */}
      <header className="panel flex flex-wrap items-center gap-6 p-6">
        {c.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.portraitUrl} alt={`Portrait of ${c.name}`} referrerPolicy="no-referrer" className="h-24 w-24 shrink-0 rounded-full border-2 border-gold/70 object-cover shadow-[0_0_30px_rgba(201,162,75,0.25)]" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-gold/70 bg-black/40 text-6xl text-gold shadow-[0_0_30px_rgba(201,162,75,0.25)]">
            <Icon />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{titleCase(c.backgroundIndex)}</p>
          <h1 className="gilded text-4xl font-bold">{c.name}</h1>
          <p className="text-lg text-foreground/80">
            {titleCase(c.subraceIndex ?? c.raceIndex)} {classes.map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ")}
          </p>
          {subclassNames.length > 0 && <p className="text-sm italic text-muted">{subclassNames.join(", ")}</p>}
          {c.alignment && <Badge tone="gold" className="mt-2">{titleCase(c.alignment)}</Badge>}
        </div>
        <div className="flex gap-3">
          <Vital icon={<GiRoundShield />} label="Armor Class" value={d.armorClass.total} title={explain(d.armorClass)} />
          <Vital icon={<GiHearts />} label="Hit Points" value={`${c.currentHp}/${d.maxHp}`} tone="crimson" />
        </div>
        <div className="basis-full">
          <div className="h-2 overflow-hidden rounded-full border border-crimson/60 bg-black/50" role="progressbar" aria-valuenow={c.currentHp} aria-valuemax={d.maxHp} aria-label="Hit points">
            <div className="h-full bg-gradient-to-r from-[#7a1b2a] to-[#d4566a]" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
      </header>

      <MobileHpBar id={c.id} hp={c.currentHp} maxHp={d.maxHp} />
      <VitalsPanel
        id={c.id}
        hp={c.currentHp}
        maxHp={d.maxHp}
        tempHp={c.tempHp}
        deathSaves={c.deathSaves as { successes: number; failures: number }}
        conditions={c.conditions as string[]}
      />

      {/* quick stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Mini label="Initiative" value={signed(d.initiative.total)} title={explain(d.initiative)} />
        <Mini label="Speed" value={`${d.speed} ft`} />
        <Mini label="Proficiency" value={signed(d.proficiencyBonus)} />
        <Mini label="Passive Perception" value={d.passivePerception} />
      </section>

      {/* abilities */}
      <section>
        <h2 className="eyebrow mb-3">Abilities</h2>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          {ABILITIES.map((a) => (
            <Card key={a} className="flex flex-col items-center gap-1 px-2 py-4 text-center">
              <span className="rune-label">{FULL[a]}</span>
              <span className="font-display text-4xl text-goldBright">{signed(d.abilities[a].modifier)}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/40 font-display text-sm">{d.abilities[a].score}</span>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* saves */}
        <section>
          <h2 className="eyebrow mb-3">Saving throws</h2>
          <Card flat className="p-2">
            <ul>
              {ABILITIES.map((a) => (
                <li key={a} title={explain(d.saves[a])} className="flex items-center gap-3 border-b border-borderSoft px-3 py-2 last:border-0">
                  <Pip on={saveProf.has(a)} />
                  <span className="flex-1">{FULL[a]}</span>
                  <span className="font-display text-goldBright">{signed(d.saves[a].total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* skills */}
        <section>
          <h2 className="eyebrow mb-3">Skills</h2>
          <Card flat className="p-2">
            <ul className="grid sm:grid-cols-2 sm:gap-x-4">
              {(Object.keys(SKILLS) as Skill[]).map((s) => (
                <li key={s} title={explain(d.skills[s])} className="flex items-center gap-3 border-b border-borderSoft px-3 py-2">
                  <Pip on={proficient.has(s)} />
                  <span className="flex-1">
                    {titleCase(s)} <span className="text-xs text-muted">{SKILLS[s].toUpperCase()}</span>
                  </span>
                  <span className="font-display text-goldBright">{signed(d.skills[s].total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>

      {d.attacks.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Attacks</h2>
          <Card flat className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-black/30 font-display text-xs uppercase tracking-[0.14em] text-gold">
                  <th className="px-4 py-2.5">Weapon</th>
                  <th className="px-4 py-2.5">Attack</th>
                  <th className="px-4 py-2.5">Damage</th>
                </tr>
              </thead>
              <tbody>
                {d.attacks.map((a) => (
                  <tr key={a.name} className="border-b border-borderSoft last:border-0" title={explain(a.attackBonus)}>
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2 font-display text-goldBright">{signed(a.attackBonus.total)}</td>
                    <td className="px-4 py-2">{a.damage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      <SheetCache id={c.id} name={c.name} line={`${c.name}, level ${d.level}. HP ${c.currentHp}/${d.maxHp}. AC ${d.armorClass.total}.`} />
      <ClassOptions
        id={c.id}
        sorcererLevel={classes.find((k) => k.classIndex === "sorcerer")?.level ?? 0}
        warlockLevel={classes.find((k) => k.classIndex === "warlock")?.level ?? 0}
        metamagic={Array.isArray((c.resources as { _metamagic?: unknown })?._metamagic) ? ((c.resources as { _metamagic: string[] })._metamagic) : []}
        invocations={Array.isArray((c.resources as { _invocations?: unknown })?._invocations) ? ((c.resources as { _invocations: string[] })._invocations) : []}
      />
      {casters.length > 0 && <SpellsPanel id={c.id} casters={casters} slots={slots.slots} pact={slots.pact} concentration={spellState.concentration ?? null} />}

      <ResourcesPanel
        id={c.id}
        resources={resourceViews(c)}
        hitDice={c.hitDiceSpent as Record<string, { total: number; spent: number }>}
        currentHp={c.currentHp}
        maxHp={d.maxHp}
      />

      <CompanionsPanel id={c.id} companions={c.companions as unknown as Companion[]} creatures={creatures} kinds={companionKinds} />

      {fx.traits.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Traits and features</h2>
          <Card flat className="flex flex-wrap gap-2">
            {fx.traits.map((t, i) => (
              <Badge key={`${t.name}-${i}`} tone={t.automated ? "gold" : "neutral"} title={t.automated ? "Applied automatically" : "Noted; adjudicated at the table"}>
                {t.name}
              </Badge>
            ))}
            {fx.darkvision > 0 && <Badge tone="arcane">Darkvision {fx.darkvision} ft</Badge>}
            {fx.resistances.map((r) => (
              <Badge key={r} tone="emerald">Resists {r}</Badge>
            ))}
            {perAction > 1 && <Badge tone="crimson">{perAction} attacks per Attack action</Badge>}
          </Card>
        </section>
      )}

      <InventoryPanel id={c.id} items={c.equipment as unknown as InventoryItem[]} purse={c.currency as unknown as Purse} catalog={catalog} strength={d.abilities.str.score} />

      <Ornament />

      <LevelUpPanel id={c.id} xp={c.xp} classes={classes} feats={feats} ownedFeats={c.feats as string[]} prereq={prereqContext(c)} subclassAllow={srdOnly() ? SRD_SUBCLASSES : undefined} allowMulticlass={house.multiclass} allowFeats={house.feats} canUndo={Boolean(c.resources && typeof c.resources === "object" && !Array.isArray(c.resources) && (c.resources as { _undo?: string })._undo)} />

      <SheetTools id={c.id} portraitUrl={c.portraitUrl} />

      <form action={remove} className="no-print">
        <Button variant="danger">Retire this hero</Button>
      </form>
    </article>
  );
}

function Pip({ on }: { on: boolean }) {
  return (
    <span
      role="img"
      aria-label={on ? "proficient" : "not proficient"}
      className={`h-3.5 w-3.5 shrink-0 rotate-45 border ${on ? "border-goldBright bg-gold shadow-[0_0_8px_rgba(239,205,111,0.6)]" : "border-border"}`}
    />
  );
}

function Vital({ icon, label, value, title, tone }: { icon: React.ReactNode; label: string; value: string | number; title?: string; tone?: "crimson" }) {
  return (
    <div
      title={title}
      className={`flex min-w-28 flex-col items-center gap-0.5 rounded border px-4 py-3 text-center ${tone === "crimson" ? "border-crimson/60 bg-crimson/10" : "border-gold/50 bg-gold/5"}`}
    >
      <span className={`text-2xl ${tone === "crimson" ? "text-danger" : "text-gold"}`}>{icon}</span>
      <span className="font-display text-3xl">{value}</span>
      <span className="rune-label">{label}</span>
    </div>
  );
}

function Mini({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <Card flat className="flex flex-col items-center py-4 text-center" title={title}>
      <span className="font-display text-3xl text-goldBright">{value}</span>
      <span className="rune-label">{label}</span>
    </Card>
  );
}
