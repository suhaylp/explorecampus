
export type SKey = string;
export type MKey = string;


const allowedSectionsSFields: string[] = ["dept", "id", "instructor", "title", "uuid"];
const allowedSectionsMFields: string[] = ["avg", "pass", "fail", "audit", "year"];


const allowedRoomsSFields: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
const allowedRoomsMFields: string[] = ["lat", "lon", "seats"];

export function validateSField(sfield: string, datasetKind: "sections" | "rooms"): void {
	const allowed = datasetKind === "rooms" ? allowedRoomsSFields : allowedSectionsSFields;
	if (!allowed.includes(sfield)) {
		throw new Error(`Invalid SField: "${sfield}". Allowed values for ${datasetKind} are: ${allowed.join(", ")}`);
	}
}

export function validateMField(mfield: string, datasetKind: "sections" | "rooms"): void {
	const allowed = datasetKind === "rooms" ? allowedRoomsMFields : allowedSectionsMFields;
	if (!allowed.includes(mfield)) {
		throw new Error(`Invalid MField: "${mfield}". Allowed values for ${datasetKind} are: ${allowed.join(", ")}`);
	}
}

export function validateIdString(id: string): void {
	const trimmed = id.trim();
	if (trimmed.length === 0) {
		throw new Error("Invalid id: cannot be empty or whitespace");
	}
	if (trimmed.includes("_")) {
		throw new Error(`Invalid id: "${id}" must not contain underscores`);
	}
}

export function validateSKey(skey: SKey): void {
	if (typeof skey !== "string") {
		throw new Error("SKey must be a string");
	}
	const parts = skey.split("_");
	if (parts.length !== 2) {
		throw new Error(`Invalid SKey: "${skey}". It must have exactly one underscore separating the id and field.`);
	}
	const [id, sfield] = parts;
	validateIdString(id);
	const datasetKind: "rooms" | "sections" = id === "rooms" ? "rooms" : "sections";
	validateSField(sfield, datasetKind);
}

export function validateMKey(mkey: MKey): void {
	if (typeof mkey !== "string") {
		throw new Error("MKey must be a string");
	}
	const parts = mkey.split("_");
	if (parts.length !== 2) {
		throw new Error(`Invalid MKey: "${mkey}". It must have exactly one underscore separating the id and field.`);
	}
	const [id, mfield] = parts;
	validateIdString(id);
	const datasetKind: "rooms" | "sections" = id === "rooms" ? "rooms" : "sections";
	validateMField(mfield, datasetKind);
}
