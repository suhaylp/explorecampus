import * as parse5 from "parse5";

export interface RoomData {
	rooms_fullname: string;
	rooms_shortname: string;
	rooms_number: string;
	rooms_name: string;
	rooms_address: string;
	rooms_lat: number;
	rooms_lon: number;
	rooms_seats: number;
	rooms_type: string;
	rooms_furniture: string;
	rooms_href: string;
}

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

function extractText(node: any): string {
	return node.childNodes ? node.childNodes.map((child: any) => child.value || "").join("").trim() : "";
}

function extractRoomNumber(row: any): string {
	const rnCells = findElements(row, "td", "views-field-field-room-number");
	if (rnCells.length > 0) {
		const cell = rnCells[0];
		const anchors = findElements(cell, "a");
		return anchors.length > 0 ? extractText(anchors[0]) : extractText(cell);
	}
	return "";
}

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

function extractFurniture(row: any): string {
	const furnCells = findElements(row, "td", "views-field-field-room-furniture");
	if (furnCells.length > 0) return extractText(furnCells[0]);
	const cells = findElements(row, "td");
	return cells[2] ? extractText(cells[2]) : "";
}

function extractRoomType(row: any): string {
	const typeCells = findElements(row, "td", "views-field-field-room-type");
	if (typeCells.length > 0) return extractText(typeCells[0]);
	const cells = findElements(row, "td");
	return cells[3] ? extractText(cells[3]) : "";
}

function extractRoomHref(row: any): string {
	const aTags = findElements(row, "a");
	if (aTags.length > 0) {
		const hrefAttr = aTags[0].attrs?.find((attr: any) => attr.name === "href");
		return hrefAttr ? hrefAttr.value : "";
	}
	return "";
}

function processRoomRow(
	row: any,
	buildingInfo: { shortname: string; fullname?: string; address: string; lat: number; lon: number; }
): RoomData | null {
	const cells = findElements(row, "td");
	const four = 4;
	if (cells.length < four) return null;
	const roomNumber = extractRoomNumber(row);
	const capacity = extractCapacity(row);
	const furniture = extractFurniture(row);
	const roomType = extractRoomType(row);
	const roomHref = extractRoomHref(row);
	if (roomNumber && !isNaN(capacity)) {
		const roomName = `${buildingInfo.shortname}_${roomNumber}`;
		return {
			rooms_fullname: buildingInfo.fullname || buildingInfo.shortname,
			rooms_shortname: buildingInfo.shortname,
			rooms_number: roomNumber,
			rooms_name: roomName,
			rooms_address: buildingInfo.address,
			rooms_lat: buildingInfo.lat,
			rooms_lon: buildingInfo.lon,
			rooms_seats: capacity,
			rooms_type: roomType,
			rooms_furniture: furniture,
			rooms_href: roomHref,
		};
	}
	return null;
}

function getRoomRows(roomTable: any): any[] {
	const allRows = findElements(roomTable, "tr");
	if (allRows.length === 0) return [];
	return findElements(allRows[0], "th").length > 0 ? allRows.slice(1) : allRows;
}

export function extractRoomsFromTable(
	roomTable: any,
	buildingInfo: { shortname: string; address: string; lat: number; lon: number; fullname?: string }
): RoomData[] {
	return getRoomRows(roomTable)
		.map(row => processRoomRow(row, buildingInfo))
		.filter(r => r !== null) as RoomData[];
}

function getBuildingFullName(document: any, buildingInfo: { fullname?: string; shortname: string }): string {
	const h1Elements = findElements(document, "h1");
	for (const h1 of h1Elements) {
		const text = extractText(h1);
		if (text) return text;
	}
	return buildingInfo.fullname || buildingInfo.shortname;
}

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

export function parseBuildingHtml(
	html: string,
	buildingInfo: { shortname: string; address: string; lat: number; lon: number; fullname?: string }
): RoomData[] {
	const document = parse5.parse(html);
	const tables = findElements(document, "table");
	// Extract full name from the document.
	const fullName = getBuildingFullName(document, buildingInfo);
	// Use the original shortname for constructing roomName.
	const infoForRows = { ...buildingInfo, fullname: fullName };
	const roomTable = findRoomTableInDocument(tables);
	if (!roomTable) return [];
	return extractRoomsFromTable(roomTable, infoForRows);
}
