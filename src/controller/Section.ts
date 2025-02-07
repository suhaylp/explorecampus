export class Section {
	public uuid: string;
	public id: string;
	public title: string;
	public instructor: string;
	public dept: string;
	public year: number;
	public avg: number;
	public pass: number;
	public fail: number;
	public audit: number;

	constructor(
		uuid: any,
		id: any,
		title: any,
		instructor: any,
		dept: any,
		year: any,
		avg: any,
		pass: any,
		fail: any,
		audit: any
	) {
		this.uuid = String(uuid);
		this.id = String(id);
		this.title = String(title);
		this.instructor = String(instructor);
		this.dept = String(dept);
		this.year = Number(year);
		this.avg = Number(avg);
		this.pass = Number(pass);
		this.fail = Number(fail);
		this.audit = Number(audit);
	}
}
