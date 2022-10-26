const util = require('minecraft-server-util');
const Discord = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');

/** The image to be used when the server is offline */
const offline =
  "data:image/png;base64," +
  fs.readFileSync(path.join(__dirname, "img/offline.png"), "base64");

/** The image to be used when the server does not provide an icon */
const defaultImg =
  "data:image/png;base64," +
  fs.readFileSync(path.join(__dirname, "img/default.png"), "base64");

class Client {
  /** Manages an individual Minecraft server & discord bot combination
   *
   * @param {Object} config Configuration for the client
   * @param {string} config.token The Discord bot token
   * @param {string} config.host The hostname of the Minecraft server to query
   * @param {number} [config.port=25565] The port of the Minecraft server to query
   */
  constructor({ token, host, port = 25565 }) {
    this.host = host;
    this.port = port;
    this.token = token;
    this.client = new Discord.Client({
      intents: [Discord.GatewayIntentBits.Guilds],
    });
    this.avatarTimeout = false;
  }

  /** Initializes the Discord client */
  async init() {
    await this.client.login(this.token);
    this.guilds = this.client.guilds.cache.map((guild) => guild.id);

    this.currentAvatar = this.client.user.avatarURL()
      ? await axios.get(this.client.user.avatarURL(), {
        responseType: "arraybuffer",
      })
      : null;

    return this;
  }

  /** Runs the update process to set the status of the bot */
  async update() {
    util
      .status(this.host, this.port)
      .then(
        ({
          players: {
            online: onlinePlayers,
            sample: players
          },
          favicon,
          motd: {
            clean: name
          }
        }) => {
          this.setBotStatus({
            status: onlinePlayers ? "online" : "idle",
            customtext: "Online: " + onlinePlayers.toLocaleString(),
            avatar: favicon ?? defaultImg,
            players: players,
            name: name
          });
        }
      )
      .catch((e) => {
        if (e.code == "ECONNREFUSED") {
          this.setBotStatus({
            status: "dnd",
            customtext: "Offline",
            avatar: offline,
            players: [],
            name: 'Server Offline'
          });
        }
      });
  }

  /** Sets the bot's status, nickname, presence information, and avatar
   *
   * @param {Object} config Configuration for setting the bot's status
   * @param {string} config.status The status of the bot (online, idle, dnd, or invisible)
   * @param {string} config.customtext The text to display for the bot's "Playing" presence
   * @param {string} config.avatar The base64-encoded image to set for the bot's avatar
   *
   */
  async setBotStatus({ status, customtext, avatar, players, name }) {
    const self = this;

    // update presence
    this.client.user.setPresence({
      status: status,
      activities: [{
        name: customtext,
        type: 0
      }]
    });

    // update avatar
    if (this.currentAvatar != avatar && !this.avatarTimeout) {
      try {
        await this.client.user.setAvatar(avatar);
        this.currentAvatar = avatar;
      } catch (e) {
      } finally {
        this.avatarTimeout = true;
        setTimeout(
          (() => {
            this.avatarTimeout = false;
          }).bind(this),
          600000
        );
      }
    }

    // build status message
    const statusEmbed = new Discord.EmbedBuilder()
      .setColor(0xab353)
      .setAuthor({ name: name });
    let numOnline = 0;
    if (players != null && players.length != 0) {
      numOnline = players.length;
    }
    statusEmbed.setTitle(`Players Online:  ${numOnline}`);
    statusEmbed
      .setTimestamp()
      .setFooter({
        text: this.host + (this.port != 25565 ? ":" + this.port : "")
      });
    let statusEmbeds = [statusEmbed]
    if (numOnline > 0) {
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const embed = new Discord.EmbedBuilder()
        .setColor(0x7a5746)
        .setAuthor({ name: player.name, iconURL: `https://crafthead.net/avatar/${player.id}` });
        statusEmbeds.push(embed);
      }
    }
    const statusMessage = {
      content: '',
      embeds: statusEmbeds,
    };

    // update status message
    if (config.STATUS_CHANNELS != null) {
      for (let i = 0; i < config.STATUS_CHANNELS.length; i++) {
        const id = config.STATUS_CHANNELS[i];
        this.client.channels.fetch(id)
          .then(channel => {
            if (channel.isTextBased()) {
              channel.messages.fetch({ limit: 1 }).then(msgs => {
                const msg = msgs.at(0);
                if (msg.author.id == self.client.user.id) {
                  msg.edit(statusMessage);
                } else {
                  channel.messages.fetch({ limit: 10 }).then(msgs => msgs.each(msg => {
                    if (msg.author.id == self.client.user.id) {
                      msg.delete();
                    }
                  }));
                  channel.send(statusMessage);
                }
              });
            }
          })
          .catch(console.error);
      }
    }

    // update nickname
    Promise.all(
      this.guilds.map((id) => {
        return (async () => {
          this.client.guilds.cache
            .get(id)
            .members.cache.get(this.client.user.id)
            .setNickname(
              this.host +
              (this.port != 25565 ? ":" + this.port : "")
            );
        })();
      })
    );
  }
}

Promise.all(
  config.SERVERS.map(async (c) => {
    c = await new Client(c).init();
    await c.update();
    return c;
  })
).then((bots) => {
  setInterval(() => {
    bots.forEach((bot) => {
      bot.update();
    });
  }, config.RATE);
});
