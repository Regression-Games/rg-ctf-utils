import { Vec3 } from 'vec3';
import { RGBot } from 'rg-bot';
import { RGMatchInfo } from 'rg-match-info';
import { Entity } from 'prismarine-entity';
import { Block } from 'prismarine-block';
import pathfinder from 'mineflayer-pathfinder';

const { GoalNear } = pathfinder.goals;

/**
 * A set of event names that are emitted by the RGCTFUtils class, which
 * can be registered on an RGBot.
 */
export class CTFEvent {
  /**
   * Triggered when a flag is obtained by any player. Provides the player username that collected the flag.
   * When registering for this event, your callback should take the following args:
   * - collector: string - The username of the entity that collected the flag
   * @example
   * bot.on(CTFEvent.FLAG_OBTAINED, async (collector: string) => {
   *     // If I was the one to obtain the flag, go and score!
   *     if (collector == bot.username()) {
   *         await rgctfUtils.scoreFlag();
   *     }
   * });
   * @type {string}
   * @public
   * @static
   * @readonly
   */
  public static readonly FLAG_OBTAINED = 'rg_flagObtained';

  /**
   * Triggered when the flag becomes available to pick up, either by being dropped or spawned.
   * When registering for this event, your callback should take the following args:
   *  - position: Vec3 - The location of the now-available flag
   * @example
   * bot.on(CTFEvent.FLAG_AVAILABLE, async (position: Vec3) => {
   *     bot.chat("Flag is available, going to get it")
   *     await rgctfUtils.approachFlag();
   * })
   * @type {string}
   * @public
   * @static
   * @readonly
   */
  public static readonly FLAG_AVAILABLE = 'rg_flagAvailable';

  /**
   * Triggered when a flag is scored in a base.
   * When registering for this event, your callback should take the following args:
   *  - teamName: string - The name of the team that scored the flag
   * @example
   * bot.on(CTFEvent.FLAG_SCORED, async (teamName: string) => {
   *     // After scoring, send a message in the chat
   *     bot.chat(`Flag scored by ${teamName} team, waiting until it respawns`)
   * })
   * @type {string}
   * @public
   * @static
   * @readonly
   */
  public static readonly FLAG_SCORED = 'rg_flagScored';

  /**
   * Triggered when an item is detected, either by being dropped or spawned. Includes the item reference for simplicity,
   * and the entity reference for more advanced use cases.
   * When registering for this event, your callback should take the following args:
   *  - item: Item - The Item object that has been spawned or dropped
   *  - entity: Entity - The Entity object that has been spawned or dropped (useful for getting position and other
   *                     information.
   * @example
   * bot.on(CTFEvent.ITEM_DETECTED, (item: Item, entity: Entity) => {
   *     bot.chat(`I see that a ${item.name} has spawned`)
   * })
   * @type {string}
   * @public
   * @static
   * @readonly
   */
  public static readonly ITEM_DETECTED = 'rg_itemDetected';

  /**
   * Triggered when an item is collected by any player. Must be in range of the player to detect this event.
   * When registering for this event, your callback should take the following args:
   *  - collector: Entity - The entity that collected the item
   *  - item: Item - The item that was collected
   * @example
   * bot.on(CTFEvent.ITEM_COLLECTED, (collector: Entity, item: Item) => {
   *     bot.chat(`I see that ${collector.username} picked up ${item.name}`)
   * })
   * @type {string}
   * @public
   * @static
   * @readonly
   */
  public static readonly ITEM_COLLECTED = 'rg_itemCollected';
}

/**
 * A collection of utilities for the Capture the Flag game mode.
 * Includes location of points of interest, simplified functions
 * for gathering and scoring the flag, and utilities for finding
 * both teammates and enemies.
 *
 * When using this class, it will register a set of listeners on RGBot,
 * which helps with reacting to CTF game mode events. See the examples
 * within the `CTFEvent` documentation for more information.
 */
export default class RGCTFUtils {
  // A reference to the bot using these utilities
  private bot: RGBot;

  /**
   * Name / identifier of the flag that spawns at the center of the map
   * @type {string}
   * @public
   * @readonly
   */
  public readonly NEUTRAL_FLAG_NAME = 'white_banner';

