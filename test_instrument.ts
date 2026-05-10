import { getBundledInstrument } from "/lib/audit/bundled-instrument";

export function testBundleInstrument() {
    const bundledInstrument = getBundledInstrument;
    return bundledInstrument;
}
