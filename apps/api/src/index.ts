import { init } from "@paralleldrive/cuid2";
import { type BunRequest, serve } from "bun";
import consola from "consola";
import { z } from "zod";

export const mails = new Map<
	string,
	{
		subject: string;
		body: string;
		from: string;
	}[]
>();

const createId = init({
	// the length of the id
	length: 10,
});

// @ts-expect-error
export const server = serve<{ email: string }>({
	port: 3000,
	routes: {
		"/health": () => {
			consola.log("Health check");
			return new Response("OK");
		},
	},
	fetch: (req) => {
		const url = new URL(req.url);

		if (url.pathname === "/listen") {
			const emailID = createId();

			consola.log(`Listening for emails from ${emailID}`);

			mails.set(`${emailID}@trash.company`, []);

			server.upgrade(req, {
				data: {
					email: `${emailID}@trash.company`,
				},
			});
		}
	},
	websocket: {
		async close(ws) {
			mails.delete(`${ws.data.email}@trash.company`);
		},
		async open(ws) {
			consola.log(`Opened WebSocket for ${ws.data.email}`);

			ws.subscribe(ws.data.email);

			ws.send(
				JSON.stringify({
					success: true,
					email: ws.data.email,
				}),
			);
		},
	},
});
consola.info(`Server running on http://localhost:${server.port}.`);
