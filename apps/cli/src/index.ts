// #usr/bin/env bun

import { intro, log, outro, tasks } from "@clack/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { z } from "zod";

// config
const url = "http://localhost:3000";

console.log("");
intro("Welcome to the Trash Email CLI!");

// checking api and listen for updates
await tasks([
	{
		title: "Message API",
		task: async (message) => {
			const res = await fetch(`${url}/health`);
			// Do installation here
			return "API is running!";
		},
	},
]);

// client.ts

const email = "user@example.com";
const socket = new WebSocket(
	`ws://localhost:3000/listen?email=${encodeURIComponent(email)}}`,
);

socket.addEventListener("open", () => {
	log.info("Connected to the server!");
});

socket.addEventListener("message", async (event) => {
	const parse = await z
		.object({
			success: z.boolean(),
			email: z.string().optional(),
			error: z.string().optional(),
			receivedEmail: z
				.object({
					subject: z.string(),
					body: z.string(),
					from: z.string().email(),
					to: z.string().email().endsWith("@trash.company"),
				})
				.optional(),
		})
		.safeParseAsync(JSON.parse(event.data));

	if (!parse.success) {
		log.error(
			"The server responded with an invalid message! Please try again.",
		);
		process.exit(1);
	}

	if (parse.data.success !== true || parse.data.error !== undefined) {
		log.error("The server responded with an error! Please try again.");
		process.exit(1);
	}

	if (parse.data.email !== undefined) {
		log.info(`Your email is ${parse.data.email}.`);
	}

	if (parse.data.receivedEmail !== undefined) {
		const labelWidth = 9; // "Subject:" ist 8 Zeichen lang

		const content = [
			`${chalk.greenBright("Email Received")} ${parse.data.receivedEmail.from}`,
			`${chalk.gray("Subject:")} ${parse.data.receivedEmail.subject}`,
			`${chalk.gray("Body:")}    ${parse.data.receivedEmail.body}`,
		].join("\n");

		const box = boxen(content, {
			padding: 1,
			borderStyle: "round",
			borderColor: "gray",
			align: "left",
		});

		console.log(box);
	}
});

socket.addEventListener("close", () => {
	outro("Connection got closed! Bye!");
	process.exit(0);
});
