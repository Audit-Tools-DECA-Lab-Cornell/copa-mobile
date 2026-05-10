import { getBundledInstrument } from "/lib/audit/bundled-instrument";
console.log("Sections:", getBundledInstrument()?.sections.length ?? 0);
