import { init } from "@paralleldrive/cuid2";
import { serve } from "bun";
import consola from "consola";
import { z } from "zod";

const mails = new Map<
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
const server = serve<{ email: string }>({
	port: 3000,
	routes: {
		"/health": () => {
			return new Response("OK");
		},
	},
	fetch: (req) => {
		const url = new URL(req.url);

		if (url.pathname === "/listen") {
			const emailID = createId();

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

// local server. DO NOT EXPOSE THIS TO THE PUBLIC
const internalServer = serve({
	port: 3001,
	routes: {
		"/email/receive": {
			POST: async (req) => {
				const body = await req.json();

				const parse = await z
					.object({
						subject: z.string(),
						body: z.string(),
						from: z.string().email(),
						to: z.string().email().endsWith("@trash.company"),
					})
					.safeParseAsync(body);

				if (!parse.success) {
					return new Response(JSON.stringify(parse.error), {
						status: 400,
					});
				}

				const data = parse.data;

				if (!mails.has(data.to)) {
					return new Response("No address found", { status: 404 });
				}

				mails.get(data.to)?.push(data);

				server.publish(
					data.to,
					JSON.stringify({
						success: true,
						receivedEmail: data,
					}),
				);

				return new Response("OK");
			},
		},
	},
});

consola.info(
	`Server running on http://localhost:${server.port}. Internal server running on http://localhost:${internalServer.port}.`,
);