  /**
   * A shorthand identifier for any flag (i.e. blue_banner, red_banner, etc...)
   * @type {string}
   * @public
   * @readonly
   */
  public readonly FLAG_SUFFIX = 'banner';

  /**
   * The center location of the scoring zone for blue team bots
   * @type {Vec3}
   * @public
   * @readonly
   */
  public readonly BLUE_SCORE_LOCATION: Vec3 = new Vec3(160, 63, -386);

  /**
   * The center location of the scoring zone for red team bots
   * @type {Vec3}
   * @public
   * @readonly
   */
  public readonly RED_SCORE_LOCATION = new Vec3(32, 63, -386);

  /**
   * The location of the neutral flag spawn
   * @type {Vec3}
   * @public
   * @readonly
   */
  public readonly FLAG_SPAWN: Vec3 = new Vec3(96, 64, -386);

  /**
   * The last match info, used to determine if a flag pickup or capture has happened
   * @type {string[]}
   * @private
   */
  private lastMatchInfo: RGMatchInfo | null = null;

  /**
   * A boolean to control whether debug statements for the library are printed to the console. Defaults to false.
   * @type {boolean}
   * @private
   */
  private debug = false;

  /**
   * Private function for logging debug statements. Enable via the publicly accessible
   * debug flag.
   * @see{debug}
   * @param {string} message The message to log
   * @example
   * this.logDebug("This is some debug message")
   * @private
   */
  private logDebug(message: string) {
    if (this.debug) {
      console.debug(`[CTF Utils] ${message}`);
    }
  }

  /**
   * Creates a new instance of the CTF utilities, attached to an RGBot
   * @example
   * const rgctfUtils = new RGCTFUtils(bot);
   * @param {RGBot} bot The bot to use when calling these utilities
   */
  constructor(bot: RGBot) {
    this.bot = bot;

    // Emit CTF-specific events

    /**
     * When the flag spawns, let the bot know where it is
     */
    bot
      .mineflayer()
      .on('blockUpdate', (oldBlock: Block | null, newBlock: Block) => {
        if (
          newBlock.position.equals(this.FLAG_SPAWN) &&
          newBlock.name.includes(this.FLAG_SUFFIX)
        ) {
          this.bot.emit(CTFEvent.FLAG_AVAILABLE, this.FLAG_SPAWN);
        }
      });

    /**
     * When a player picks up an object, fire off a flagObtained event if they
     * picked up the banner, and then emit the itemCollected event with our more
     * simplified item object (vs an entity).
     */
    bot.on('playerCollect', (collector: Entity, collected: Entity) => {
      const item = bot.getItemDefinitionById(
        (collected.metadata[8] as any).itemId
      );
      this.bot.emit(CTFEvent.ITEM_COLLECTED, collector, item);
    });

    /**
     * When an item is dropped, if it's the flag, emit the flagAvailable event.
     * Otherwise, simply emit that an item is detected.
     */
    bot.on('itemDrop', (entity: Entity) => {
      const itemId = (entity.metadata[8] as any)?.itemId;
      if (itemId) {
        const item = bot.getItemDefinitionById(itemId);
        if (item.name.includes(this.FLAG_SUFFIX)) {
          this.bot.emit(CTFEvent.FLAG_AVAILABLE, item);
        }
        this.bot.emit(CTFEvent.ITEM_DETECTED, item, entity);
      }
    });

    /**
     * When an item is spawned, if it's the flag, emit the flagAvailable event.
     * Otherwise, simply emit that an item is detected.
     */
    bot.on('entitySpawn', (entity: Entity) => {
      const itemId = (entity.metadata[8] as any)?.itemId;
      if (itemId) {
        const item = bot.getItemDefinitionById(itemId);
        if (item.name.includes(this.FLAG_SUFFIX)) {
          this.bot.emit(CTFEvent.FLAG_AVAILABLE, entity.position);
        }
        this.bot.emit(CTFEvent.ITEM_DETECTED, item, entity);
      }
    });

    /**
     * When the score is updated, detect if the flag was scored via flag captures change
     * TODO(REG-708): This does not always fire immediately, so sometimes there is a lag between
     *                when a player scores/picks up the flag, and when it sees that it did. We should
     *                make sure to use real entity pick up events to detect this later.
     */
    bot.on('score_update', (matchInfo: RGMatchInfo) => {
      // Detect flag captures
      matchInfo?.teams.forEach((team) => {
        const newCaptures = team.metadata.flagCaptures || 0;
        const oldCaptures =
          this.lastMatchInfo?.teams.find((t) => t.name == team.name)?.metadata
            .flagCaptures ?? 0;
        if (newCaptures !== oldCaptures) {
          this.bot.emit(CTFEvent.FLAG_SCORED, team.name);
        }
      });
      // Detect flag pickups
      matchInfo?.players.forEach((player) => {
        const newPickups = player.metadata.flagPickups || 0;
        const oldPickups =
          this.lastMatchInfo?.players.find((p) => p.username == player.username)
            ?.metadata.flagPickups ?? 0;
        if (newPickups !== oldPickups) {
          this.bot.emit(CTFEvent.FLAG_OBTAINED, player.username);
        }
      });
      this.lastMatchInfo = matchInfo;
    });

    this.logDebug(
      'Setup CTF event handlers. These can be registered directly onto RGBot - see the CTFEvent class'
    );
  }

