import * as parse5 from "parse5";

export class Room {
	public fullname: string;
	public shortname: string;
	public number: string;
	public name: string;
	public address: string;
	public lat: number;
	public lon: number;
	public seats: number;
	public type: string;
	public furniture: string;
	public href: string;

	constructor(
		fullname: string,
		shortname: string,
		number: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string
	) {
		this.fullname = String(fullname);
		this.shortname = String(shortname);
		this.number = String(number);
		this.name = `${this.shortname}_${this.number}`;
		this.address = String(address);
		this.lat = Number(lat);
		this.lon = Number(lon);
		this.seats = Number(seats);
		this.type = String(type);
		this.furniture = String(furniture);
		this.href = String(href);
	}
}

/** Recursively searches for elements by tag name and, optionally, by class name. */
function findElements(node: any, tagName: string, className?: string): any[] {
	let results: any[] = [];
	if (node.nodeName === tagName) {
		if (className) {
			if (node.attrs) {
				const classAttr = node.attrs.find((attr: any) => attr.name === "class");
				if (classAttr?.value.includes(className)) results.push(node);
			}
		} else {
			results.push(node);
		}
	}
	if (node.childNodes) {
		for (const child of node.childNodes) {
			results = results.concat(findElements(child, tagName, className));
		}
	}
	return results;
}

/** Helper: Extracts text content from a node. */
function extractText(node: any): string {
	return node.childNodes ? node.childNodes.map((child: any) => child.value || "").join("").trim() : "";
}

/** Helper: Extracts the room number from a row. */
function extractRoomNumber(row: any): string {
	const rnCells = findElements(row, "td", "views-field-field-room-number");
	if (rnCells.length > 0) {
		const cell = rnCells[0];
		const anchors = findElements(cell, "a");
		return anchors.length > 0 ? extractText(anchors[0]) : extractText(cell);
	}
	return "";
}

/** Helper: Extracts the capacity from a row. */
function extractCapacity(row: any): number {
	const capCells = findElements(row, "td", "views-field-field-room-capacity");
	let capText = "";
	if (capCells.length > 0) {
		capText = extractText(capCells[0]);
	} else {
		const cells = findElements(row, "td");
		if (cells[1]) capText = extractText(cells[1]);
	}
	return Number(capText);
}

/** Helper: Extracts the furniture type from a row. */
function extractFurniture(row: any): string {
	const furnCells = findElements(row, "td", "views-field-field-room-furniture");
	if (furnCells.length > 0) return extractText(furnCells[0]);
	const cells = findElements(row, "td");
	return cells[2] ? extractText(cells[2]) : "";
}

/** Helper: Extracts the room type from a row. */
function extractRoomType(row: any): string {
	const typeCells = findElements(row, "td", "views-field-field-room-type");
	if (typeCells.length > 0) return extractText(typeCells[0]);
	const cells = findElements(row, "td");
	return cells[3] ? extractText(cells[3]) : "";
}

/** Helper: Extracts the room link from a row. */
function extractRoomHref(row: any): string {
	const aTags = findElements(row, "a");
	if (aTags.length > 0) {
		const hrefAttr = aTags[0].attrs?.find((attr: any) => attr.name === "href");
		return hrefAttr ? hrefAttr.value : "";
	}
	return "";
}

/** Processes a single row into a Room instance or returns null if invalid. */
function processRoomRow(
	row: any,
	buildingInfo: { shortname: string; fullname?: string; address: string; lat: number; lon: number; }
): Room | null {
	const cells = findElements(row, "td");
	const cellsLength = 4;
	if (cells.length < cellsLength) return null;
	const roomNumber = extractRoomNumber(row);
	const capacity = extractCapacity(row);
	const furniture = extractFurniture(row);
	const roomType = extractRoomType(row);
	const roomHref = extractRoomHref(row);
	if (roomNumber && !isNaN(capacity)) {
		return new Room(
			buildingInfo.fullname || buildingInfo.shortname,
			buildingInfo.shortname,
			roomNumber,
			buildingInfo.address,
			buildingInfo.lat,
			buildingInfo.lon,
			capacity,
			roomType,
			furniture,
			roomHref
		);
	}
	return null;
}

/** Helper: Returns rows from a table, skipping header if present. */
function getRoomRows(roomTable: any): any[] {
	const allRows = findElements(roomTable, "tr");
	if (allRows.length === 0) return [];
	return findElements(allRows[0], "th").length > 0 ? allRows.slice(1) : allRows;
}

/** Extracts room data from a room table. */
export function extractRoomsFromTable(
	roomTable: any,
	buildingInfo: { shortname: string; address: string; lat: number; lon: number; fullname?: string }
): Room[] {
	return getRoomRows(roomTable)
		.map(row => processRoomRow(row, buildingInfo))
		.filter(r => r !== null) as Room[];
}

/** Helper: Extracts the building full name from the document. */
function getBuildingFullName(document: any, buildingInfo: { fullname?: string; shortname: string }): string {
	const h1Elements = findElements(document, "h1");
	for (const h1 of h1Elements) {
		const text = extractText(h1);
		if (text) return text;
	}
	return buildingInfo.fullname || buildingInfo.shortname;
}

/** Helper: Finds the room table in the document. */
function findRoomTableInDocument(tables: any[]): any | null {
	const byClass = tables.find(t => findElements(t, "td", "views-field-field-room-number").length > 0);
	if (byClass) return byClass;
	return tables.find(t => {
		const rows = findElements(t, "tr");
		if (rows.length === 0) return false;
		const headerText = rows[0].childNodes ? rows[0].childNodes.map((n: any) => n.value || "").join(" ").toLowerCase() : "";
		return headerText.includes("room") && headerText.includes("capacity") &&
			headerText.includes("furniture") && headerText.includes("room type");
	}) || null;
}

/** Parses a building HTML file and extracts room information as Room instances. */
export function parseBuildingHtml(
	html: string,
	buildingInfo: { shortname: string; address: string; lat: number; lon: number; fullname?: string }
): Room[] {
	const document = parse5.parse(html);
	const tables = findElements(document, "table");
	const fullName = getBuildingFullName(document, buildingInfo);
	const infoForRows = { ...buildingInfo, fullname: fullName };
	const roomTable = findRoomTableInDocument(tables);
	if (!roomTable) return [];
	return extractRoomsFromTable(roomTable, infoForRows);
}
