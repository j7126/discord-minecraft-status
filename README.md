# discord-minecraft-status

Discord bot that displays the status of a minecraft server. 

## Usage

Since the bot changes its avatar and status, each user must create run their own instance of the bot with their own bot.

Configuration is set up in config.json

- `RATE`: The rate in milliseconds that the bot will update the status of the server.
- `SERVERS`: Configure the bots and minecraft servers.
- `STATUS_CHANNELS`: the channel ids where the bot will put it's status message

Rename `config.example.json` to `config.json`

The same bot for one minecraft server can be added to multiple Discord servers and will update its status for each of them.

### Using the bot

If the bot's discord status is:

- **Online** - the server is online and there are players in it
- **Idle** - the server is online but there are no players connected
- **Do not disturb** - the server is offline/not responding to query packets

The bot's name will be the ip and port of the server, and it's status will be the number of online players.

The bot's icon will be set to the server's icon if it responds with one, otherwise it will be set to `img/default.png`. If the server is offline, the image will be set to `img/offline.png`.

The bot will send a status message in the configured channels showing the status of the server as well as the name and avatar of some players who are online.  
