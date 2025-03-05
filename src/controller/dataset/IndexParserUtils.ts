import * as parse5 from "parse5";

export interface BuildingData {
	shortname: string;
	address: string;
	href: string;
}

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


export function parseIndexHtml(html: string): BuildingData[] {
	const document = parse5.parse(html);
	const titleTds = findElementsByTagAndClass(document, "td", "views-field-title");

	const buildings: BuildingData[] = [];

	titleTds.forEach(td => {
		const aTag = td.childNodes?.find((node: any) => node.nodeName === "a");
		if (aTag?.attrs) {
			const hrefAttr = aTag.attrs.find((attr: any) => attr.name === "href");
			// The shortname is usually the text content of the <a> element.
			const shortname = (aTag.childNodes?.[0]?.value)
				? aTag.childNodes[0].value.trim()
				: "";

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
