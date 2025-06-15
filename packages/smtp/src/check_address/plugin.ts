import fetch from "node-fetch";
import type { Connection, Next } from "../../types/parameter.js";
import type { This } from "../../types/this.js";

exports.hook_rcpt = async function (
	this: This,
	next: Next,
	connection: Connection,
) {
	const rcpt_to = connection.transaction.rcpt_to.map((rcpt) => rcpt.address());
	const rcpt = rcpt_to[0];

	this.loginfo("Checking recipient " + rcpt);

	const res = await fetch("http://localhost:3001/email/recipient", {
		method: "POST",
		body: JSON.stringify({
			email: rcpt,
		}),
	});

	this.loginfo(JSON.stringify(res));

	if (!res.ok) {
		this.logerror(`Recipient ${rcpt} is not a valid recipient!`);
		return next(DENY);
	}

	next(OK);
};

exports.plugin = {
	name: "check_address",
};