  /**
   * Sets the debug state of this plugin - true if you want to see debug statements, false otherwise
   * @param {boolean} debug Whether or not to print debug statements
   */
  setDebug(debug: boolean) {
    this.debug = debug;
  }

  /**
   * Gets the location of either the neutral flag OR a team's flag on the ground.
   * @example
   * const flagLocation = ctfutils.getFlagLocation();
   * if (flagLocation) await bot.approachPosition(flagLocation);
   * @returns {Vec3 | null} The location of either the neutral flag OR a team's flag on the ground.
   */
  getFlagLocation(): Vec3 | null {
    let flagPosition = this.bot.findBlock(this.NEUTRAL_FLAG_NAME, {
      maxDistance: 100,
      partialMatch: false,
    })?.position;
    if (!flagPosition) {
      flagPosition = this.bot.findItemOnGround(this.FLAG_SUFFIX, {
        maxDistance: 100,
        partialMatch: true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
      })?.position;
    }
    return flagPosition;
  }

  /**
   * Commands the bot to move toward the current flag location, if the flag exists. This will not follow
   * the flag, but will simply move the bot to the location of the flag when this command is called.
   * @see{getFlagLocation}
   * @example
   * await bot.approachFlag();
   * @returns {Promise<boolean>} true if the bot reached the location, false otherwise
   */
  async approachFlag(): Promise<boolean> {
    const flagLocation = this.getFlagLocation();
    if (flagLocation) {
      return await this.bot.approachPosition(flagLocation, { reach: 0.1 });
    }
    return false;
  }

  /**
   * Commands the bot to score the flag in your team's base.
   * @example
   * if (rgctfUtils.hasFlag()) {
   *     await rgctfUtils.scoreFlag();
   * }
   * @returns {Promise<boolean>} true if the bot reached the scoring zone, and false otherwise
   */
  async scoreFlag(): Promise<boolean> {
    const myTeam = this.bot.getMyTeam();
    const scoreLocation =
      myTeam == 'BLUE' ? this.BLUE_SCORE_LOCATION : this.RED_SCORE_LOCATION;
    const goal = new GoalNear(
      scoreLocation.x,
      scoreLocation.y,
      scoreLocation.z,
      0.1
    );
    return await this.bot.handlePath(async () => {
      await this.bot.mineflayer().pathfinder.goto(goal);
    });
  }

  /**
   * Returns true if this bot has the flag, and false otherwise.
   * @example
   * if (rgctfUtils.hasFlag()) {
   *     await rgctfUtils.scoreFlag();
   * }
   * @returns {boolean} true if the bot has the flag, false otherwise
   */
  hasFlag(): boolean {
    return this.bot.inventoryContainsItem(this.FLAG_SUFFIX, {
      partialMatch: true,
    });
  }
}
