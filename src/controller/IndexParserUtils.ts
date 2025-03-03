// src/IndexParserUtils.ts
import * as parse5 from "parse5";

export interface BuildingData {
	shortname: string;
	address: string;
	href: string;
}

// Helper function to recursively search for elements by tag and class.
function findElementsByTagAndClass(node: any, tagName: string, className: string): any[] {
	let results: any[] = [];
	if (node.nodeName === tagName && node.attrs) {
		const classAttr = node.attrs.find((attr: any) => attr.name === "class");
		if (classAttr?.value.includes(className)) {
			results.push(node);
		}
	}
	if (node.childNodes) {
		for (const child of node.childNodes) {
			results = results.concat(findElementsByTagAndClass(child, tagName, className));
		}
	}
	return results;
}

/**
 * Parses the HTML content of index.htm and extracts building data.
 * @param html The content of index.htm.
 * @returns An array of building objects.
 */
export function parseIndexHtml(html: string): BuildingData[] {
	const document = parse5.parse(html);
	// Find all <td> elements with class "views-field-title" (which contains the building link).
	const titleTds = findElementsByTagAndClass(document, "td", "views-field-title");

	const buildings: BuildingData[] = [];

	titleTds.forEach(td => {
		// Look for the <a> tag inside the td
		const aTag = td.childNodes?.find((node: any) => node.nodeName === "a");
		if (aTag?.attrs) {
			const hrefAttr = aTag.attrs.find((attr: any) => attr.name === "href");
			// The shortname is usually the text content of the <a> element.
			const shortname = (aTag.childNodes?.[0]?.value)
				? aTag.childNodes[0].value.trim()
				: "";

			// Look for the sibling <td> that contains the building address.
			const parentRow = td.parentNode;
			let address = "";
			if (parentRow?.childNodes) {
				for (const sibling of parentRow.childNodes) {
					if (sibling.nodeName === "td") {
						const classAttr = sibling.attrs?.find((attr: any) => attr.name === "class");
						if (classAttr?.value.includes("views-field-field-building-address")) {
							address = sibling.childNodes.map((child: any) => child.value || "").join("").trim();
							break;
						}
					}
				}
			}

			if (hrefAttr && shortname && address) {
				buildings.push({
					shortname,
					address,
					href: hrefAttr.value
				});
			}
		}
	});

	return buildings;
}
