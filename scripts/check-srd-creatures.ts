import { importers } from "../content/build/importers";
import { parseLegendary, parseRecharge } from "../engine/combat/special";

const rows = importers.find((i) => i.name === "creatures")!.load() as { index: string; text: string }[];
const young = rows.find((r) => r.index === "young-red-dragon");
const adult = rows.find((r) => r.index === "adult-red-dragon");
if (!young || !parseRecharge(young.text)[0]?.dice) throw new Error("young red dragon breath did not parse");
if (!adult || !parseLegendary(adult.text)) throw new Error("adult red dragon legendary actions did not parse");
if (rows.length < 300) throw new Error(`expected the SRD list, got ${rows.length}`);
console.log(`${rows.length} creatures, breath and legendary actions parse`);
