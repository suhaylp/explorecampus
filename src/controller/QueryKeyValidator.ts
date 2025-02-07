// export type SField = "dept" | "id" | "instructor" | "title" | "uuid";
// export type MField = "avg" | "pass" | "fail" | "audit" | "year";
export type SKey = string; // `${id}_${SField}`
export type MKey = string; // `${id}_${MField}`

export function validateIdString(id: string): void {
	const trimmed = id.trim();
	if (trimmed.length === 0) {
		throw new Error("Invalid id: cannot be empty or whitespace");
	}
	if (trimmed.includes("_")) {
		throw new Error(`Invalid id: "${id}" must not contain underscores`);
	}
}

export function validateSField(sfield: string): void {
	const allowedSFields: string[] = ["dept", "id", "instructor", "title", "uuid"];
	if (!allowedSFields.includes(sfield)) {
		throw new Error(`Invalid SField: "${sfield}". Allowed values are: ${allowedSFields.join(", ")}`);
	}
}

export function validateMField(mfield: string): void {
	const allowedMFields: string[] = ["avg", "pass", "fail", "audit", "year"];
	if (!allowedMFields.includes(mfield)) {
		throw new Error(`Invalid MField: "${mfield}". Allowed values are: ${allowedMFields.join(", ")}`);
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
	validateSField(sfield);
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
	validateMField(mfield);
}
