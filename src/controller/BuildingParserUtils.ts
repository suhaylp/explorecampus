// src/BuildingParserUtils.ts
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

/**
 * Recursively searches for elements by tag name and, optionally, by class name.
 */
function findElements(node: any, tagName: string, className?: string): any[] {
	let results: any[] = [];
	if (node.nodeName === tagName) {
		if (className) {
			if (node.attrs) {
				const classAttr = node.attrs.find((attr: any) => attr.name === "class");
				if (classAttr?.value.includes(className)) {
					results.push(node);
				}
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

/**
 * Parses a building HTML file and extracts room information.
 * @param html The HTML content of the building file.
 * @param buildingInfo Building-level info: shortname, address, lat, lon, and optionally fullname.
 * @returns An array of RoomData objects.
 */
export function parseBuildingHtml(
	html: string,
	buildingInfo: { shortname: string; address: string; lat: number; lon: number; fullname?: string }
): RoomData[] {
	const document = parse5.parse(html);

	// Debug: Log the number of <table> elements found.
	const tables = findElements(document, "table");
	console.log(`DEBUG: Found ${tables.length} table(s) in building file for ${buildingInfo.shortname}`);

	// Try to extract the building full name from an <h1> element if present.
	let buildingFullName = buildingInfo.fullname || "";
	const h1Elements = findElements(document, "h1");
	if (h1Elements.length > 0) {
		for (const h1 of h1Elements) {
			const text = h1.childNodes ? h1.childNodes.map((child: any) => child.value || "").join("").trim() : "";
			if (text) {
				buildingFullName = text;
				break;
			}
		}
	}

	// First, try to locate a table using the expected CSS class.
	let roomTable: any = null;
	for (const table of tables) {
		const roomNumberCells = findElements(table, "td", "views-field-field-room-number");
		if (roomNumberCells.length > 0) {
			roomTable = table;
			console.log(`DEBUG: Using table with expected class for building ${buildingInfo.shortname}`);
			break;
		}
	}

	// Fallback: if no table was found by CSS class, check table headers for keywords.
	if (!roomTable) {
		for (const table of tables) {
			const rows = findElements(table, "tr");
			if (rows.length > 0) {
				let headerText = "";
				const thElements = findElements(rows[0], "th");
				if (thElements.length > 0) {
					headerText = thElements.map((cell: any) =>
						cell.childNodes ? cell.childNodes.map((c: any) => c.value || "").join(" ") : ""
					).join(" ").toLowerCase();
				} else {
					// If no <th>, try using the text in the first row's <td>s.
					headerText = rows[0].childNodes ? rows[0].childNodes.map((cell: any) => cell.value || "").join(" ") : "";
					headerText = headerText.toLowerCase();
				}
				console.log(`DEBUG: Table header text for building ${buildingInfo.shortname}: "${headerText}"`);
				if (headerText.includes("room") &&
					headerText.includes("capacity") &&
					headerText.includes("furniture") &&
					headerText.includes("room type")) {
					roomTable = table;
					console.log(`DEBUG: Using fallback table based on header keywords for building ${buildingInfo.shortname}`);
					break;
				}
			}
		}
	}

	if (!roomTable) {
		console.warn(`WARNING: No room table found for building ${buildingInfo.shortname}`);
		return [];
	}

	// Get all rows from the table.
	const allRows = findElements(roomTable, "tr");
	if (allRows.length === 0) return [];
	const firstRowTh = findElements(allRows[0], "th");
	const roomRows = firstRowTh.length > 0 ? allRows.slice(1) : allRows;

	const rooms: RoomData[] = [];

	roomRows.forEach(row => {
		const cells = findElements(row, "td");
		if (cells.length < 4) return;

		// Attempt to extract room number: try cell with expected class first.
		let roomNumber = "";
		const roomNumberCells = findElements(row, "td", "views-field-field-room-number");
		if (roomNumberCells.length > 0 && roomNumberCells[0].childNodes) {
			roomNumber = roomNumberCells[0].childNodes.map((child: any) => child.value || "").join("").trim();
		} else if (cells[0]?.childNodes) {
			roomNumber = cells[0].childNodes.map((child: any) => child.value || "").join("").trim();
		}

		// Extract capacity from expected cell.
		let capacityStr = "";
		const capacityCells = findElements(row, "td", "views-field-field-room-capacity");
		if (capacityCells.length > 0 && capacityCells[0].childNodes) {
			capacityStr = capacityCells[0].childNodes.map((child: any) => child.value || "").join("").trim();
		} else if (cells[1]?.childNodes) {
			capacityStr = cells[1].childNodes.map((child: any) => child.value || "").join("").trim();
		}
		const capacity = Number(capacityStr);

		// Extract furniture type.
		let furniture = "";
		const furnitureCells = findElements(row, "td", "views-field-field-room-furniture");
		if (furnitureCells.length > 0 && furnitureCells[0].childNodes) {
			furniture = furnitureCells[0].childNodes.map((child: any) => child.value || "").join("").trim();
		} else if (cells[2]?.childNodes) {
			furniture = cells[2].childNodes.map((child: any) => child.value || "").join("").trim();
		}

		// Extract room type.
		let roomType = "";
		const roomTypeCells = findElements(row, "td", "views-field-field-room-type");
		if (roomTypeCells.length > 0 && roomTypeCells[0].childNodes) {
			roomType = roomTypeCells[0].childNodes.map((child: any) => child.value || "").join("").trim();
		} else if (cells[3]?.childNodes) {
			roomType = cells[3].childNodes.map((child: any) => child.value || "").join("").trim();
		}

		// Extract "More info" link.
		let roomHref = "";
		const aTags = findElements(row, "a");
		if (aTags.length > 0) {
			const aTag = aTags[0];
			const hrefAttr = aTag.attrs?.find((attr: any) => attr.name === "href");
			if (hrefAttr) {
				roomHref = hrefAttr.value;
			}
		}

		if (roomNumber && !isNaN(capacity)) {
			const roomName = `${buildingInfo.shortname}_${roomNumber}`;
			rooms.push({
				rooms_fullname: buildingFullName || buildingInfo.shortname,
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
			});
		}
	});

	return rooms;
}
