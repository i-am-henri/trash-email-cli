**Haraka SMTP Server**

This is an inbound-only SMTP Server, written in Typescript with Haraka. It's listening for incoming emails on port 25, checks if they are spam and sends them to an internal api (`/apps/api`).

**Selfhosting**

You can easily selfhost this smtp server on your vps. You need the port **25** open, you need to install `node-fetch` globally, a domain to receive emails and [bun](https://bun.sh/).

1. Clone the entire repo.

```bash
git clone https://github.com/i-am-henri/trash-email-cli.git
````

2. Install the dependencies.

```bash
cd trash-email-cli
bun install
```

3. Start the server. This will start the internal api server, the public server and the smtp server.

```bash
bun run server:dev
```

4. Forward the port 3000 with caddy or nginx. Keep the port 3001 closed.

5. Edit the cli app and add your api url.