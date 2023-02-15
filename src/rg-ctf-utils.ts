import {Vec3} from "vec3";
import {RGBot} from "rg-bot";
import {EventEmitter} from "events";
import {RGMatchInfo} from "rg-match-info";
import {Entity} from 'prismarine-entity'
import {Block} from 'prismarine-block';
import {Item} from 'prismarine-item';
const { GoalNear } = require('mineflayer-pathfinder').goals

/**
 * A collection of utilities for the Capture the Flag game mode
 * Includes location of points of interest, simplified functions
 * for gathering and scoring the flag, and utilities for finding
 * both teammates and enemies.
 */
export default class RGCTFUtils {

    private bot: RGBot;
    private eventEmitter: EventEmitter;

    public FLAG_ITEM_NAME = "white_banner";
    public FLAG_DROP_NAME = "banner";
    public BLUE_SCORE_LOCATION = new Vec3(160, 63, -386)
    public RED_SCORE_LOCATION = new Vec3(160, 63, -386);
    public FLAG_SPAWN = new Vec3(96,63,-386)

    public CTF_EVENTS = ["flagObtained", "flagAvailable", "flagScored", "itemDetected", "itemCollected"];

    private lastMatchInfo: RGMatchInfo | null = null;

    public debug = false;

    debugLog(message: string) {
        if (this.debug) {
            console.log(`[CTF Utils] ${message}`)
        }
    }

    constructor(bot: RGBot) {
        this.bot = bot;
        this.eventEmitter = new EventEmitter();

        // Emit CTF-specific events

        /**
         * When the flag spawns, let the bot know where it is
         */
        bot.mineflayer().on('blockUpdate', (oldBlock: Block, newBlock: Block) => {
            if(newBlock.position.equals(this.FLAG_SPAWN) && newBlock.name.includes(this.FLAG_DROP_NAME)) {
                this.eventEmitter.emit('flagAvailable', this.FLAG_SPAWN);
            }
        })

        /**
         * When a player picks up an object, fire off a flagObtained event if they
         * picked up the banner, and then emit the itemCollected event with our more
         * simplified item object (vs an entity).
         */
        bot.on('playerCollect', (collector: Entity, collected: Entity) => {
            // @ts-ignore
            const item = bot.getItemDefinitionById((collected.metadata[8] as any).itemId)
            // @ts-ignore
            this.debugLog(`Detected player collect event - ${collector.username} ${item.name}`)
            this.debugLog(`Fired off itemCollected`)
            this.eventEmitter.emit('itemCollected', collector, item);
        })

        /**
         * When an item is dropped, if it's the flag, emit the flagAvailable event.
         * Otherwise, simply emit that an item is detected.
         */
        bot.on("itemDrop", (entity: Entity) => {
            // @ts-ignore
            const itemId = (entity.metadata[8] as any)?.itemId;
            this.debugLog(`Detected item drop event - id ${itemId}`)
            if (itemId) {
                const item = bot.getItemDefinitionById(itemId);
                if (item.name.includes(this.FLAG_DROP_NAME)) {
                    this.debugLog(`Fired off flagAvailable event`)
                    this.eventEmitter.emit('flagAvailable', item);
                }
                this.debugLog(`Also fired off itemDetected event from drop`)
                this.eventEmitter.emit('itemDetected', item, entity);
            }
        });

        /**
         * When an item is spawned, if it's the flag, emit the flagAvailable event.
         * Otherwise, simply emit that an item is detected.
         */
        bot.on('entitySpawn', (entity: Entity) => {
            // @ts-ignore
            const itemId = (entity.metadata[8] as any)?.itemId;
            this.debugLog(`Detected that entity spawned - ${itemId}`)
            if (itemId) {
                const item = bot.getItemDefinitionById(itemId)
                this.debugLog(`The item that spawned was an ${item.name}`)
                if (item.name.includes(this.FLAG_DROP_NAME)) {
                    this.debugLog(`Fired off flagAvailable event from entity spawn`)
                    this.eventEmitter.emit('flagAvailable', entity.position);
                }
                this.debugLog(`Fired off item detected event from entity spawn`)
                this.eventEmitter.emit('itemDetected', item, entity);
            }
        });

        /**
         * When the score is updated, detect if the flag was scored via flag captures change
         */
        bot.on('score_update', (matchInfo: RGMatchInfo) => {
            this.debugLog(`Score updated triggered`)
            // Detect flag captures
            matchInfo?.teams.forEach(team => {
                const newCaptures = team.metadata.flagCaptures || 0;
                const oldCaptures = this.lastMatchInfo?.teams.find(t => t.name == team.name)?.metadata.flagCaptures ?? 0;
                if (newCaptures !== oldCaptures) {
                    this.debugLog("Determined that the score update was for a flag capture")
                    this.eventEmitter.emit('flagScored', team.name);
                }
            });
            // Detect flag pickups
            matchInfo?.players.forEach(player => {
                const newPickups = player.metadata.flagPickups || 0;
                const oldPickups = this.lastMatchInfo?.players.find(p => p.username == player.username)?.metadata.flagPickups ?? 0;
                if (newPickups !== oldPickups) {
                    this.debugLog("Determined that the score update was for a flag pickup");
                    this.eventEmitter.emit('flagObtained', player.username)
                }
            });
            this.lastMatchInfo = matchInfo;
        });

    }

    /**
     * Gets the location of either the neutral flag OR a team's flag on the ground.
     * @return The location of either the neutral flag OR a team's flag on the ground.
     */
    getFlagLocation(): Vec3 | null {
        let flagPosition = this.bot.findBlock(this.FLAG_ITEM_NAME, {maxDistance: 100, partialMatch: false})?.position;
        if (!flagPosition) {
            // TODO(vontell): Test that this works
            // @ts-ignore
            flagPosition = this.bot.findItemOnGround(this.FLAG_DROP_NAME, {maxDistance: 100, partialMatch: true})?.position;
        }
        return flagPosition;
    }

    /**
     * Commands the bot to move towards the flag location, if the flag exists.
     * @return true if the bot reached the flag, false otherwise
     */
    async approachFlag(): Promise<boolean> {
        const flagLocation = this.getFlagLocation();
        if (flagLocation) {
            return await this.bot.approachPosition(flagLocation, {reach: 0.1});
        }
        return false;
    }

    /**
     * Commands the bot to score the flag in your team's base.
     * @return true if the bot reached the scoring zone, and false otherwise
     */
    async scoreFlag(): Promise<boolean> {
        const myTeam = this.bot.getMyTeam();
        const scoreLocation = myTeam == "BLUE" ? this.RED_SCORE_LOCATION : this.BLUE_SCORE_LOCATION;
        const goal = new GoalNear(scoreLocation.x, scoreLocation.y, scoreLocation.z, 0.1);
        return await this.bot.handlePath(async () => {
            await this.bot.mineflayer().pathfinder.goto(goal);
        });
    }

    /**
     * Returns true if this bot has the flag, and false otherwise.
     */
    hasFlag(): boolean {
        return this.bot.inventoryContainsItem(this.FLAG_DROP_NAME, {partialMatch: true})
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
    on(event: string, func: (...args: any[]) => void) {
        if (!this.CTF_EVENTS.includes(event)) {
            throw new Error(`Tried to register an event of "${event}", which is not included in the valid list of ${this.CTF_EVENTS}`)
        }
        this.eventEmitter.on(event, func);
    }

}