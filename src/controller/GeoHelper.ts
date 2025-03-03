import http from "http";

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

/**
 * Fetches geolocation information for a given address.
 * @param address The address string (as found in your dataset).
 * @returns A promise that resolves with an object containing lat and lon.
 */
export async function fetchGeolocation(address: string): Promise<{ lat: number; lon: number }> {
	return new Promise((resolve, reject) => {
		// Since you are project_team299, use that in your URL.
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team299/${encodedAddress}`;

		http
			.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					try {
						const parsed = JSON.parse(data) as GeoResponse;
						if (parsed.error) {
							reject(new Error(parsed.error));
						} else if (parsed.lat !== undefined && parsed.lon !== undefined) {
							resolve({ lat: parsed.lat, lon: parsed.lon });
						} else {
							reject(new Error("Unexpected response format"));
						}
					} catch (err) {
						reject(err);
					}
				});
			})
			.on("error", (err) => {
				reject(err);
			});
	});
}
