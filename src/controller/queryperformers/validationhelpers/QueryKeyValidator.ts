import {InsightError} from "../../IInsightFacade";

export type SKey = string;
export type MKey = string;


const allowedSectionsSFields: string[] = ["dept", "id", "instructor", "title", "uuid"];
const allowedSectionsMFields: string[] = ["avg", "pass", "fail", "audit", "year"];


const allowedRoomsSFields: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
const allowedRoomsMFields: string[] = ["lat", "lon", "seats"];

export function validateSField(sfield: string, datasetKind: "sections" | "rooms"): void {
	const allowed = datasetKind === "rooms" ? allowedRoomsSFields : allowedSectionsSFields;
	if (!allowed.includes(sfield)) {
		throw new InsightError(`Invalid SField: "${sfield}". Allowed values for ${datasetKind} are: ${allowed.join(", ")}`);
	}
}

export function validateMField(mfield: string, datasetKind: "sections" | "rooms"): void {
	const allowed = datasetKind === "rooms" ? allowedRoomsMFields : allowedSectionsMFields;
	if (!allowed.includes(mfield)) {
		throw new InsightError(`Invalid MField: "${mfield}". Allowed values for ${datasetKind} are: ${allowed.join(", ")}`);
	}
}

export function validateIdString(id: string): void {
	const trimmed = id.trim();
	if (trimmed.length === 0) {
		throw new InsightError("Invalid id: cannot be empty or whitespace");
	}
	if (trimmed.includes("_")) {
		throw new InsightError(`Invalid id: "${id}" must not contain underscores`);
	}
}

export function validateSKey(skey: string, datasetKind: "rooms" | "sections"): void {
	if (typeof skey !== "string") {
		throw new InsightError("SKey must be a string");
	}
	const parts = skey.split("_");
	if (parts.length !== 2) {
		throw new InsightError(`Invalid SKey: "${skey}". It must have exactly one underscore.`);
	}
	const [id, sfield] = parts;
	validateIdString(id);
	// if (id !== datasetKind) {
	// 	throw new InsightError(`Invalid SKey: "${skey}". The dataset id must be "${datasetKind}".`);
	// }

	// skey_sfield
	// skey -> what is the kind? -> is sfield appropriate
	// dataset, id: sec, kind: sections
	// validateSkey(sec_avg, sections)
	validateSField(sfield, datasetKind);
}

export function validateMKey(mkey: string, datasetKind: "rooms" | "sections"): void {
	if (typeof mkey !== "string") {
		throw new InsightError("MKey must be a string");
	}
	const parts = mkey.split("_");
	if (parts.length !== 2) {
		throw new InsightError(`Invalid MKey: "${mkey}". It must have exactly one underscore.`);
	}
	const [id, mfield] = parts;
	validateIdString(id);
	// if (id !== datasetKind) {
	// 	throw new InsightError(`Invalid MKey: "${mkey}". The dataset id must be "${datasetKind}".`);
	// }
	validateMField(mfield, datasetKind);
}

