import { type BunRequest, serve } from "bun";
import consola from "consola";
import { z } from "zod";
import { mails, server } from ".";

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
});

consola.info(
	`Internal server running on http://localhost:${internalServer.port}.`,
);
