"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vec3_1 = require("vec3");
const events_1 = require("events");
const mineflayer_pathfinder_1 = __importDefault(require("mineflayer-pathfinder"));
const { GoalNear } = mineflayer_pathfinder_1.default.goals;
/**
 * A collection of utilities for the Capture the Flag game mode
 * Includes location of points of interest, simplified functions
 * for gathering and scoring the flag, and utilities for finding
 * both teammates and enemies.
 */
class RGCTFUtils {
    /**
     * Private function for logging debug statements. Enable via the publicly accessible
     * debug flag.
     * @see{debug}
     * @param message The message to log
     * @example
     * this.debugLog("This is some debug message")
     * @private
     */
    debugLog(message) {
        if (this.debug) {
            console.log(`[CTF Utils] ${message}`);
        }
    }
    constructor(bot) {
        /**
         * Name / identifier of the flag that spawns at the center of the map
         * @type {string}
         * @public
         */
        this.FLAG_ITEM_NAME = 'white_banner';
        /**
         * A shorthand identifier for any banner (i.e. blue_banner, red_banner, etc...)
         * @type {string}
         * @public
         */
        this.FLAG_DROP_NAME = 'banner';
        /**
         * The center location of the scoring zone for blue team bots
         * @type {Vec3}
         * @public
         */
        this.BLUE_SCORE_LOCATION = new vec3_1.Vec3(160, 63, -386);
        /**
         * The center location of the scoring zone for red team bots
         */
        this.RED_SCORE_LOCATION = new vec3_1.Vec3(160, 63, -386);
        /**
         * The location of the neutral flag spawn
         * @type {Vec3}
         * @public
         */
        this.FLAG_SPAWN = new vec3_1.Vec3(96, 63, -386);
        /**
         * The list of events that can be listened to
         * @type {string[]}
         * @public
         */
        this.CTF_EVENTS = [
            'flagObtained',
            'flagAvailable',
            'flagScored',
            'itemDetected',
            'itemCollected',
        ];
        /**
         * The last match info, used to determine if a flag pickup or capture has happened
         * @type {string[]}
         * @private
         */
        this.lastMatchInfo = null;
        /**
         * A boolean to control whether debug statements for the library are printed to the console. Defaults to false.
         * @type {boolean}
         * @public
         */
        this.debug = false;
        this.bot = bot;
        this.eventEmitter = new events_1.EventEmitter();
        // Emit CTF-specific events
        /**
         * When the flag spawns, let the bot know where it is
         */
        bot
            .mineflayer()
            .on('blockUpdate', (oldBlock, newBlock) => {
            if (newBlock.position.equals(this.FLAG_SPAWN) &&
                newBlock.name.includes(this.FLAG_DROP_NAME)) {
                this.eventEmitter.emit('flagAvailable', this.FLAG_SPAWN);
            }
        });
        /**
         * When a player picks up an object, fire off a flagObtained event if they
         * picked up the banner, and then emit the itemCollected event with our more
         * simplified item object (vs an entity).
         */
        bot.on('playerCollect', (collector, collected) => {
            const item = bot.getItemDefinitionById(collected.metadata[8].itemId);
            this.debugLog(`Detected player collect event - ${collector.username} ${item.name}`);
            this.debugLog(`Fired off itemCollected`);
            this.eventEmitter.emit('itemCollected', collector, item);
        });
        /**
         * When an item is dropped, if it's the flag, emit the flagAvailable event.
         * Otherwise, simply emit that an item is detected.
         */
        bot.on('itemDrop', (entity) => {
            var _a;
            const itemId = (_a = entity.metadata[8]) === null || _a === void 0 ? void 0 : _a.itemId;
            this.debugLog(`Detected item drop event - id ${itemId}`);
            if (itemId) {
                const item = bot.getItemDefinitionById(itemId);
                if (item.name.includes(this.FLAG_DROP_NAME)) {
                    this.debugLog(`Fired off flagAvailable event`);
                    this.eventEmitter.emit('flagAvailable', item);
                }
                this.debugLog(`Also fired off itemDetected event from drop`);
                this.eventEmitter.emit('itemDetected', item, entity);
            }
        });
        /**
         * When an item is spawned, if it's the flag, emit the flagAvailable event.
         * Otherwise, simply emit that an item is detected.
         */
        bot.on('entitySpawn', (entity) => {
            var _a;
            const itemId = (_a = entity.metadata[8]) === null || _a === void 0 ? void 0 : _a.itemId;
            this.debugLog(`Detected that entity spawned - ${itemId}`);
            if (itemId) {
                const item = bot.getItemDefinitionById(itemId);
                this.debugLog(`The item that spawned was an ${item.name}`);
                if (item.name.includes(this.FLAG_DROP_NAME)) {
                    this.debugLog(`Fired off flagAvailable event from entity spawn`);
                    this.eventEmitter.emit('flagAvailable', entity.position);
                }
                this.debugLog(`Fired off item detected event from entity spawn`);
                this.eventEmitter.emit('itemDetected', item, entity);
            }
        });
        /**
         * When the score is updated, detect if the flag was scored via flag captures change
         * TODO: This does not always fire immediately, so sometimes there is a lag between
         *       when a player scores/picks up the flag, and when it sees that it did. We should
         *       make sure to use real entity pick up events to detect this later.
         */
        bot.on('score_update', (matchInfo) => {
            this.debugLog(`Score updated triggered`);
            // Detect flag captures
            matchInfo === null || matchInfo === void 0 ? void 0 : matchInfo.teams.forEach((team) => {
                var _a, _b, _c;
                const newCaptures = team.metadata.flagCaptures || 0;
                const oldCaptures = (_c = (_b = (_a = this.lastMatchInfo) === null || _a === void 0 ? void 0 : _a.teams.find((t) => t.name == team.name)) === null || _b === void 0 ? void 0 : _b.metadata.flagCaptures) !== null && _c !== void 0 ? _c : 0;
                if (newCaptures !== oldCaptures) {
                    this.debugLog('Determined that the score update was for a flag capture');
                    this.eventEmitter.emit('flagScored', team.name);
                }
            });
            // Detect flag pickups
            matchInfo === null || matchInfo === void 0 ? void 0 : matchInfo.players.forEach((player) => {
                var _a, _b, _c;
                const newPickups = player.metadata.flagPickups || 0;
                const oldPickups = (_c = (_b = (_a = this.lastMatchInfo) === null || _a === void 0 ? void 0 : _a.players.find((p) => p.username == player.username)) === null || _b === void 0 ? void 0 : _b.metadata.flagPickups) !== null && _c !== void 0 ? _c : 0;
                if (newPickups !== oldPickups) {
                    this.debugLog('Determined that the score update was for a flag pickup');
                    this.eventEmitter.emit('flagObtained', player.username);
                }
            });
            this.lastMatchInfo = matchInfo;
        });
    }
    /**
     * Gets the location of either the neutral flag OR a team's flag on the ground.
     * @example
     * const flagLocation = ctfutils.getFlagLocation();
     * if (flagLocation) await bot.approachPosition(flagLocation);
     * @returns {Vec3 | null} The location of either the neutral flag OR a team's flag on the ground.
     */
    getFlagLocation() {
        var _a, _b;
        let flagPosition = (_a = this.bot.findBlock(this.FLAG_ITEM_NAME, {
            maxDistance: 100,
            partialMatch: false,
        })) === null || _a === void 0 ? void 0 : _a.position;
        if (!flagPosition) {
            flagPosition = (_b = this.bot.findItemOnGround(this.FLAG_DROP_NAME, {
                maxDistance: 100,
                partialMatch: true,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
            })) === null || _b === void 0 ? void 0 : _b.position;
        }
        return flagPosition;
    }
    /**
     * Commands the bot to move toward the flag location, if the flag exists.
     * @example
     * await bot.approachFlag();
     * @returns {Promise<boolean>} true if the bot reached the flag, false otherwise
     */
    approachFlag() {
        return __awaiter(this, void 0, void 0, function* () {
            const flagLocation = this.getFlagLocation();
            if (flagLocation) {
                return yield this.bot.approachPosition(flagLocation, { reach: 0.1 });
            }
            return false;
        });
    }
    /**
     * Commands the bot to score the flag in your team's base.
     * @example
     * if (ctfUtils.hasFlag()) {
     *     await ctfUtils.scoreFlag();
     * }
     * @returns {Promise<boolean>} true if the bot reached the scoring zone, and false otherwise
     */
    scoreFlag() {
        return __awaiter(this, void 0, void 0, function* () {
            const myTeam = this.bot.getMyTeam();
            const scoreLocation = myTeam == 'BLUE' ? this.RED_SCORE_LOCATION : this.BLUE_SCORE_LOCATION;
            const goal = new GoalNear(scoreLocation.x, scoreLocation.y, scoreLocation.z, 0.1);
            return yield this.bot.handlePath(() => __awaiter(this, void 0, void 0, function* () {
                yield this.bot.mineflayer().pathfinder.goto(goal);
            }));
        });
    }
    /**
     * Returns true if this bot has the flag, and false otherwise.
     * @example
     * if (ctfUtils.hasFlag()) {
     *     await ctfUtils.scoreFlag();
     * }
     * @returns {boolean} true if the bot has the flag, false otherwise
     */
    hasFlag() {
        return this.bot.inventoryContainsItem(this.FLAG_DROP_NAME, {
            partialMatch: true,
        });
    }
    /**
     * @callback EventCallback
     * @param {...*} args The arguments that the callback will take
     * @returns {void}
     */
    /**
     * Registers a callback to listen for a particular CTF event. Possible events are:
     *   - "flagObtained"
     *     - Description: Triggered when a flag is obtained by any player. Provides the player username that collected the
     *                    flag
     *     - Args:
     *        - collector: string - The entity that collected the flag
     *   - "flagAvailable"
     *     - Description: Triggered when the flag becomes available to pick up, either by being dropped or spawned.
     *     - Args:
     *        - position: Vec3 - The location of the now-available flag
     *   - "flagScored"
     *     - Description: Triggered when a flag is scored in a base.
     *     - Args:
     *        - teamName: string - The name of the team that scored the flag
     *   - "itemDetected"
     *      - Description: Triggered when an item is detected, either by being dropped or spawned. Includes the item
     *                     reference for simplicity, and the entity reference for more advanced use cases.
     *      - Args:
     *        - item: Item - The Item object that has been spawned or dropped
     *        - entity: Entity - The Entity object that has been spawned or dropped (useful for getting position and other
     *                           information.
     *   - "itemCollected"
     *      - Description: Triggered when an item is collected by any player.
     *      - Args:
     *        - collector: Entity - The entity that collected the item
     *        - item: Item - The item that was collected
     * @example
     * ctfUtils.on('flagObtained', async (playerUsername: string) => {
     *     // If I was the one to obtain the flag, go and score!
     *     if (playerUsername == bot.username()) {
     *         await ctfUtils.scoreFlag();
     *     }
     * });
     * @example
     * ctfUtils.on('flagScored', async (team: string) => {
     *     // After scoring, print a message
     *     bot.chat(`Flag scored by ${team} team, waiting until it respawns`)
     * })
     * @example
     * ctfUtils.on('flagAvailable', async (position: Vec3) => {
     *     bot.chat("Flag is available, going to get it")
     *     await ctfUtils.approachFlag();
     * })
     * @example
     * ctfUtils.on('itemDetected', (item: Item) => {
     *     bot.chat(`I see that a ${item.name} has spawned`)
     * })
     * @example
     * ctfUtils.on('itemCollected', (collector: Entity, item: Item) => {
     *     bot.chat(`I see that ${collector.username} picked up ${item.name}`)
     * })
     * @param {string} event The event (must be on of the events in CTF_EVENTS
     * @param {EventCallback} func A callback with the appropriate arguments for the given event
     */
    on(event, func) {
        if (!this.CTF_EVENTS.includes(event)) {
            throw new Error(`Tried to register an event of "${event}", which is not included in the valid list of ${this.CTF_EVENTS}`);
        }
        this.eventEmitter.on(event, func);
    }
}
exports.default = RGCTFUtils;
