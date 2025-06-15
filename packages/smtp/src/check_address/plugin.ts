import axios from "axios";
import type { Connection, Next } from "../../types/parameter.js";
import type { This } from "../../types/this.js";

exports.hook_rcpt = async function (
	this: This,
	next: Next,
	connection: Connection,
) {
	const rcpt_to = connection.transaction.rcpt_to.map((rcpt) => rcpt.address());
	const rcpt = rcpt_to[0];

	this.loginfo(`Checking recipient ${rcpt}`);

	try {
		const res = await axios.post("http://89.47.51.236:3001/email/recipient", {
			email: `${rcpt}@trash.company`,
		});

		this.loginfo(JSON.stringify(res.data));

		if (!res.data || res.data.valid === false) {
			this.logerror(`Recipient ${rcpt} is not a valid recipient!`);
			return next(globalThis.DENY);
		}

		next(globalThis.OK);
	} catch (error) {
		this.logerror(`Error checking recipient ${rcpt}: ${error}`);
		return next(globalThis.DENY);
	}
};

exports.plugin = {
	name: "check_address",
};
