# discord-minecraft-status

Discord bot that updates the status of a minecraft server, including online status, player count, MOTD, and server icon easily viewable from your Discord server.

## Usage

Since the bot changes its avatar and status, each user must create run their own instance of the bot with their own bot.

Currently all of the configuration is set up in environment variables:

- `RATE`: The rate in milliseconds that the bot will update the status of the server.
- `SERVERS`: Contains a JSON stringified object to configure the bots and minecraft servers. Example configuration:

```jsonc
[
  {
    "token": "<discord bot token here>",
    "host": "mc.hypixel.net"
  },
  {
    "token": "<other discord bot token>",
    "host": "192.168.1.100",
    "port": 82951 // Optional - defaults to 25565
  }
]
```

The same bot for one minecraft server can be added to multiple Discord servers and will update its status for each of them.

### Using the bot

If the bot's discord status is:

- **Online** - the server is online and there are players in it
- **Idle** - the server is online but there are no players connected
- **Do not disturb** - the server is offline/not responding to query packets

The bot's icon will be set to the server's icon if it responds with one, otherwise it will be set to `img/default.png`. If the server is offline, the image will be set to `img/offline.png`.
