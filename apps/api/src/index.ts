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

const AUTH_TOKEN = process.env.AUTH_TOKEN ?? ""; // TODO: Replace with env var in production

function isAuthenticated(req: Request) {
	const authHeader = req.headers.get("authorization");
	return authHeader === `Bearer ${AUTH_TOKEN}`;
}

// @ts-expect-error
export const server = serve<{ email: string }>({
	port: 3000,
	routes: {
		"/health": () => {
			consola.log("Health check");
			return new Response("OK");
		},
		"/email/receive": {
			POST: async (req) => {
				if (!isAuthenticated(req)) {
					return new Response("Unauthorized", { status: 401 });
				}
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

				consola.log(`Received email from ${data.from} to ${data.to}`);

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
			"/email/recipient": {
				POST: async (req: BunRequest<"/email/recipient">) => {
					if (!isAuthenticated(req)) {
						return new Response("Unauthorized", { status: 401 });
					}
					const body = await req.json();

					const parse = await z
						.object({
							email: z.string(),
						})
						.safeParseAsync(body);
					if (!parse.success) {
						return new Response(JSON.stringify(parse.error), {
							status: 400,
						});
					}

					const data = parse.data;

					consola.log(`Checked email ${data.email}`);

					if (!mails.has(data.email)) {
						consola.error(`No address found for ${data.email}`);
						return new Response("No address found", { status: 404 });
					}

					return new Response("OK");
				},
			},
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
