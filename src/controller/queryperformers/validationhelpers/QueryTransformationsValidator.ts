import { InsightError } from "../../IInsightFacade";

function isObj(o: any): boolean {
    return typeof o === "object" && o !== null && !Array.isArray(o);
}
function extractId(s: string): string {
    return s.includes("_") ? s.split("_")[0] : "";
}
function ensure(cond: boolean, msg: string): void {
    if (!cond) throw new InsightError(msg);
}

export class TransformationsValidator {
    public static validateTransformations(t: any, kind: "rooms" | "sections"): void {
        ensure(isObj(t), "TRANSFORMATIONS must be an object");
        const ks = Object.keys(t);
        ensure(ks.includes("GROUP") && ks.includes("APPLY"), "TRANSFORMATIONS must contain GROUP and APPLY");
        ensure(Array.isArray(t.GROUP) && t.GROUP.length > 0, "GROUP must be a non-empty array");
        ensure(Array.isArray(t.APPLY), "APPLY must be an array");
        const allow = kind === "sections" ? ["avg", "pass", "fail", "audit", "year"] : ["lat", "lon", "seats"],
            valid = ["MAX", "MIN", "AVG", "SUM", "COUNT"],
            aSet = new Set<string>(),
            dsIds = new Set<string>();
        t.APPLY.forEach((r: any) => {
            ensure(isObj(r), "Each APPLY rule must be an object");
            const rk = Object.keys(r);
            ensure(rk.length === 1, "Each APPLY rule must have exactly one key");
            const key = rk[0];
            ensure(!aSet.has(key), `Duplicate APPLY key: ${key}`);
            aSet.add(key);
            const op = r[key];
            ensure(isObj(op), "Each APPLY rule's value must be an object");
            const opk = Object.keys(op);
            ensure(opk.length === 1 && valid.includes(opk[0]), "Each APPLY rule must have exactly one operator: MAX, MIN, AVG, SUM, or COUNT");
            if (opk[0] !== "COUNT") {
                const parts = op[opk[0]].split("_");
                ensure(parts.length === 2 && allow.includes(parts[1]),
                    `Operator ${opk[0]} applied to non-numeric key ${op[opk[0]]}`);
                dsIds.add(extractId(op[opk[0]]));
            }
        });
        ensure(dsIds.size <= 1, "TRANSFORMATIONS must reference exactly one dataset");
    }

    public static validateColumns(cols: string[], t: any): void {
        const group: string[] = t.GROUP,
            apply: string[] = t.APPLY.map((r: any) => Object.keys(r)[0]);
        cols.forEach(c => {
            ensure(group.includes(c) || apply.includes(c),
                `Column "${c}" must appear in GROUP or be defined in APPLY`);
        });
    }
}
