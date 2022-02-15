const util = require("minecraft-server-util");

const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

require("dotenv").config();

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
  constructor({ host, port = 25565, token }) {
    this.host = host;
    this.port = port;
    this.token = token;
    this.client = new Discord.Client({
      intents: [Discord.Intents.FLAGS.GUILDS],
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
          players: { online: onlinePlayers },
          motd: { clean: description },
          favicon,
        }) => {
          this.setBotStatus({
            status: onlinePlayers ? "online" : "idle",
            nickname: "Online: " + onlinePlayers.toLocaleString(),
            customtext: description,
            avatar: favicon ?? defaultImg,
          });
        }
      )
      .catch((e) => {
        if (e.code == "ECONNREFUSED") {
          this.setBotStatus({
            status: "dnd",
            nickname: "Offline",
            customtext: "",
            avatar: offline,
          });
        } else {
          util
            .statusLegacy(this.host, this.port)
            .then(
              ({
                players: { online: onlinePlayers },
                motd: { clean: description },
              }) => {
                this.setBotStatus({
                  status: onlinePlayers ? "online" : "idle",
                  nickname: "Online: " + onlinePlayers.toLocaleString(),
                  customtext: description,
                  avatar: defaultImg,
                });
              }
            )
            .catch(() => {
              this.setBotStatus({
                status: "dnd",
                nickname: "Offline",
                customtext: "",
                avatar: offline,
              });
            });
        }
      });
  }

  /** Sets the bot's status, nickname, presence information, and avatar
   *
   * @param {Object} config Configuration for setting the bot's status
   * @param {string} config.status The status of the bot (online, idle, dnd, or invisible)
   * @param {string} config.nickname The text in the bot's nickname to set inside parentheses after the hostname of the bot
   * @param {string} config.customtext The text to display for the bot's "Playing" presence
   * @param {string} config.avatar The base64-encoded image to set for the bot's avatar
   *
   */
  async setBotStatus({ status, nickname, customtext, avatar }) {
    this.client.user.setStatus(status);

    Promise.all(
      this.guilds.map((id) => {
        return (async () => {
          await this.client.guilds.cache
            .get(id)
            .members.cache.get(this.client.user.id)
            .setNickname(
              this.host +
                (this.port != 25565 ? ":" + this.port : "") +
                " (" +
                nickname +
                ")"
            );
        })();
      })
    );

    await this.client.user.setActivity(customtext, { type: "PLAYING" });

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
  }
}

Promise.all(
  JSON.parse(process.env.SERVERS).map(async (c) => {
    c = await new Client(c).init();
    await c.update();
    return c;
  })
).then((bots) => {
  setInterval(() => {
    bots.forEach((bot) => {
      bot.update();
    });
  }, process.env.RATE);
});
