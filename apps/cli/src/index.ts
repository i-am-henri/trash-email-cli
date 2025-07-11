// #usr/bin/env bun

import { intro, log, outro, tasks } from "@clack/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { z } from "zod";

// config
const url = "http://89.47.51.236:3000";

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

const socket = new WebSocket("ws://89.47.51.236:3000/listen");

socket.addEventListener("open", () => {
	log.info(
		"Connected to the server! Your connection gets closed after 120 seconds of inactivity.",
	);
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
		log.info(
			`Your email is ${parse.data.email}. We are listening for incoming mails!`,
		);
	}

	if (parse.data.receivedEmail !== undefined) {
		const labelWidth = 9; // "Subject:" ist 8 Zeichen lang

		const content = [
			`${chalk.gray("From:")}    ${parse.data.receivedEmail.from}`,
			`${chalk.gray("Subject:")} ${parse.data.receivedEmail.subject}`,
			`${chalk.gray("Body:")}    ${parse.data.receivedEmail.body}`,
		].join("\n");

		const box = boxen(content, {
			padding: 1,
			title: "Email Received",
			borderStyle: "round",
			borderColor: "gray",
			align: "left",
		});

		console.log("");
		console.log(box);
	}
});

socket.addEventListener("close", () => {
	outro("Connection got closed! Bye!");
	process.exit(0);
});

process.on("SIGINT", () => {
	socket.close();
	outro("Connection got closed! Bye!");
	process.exit(0);
});

process.on("SIGTERM", () => {
	socket.close();
	outro("Connection got closed! Bye!");
	process.exit(0);
});
