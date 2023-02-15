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
Object.defineProperty(exports, "__esModule", { value: true });
const vec3_1 = require("vec3");
const events_1 = require("events");
const { GoalNear } = require('mineflayer-pathfinder').goals;
/**
 * A collection of utilities for the Capture the Flag game mode
 * Includes location of points of interest, simplified functions
 * for gathering and scoring the flag, and utilities for finding
 * both teammates and enemies.
 */
class RGCTFUtils {
    debugLog(message) {
        if (this.debug) {
            console.log(`[CTF Utils] ${message}`);
        }
    }
    constructor(bot) {
        this.FLAG_ITEM_NAME = "white_banner";
        this.FLAG_DROP_NAME = "banner";
        this.BLUE_SCORE_LOCATION = new vec3_1.Vec3(160, 63, -386);
        this.RED_SCORE_LOCATION = new vec3_1.Vec3(160, 63, -386);
        this.FLAG_SPAWN = new vec3_1.Vec3(96, 63, -386);
        this.CTF_EVENTS = ["flagObtained", "flagAvailable", "flagScored", "itemDetected", "itemCollected"];
        this.lastMatchInfo = null;
        this.debug = false;
        this.bot = bot;
        this.eventEmitter = new events_1.EventEmitter();
        // Emit CTF-specific events
        /**
         * When the flag spawns, let the bot know where it is
         */
        bot.mineflayer().on('blockUpdate', (oldBlock, newBlock) => {
            if (newBlock.position.equals(this.FLAG_SPAWN) && newBlock.name.includes(this.FLAG_DROP_NAME)) {
                this.eventEmitter.emit('flagAvailable', this.FLAG_SPAWN);
            }
        });
        /**
         * When a player picks up an object, fire off a flagObtained event if they
         * picked up the banner, and then emit the itemCollected event with our more
         * simplified item object (vs an entity).
         */
        bot.on('playerCollect', (collector, collected) => {
            // @ts-ignore
            const item = bot.getItemDefinitionById(collected.metadata[8].itemId);
            // @ts-ignore
            this.debugLog(`Detected player collect event - ${collector.username} ${item.name}`);
            this.debugLog(`Fired off itemCollected`);
            this.eventEmitter.emit('itemCollected', collector, item);
        });
        /**
         * When an item is dropped, if it's the flag, emit the flagAvailable event.
         * Otherwise, simply emit that an item is detected.
         */
        bot.on("itemDrop", (entity) => {
            var _a;
            // @ts-ignore
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
            // @ts-ignore
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
         */
        bot.on('score_update', (matchInfo) => {
            this.debugLog(`Score updated triggered`);
            // Detect flag captures
            matchInfo === null || matchInfo === void 0 ? void 0 : matchInfo.teams.forEach(team => {
                var _a, _b, _c;
                const newCaptures = team.metadata.flagCaptures || 0;
                const oldCaptures = (_c = (_b = (_a = this.lastMatchInfo) === null || _a === void 0 ? void 0 : _a.teams.find(t => t.name == team.name)) === null || _b === void 0 ? void 0 : _b.metadata.flagCaptures) !== null && _c !== void 0 ? _c : 0;
                if (newCaptures !== oldCaptures) {
                    this.debugLog("Determined that the score update was for a flag capture");
                    this.eventEmitter.emit('flagScored', team.name);
                }
            });
            // Detect flag pickups
            matchInfo === null || matchInfo === void 0 ? void 0 : matchInfo.players.forEach(player => {
                var _a, _b, _c;
                const newPickups = player.metadata.flagPickups || 0;
                const oldPickups = (_c = (_b = (_a = this.lastMatchInfo) === null || _a === void 0 ? void 0 : _a.players.find(p => p.username == player.username)) === null || _b === void 0 ? void 0 : _b.metadata.flagPickups) !== null && _c !== void 0 ? _c : 0;
                if (newPickups !== oldPickups) {
                    this.debugLog("Determined that the score update was for a flag pickup");
                    this.eventEmitter.emit('flagObtained', player.username);
                }
            });
            this.lastMatchInfo = matchInfo;
        });
    }
    /**
     * Gets the location of either the neutral flag OR a team's flag on the ground.
     * @return The location of either the neutral flag OR a team's flag on the ground.
     */
    getFlagLocation() {
        var _a, _b;
        let flagPosition = (_a = this.bot.findBlock(this.FLAG_ITEM_NAME, { maxDistance: 100, partialMatch: false })) === null || _a === void 0 ? void 0 : _a.position;
        if (!flagPosition) {
            // TODO(vontell): Test that this works
            // @ts-ignore
            flagPosition = (_b = this.bot.findItemOnGround(this.FLAG_DROP_NAME, { maxDistance: 100, partialMatch: true })) === null || _b === void 0 ? void 0 : _b.position;
        }
        return flagPosition;
    }
    /**
     * Commands the bot to move towards the flag location, if the flag exists.
     * @return true if the bot reached the flag, false otherwise
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
     * @return true if the bot reached the scoring zone, and false otherwise
     */
    scoreFlag() {
        return __awaiter(this, void 0, void 0, function* () {
            const myTeam = this.bot.getMyTeam();
            const scoreLocation = myTeam == "BLUE" ? this.RED_SCORE_LOCATION : this.BLUE_SCORE_LOCATION;
            const goal = new GoalNear(scoreLocation.x, scoreLocation.y, scoreLocation.z, 0.1);
            return yield this.bot.handlePath(() => __awaiter(this, void 0, void 0, function* () {
                yield this.bot.mineflayer().pathfinder.goto(goal);
            }));
        });
    }
    /**
     * Returns true if this bot has the flag, and false otherwise.
     */
    hasFlag() {
        return this.bot.inventoryContainsItem(this.FLAG_DROP_NAME, { partialMatch: true });
    }
    /**
     * Registers a callback to listen for a particular CTF event. Possible events are:
     * Events:
     *
     *   - flagObtained
     *     Description: Triggered when a flag is obtained by a player. Provides the player username that collected the
     *                  flag
     *     Args: (collector: string)
     *   - flagAvailable
     *     Description: Triggered when the flag becomes available to pick up, either by being dropped or spawned.
     *     Args: (position: Vec3)
     *   - flagScored
     *     Description: Triggered when a flag is scored in a base.
     *     Args: (teamName: string)
     *   - itemDetected
     *     Description: Triggered when an item is detected, either by being dropped or spawned. Includes the item
     *                  reference for simplicity, and the entity reference for more advanced use cases.
     *     Args: (item: Item, entity: Entity)
     *   - itemCollected
     *     Description: Triggered when an item is collected by a player.
     *     Args: (collector: Entity, item: Item)
     * @param event The event (must be on of the events in CTF_EVENTS
     * @param func A callback with the appropriate
     */
    on(event, func) {
        if (!this.CTF_EVENTS.includes(event)) {
            throw new Error(`Tried to register an event of "${event}", which is not included in the valid list of ${this.CTF_EVENTS}`);
        }
        this.eventEmitter.on(event, func);
    }
}
exports.default = RGCTFUtils;
