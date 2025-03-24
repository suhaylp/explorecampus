import * as parse5 from "parse5";

export interface BuildingData {
	shortname: string;
	fullname: string;
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

function findElementsByTag(node: any, tag: string): any[] {
	let results: any[] = [];
	if (node.nodeName === tag) {
		results.push(node);
	}
	if (node.childNodes) {
		for (const child of node.childNodes) {
			results = results.concat(findElementsByTag(child, tag));
		}
	}
	return results;
}

function extractText(node: any): string {
	return node.childNodes
		? node.childNodes
				.map((child: any) => child.value || "")
				.join("")
				.trim()
		: "";
}

export function parseIndexHtml(html: string): BuildingData[] {
	const document = parse5.parse(html);
	const rows = findElementsByTag(document, "tr");
	const buildings: BuildingData[] = [];

	rows.forEach((row: any) => {
		const codeTd = findElementsByTagAndClass(row, "td", "views-field-field-building-code")[0];
		const titleTd = findElementsByTagAndClass(row, "td", "views-field-title")[0];
		const addressTd = findElementsByTagAndClass(row, "td", "views-field-field-building-address")[0];

		if (codeTd && titleTd && addressTd) {
			const code = extractText(codeTd);
			const aTag = titleTd.childNodes?.find((node: any) => node.nodeName === "a");
			const title = aTag ? extractText(aTag) : "";
			const hrefAttr = aTag?.attrs?.find((attr: any) => attr.name === "href");
			const href = hrefAttr ? hrefAttr.value : "";
			const address = extractText(addressTd);

			if (code && title && address && href) {
				buildings.push({ shortname: code, fullname: title, address, href });
			}
		}
	});

	return buildings;
}

//
// export function parseIndexHtml(html: string): BuildingData[] {
// 	const document = parse5.parse(html);
// 	const titleTds = findElementsByTagAndClass(document, "td", "views-field-title");
//
// 	const buildings: BuildingData[] = [];
//
// 	titleTds.forEach(td => {
// 		const aTag = td.childNodes?.find((node: any) => node.nodeName === "a");
// 		if (aTag?.attrs) {
// 			const hrefAttr = aTag.attrs.find((attr: any) => attr.name === "href");
// 			// The shortname is usually the text content of the <a> element.
// 			const shortname = (aTag.childNodes?.[0]?.value)
// 				? aTag.childNodes[0].value.trim()
// 				: "";
//
// 			const parentRow = td.parentNode;
// 			let address = "";
// 			if (parentRow?.childNodes) {
// 				for (const sibling of parentRow.childNodes) {
// 					if (sibling.nodeName === "td") {
// 						const classAttr = sibling.attrs?.find((attr: any) => attr.name === "class");
// 						if (classAttr?.value.includes("views-field-field-building-address")) {
// 							address = sibling.childNodes.map((child: any) => child.value || "").join("").trim();
// 							break;
// 						}
// 					}
// 				}
// 			}
//
// 			if (hrefAttr && shortname && address) {
// 				buildings.push({
// 					shortname,
// 					address,
// 					href: hrefAttr.value
// 				});
// 			}
// 		}
// 	});
//
// 	return buildings;
// }
