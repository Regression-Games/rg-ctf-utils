# rg-ctf-utils

[![NPM](https://img.shields.io/npm/v/rg-ctf-utils.svg)](https://www.npmjs.com/package/rg-ctf-utils)

A collection of utilities for use in the Regression Games Capture the Flag game mode.

## Classes

<dl>
<dt><a href="#RGCTFUtils">RGCTFUtils</a></dt>
<dd><p>A collection of utilities for the Capture the Flag game mode
Includes location of points of interest, simplified functions
for gathering and scoring the flag, and utilities for finding
both teammates and enemies.</p></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#EventCallback">EventCallback</a> ⇒ <code>void</code></dt>
<dd></dd>
</dl>


<br><a name="RGCTFUtils"></a>

## RGCTFUtils
> <p>A collection of utilities for the Capture the Flag game mode
> Includes location of points of interest, simplified functions
> for gathering and scoring the flag, and utilities for finding
> both teammates and enemies.</p>


* [RGCTFUtils](#RGCTFUtils)
    * [.getFlagLocation()](#RGCTFUtils+getFlagLocation) ⇒ <code>Vec3</code> \| <code>null</code>
    * [.approachFlag()](#RGCTFUtils+approachFlag) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.scoreFlag()](#RGCTFUtils+scoreFlag) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.hasFlag()](#RGCTFUtils+hasFlag) ⇒ <code>boolean</code>
    * [.on(event, func)](#RGCTFUtils+on)


<br><a name="RGCTFUtils+getFlagLocation"></a>

### rgctfUtils.getFlagLocation() ⇒ <code>Vec3</code> \| <code>null</code>
> <p>Gets the location of either the neutral flag OR a team's flag on the ground.</p>

**Returns**: <code>Vec3</code> \| <code>null</code> - <p>The location of either the neutral flag OR a team's flag on the ground.</p>  
**Example**  
```js
const flagLocation = ctfutils.getFlagLocation();
if (flagLocation) await bot.approachPosition(flagLocation);
```

<br><a name="RGCTFUtils+approachFlag"></a>

### rgctfUtils.approachFlag() ⇒ <code>Promise.&lt;boolean&gt;</code>
> <p>Commands the bot to move toward the flag location, if the flag exists.</p>

**Returns**: <code>Promise.&lt;boolean&gt;</code> - <p>true if the bot reached the flag, false otherwise</p>  
**Example**  
```js
await bot.approachFlag();
```

<br><a name="RGCTFUtils+scoreFlag"></a>

### rgctfUtils.scoreFlag() ⇒ <code>Promise.&lt;boolean&gt;</code>
> <p>Commands the bot to score the flag in your team's base.</p>

**Returns**: <code>Promise.&lt;boolean&gt;</code> - <p>true if the bot reached the scoring zone, and false otherwise</p>  
**Example**  
```js
if (ctfUtils.hasFlag()) {
    await ctfUtils.scoreFlag();
}
```

<br><a name="RGCTFUtils+hasFlag"></a>

### rgctfUtils.hasFlag() ⇒ <code>boolean</code>
> <p>Returns true if this bot has the flag, and false otherwise.</p>

**Returns**: <code>boolean</code> - <p>true if the bot has the flag, false otherwise</p>  
**Example**  
```js
if (ctfUtils.hasFlag()) {
    await ctfUtils.scoreFlag();
}
```

<br><a name="RGCTFUtils+on"></a>

### rgctfUtils.on(event, func)
> <p>Registers a callback to listen for a particular CTF event. Possible events are:</p>
> <ul>
> <li>&quot;flagObtained&quot;
> <ul>
> <li>Description: Triggered when a flag is obtained by any player. Provides the player username that collected the
> flag</li>
> <li>Args:
> <ul>
> <li>collector: string - The entity that collected the flag</li>
> </ul>
> </li>
> </ul>
> </li>
> <li>&quot;flagAvailable&quot;
> <ul>
> <li>Description: Triggered when the flag becomes available to pick up, either by being dropped or spawned.</li>
> <li>Args:
> <ul>
> <li>position: Vec3 - The location of the now-available flag</li>
> </ul>
> </li>
> </ul>
> </li>
> <li>&quot;flagScored&quot;
> <ul>
> <li>Description: Triggered when a flag is scored in a base.</li>
> <li>Args:
> <ul>
> <li>teamName: string - The name of the team that scored the flag</li>
> </ul>
> </li>
> </ul>
> </li>
> <li>&quot;itemDetected&quot;
> <ul>
> <li>Description: Triggered when an item is detected, either by being dropped or spawned. Includes the item
> reference for simplicity, and the entity reference for more advanced use cases.</li>
> <li>Args:
> <ul>
> <li>item: Item - The Item object that has been spawned or dropped</li>
> <li>entity: Entity - The Entity object that has been spawned or dropped (useful for getting position and other
> information.</li>
> </ul>
> </li>
> </ul>
> </li>
> <li>&quot;itemCollected&quot;
> <ul>
> <li>Description: Triggered when an item is collected by any player.</li>
> <li>Args:
> <ul>
> <li>collector: Entity - The entity that collected the item</li>
> <li>item: Item - The item that was collected</li>
> </ul>
> </li>
> </ul>
> </li>
> </ul>


| Param | Type | Description |
| --- | --- | --- |
| event | <code>string</code> | <p>The event (must be on of the events in CTF_EVENTS</p> |
| func | [<code>EventCallback</code>](#EventCallback) | <p>A callback with the appropriate arguments for the given event</p> |

**Example**  
```js
ctfUtils.on('flagObtained', async (playerUsername: string) => {
    // If I was the one to obtain the flag, go and score!
    if (playerUsername == bot.username()) {
        await ctfUtils.scoreFlag();
    }
});
```
**Example**  
```js
ctfUtils.on('flagScored', async (team: string) => {
    // After scoring, print a message
    bot.chat(`Flag scored by ${team} team, waiting until it respawns`)
})
```
**Example**  
```js
ctfUtils.on('flagAvailable', async (position: Vec3) => {
    bot.chat("Flag is available, going to get it")
    await ctfUtils.approachFlag();
})
```
**Example**  
```js
ctfUtils.on('itemDetected', (item: Item) => {
    bot.chat(`I see that a ${item.name} has spawned`)
})
```
**Example**  
```js
ctfUtils.on('itemCollected', (collector: Entity, item: Item) => {
    bot.chat(`I see that ${collector.username} picked up ${item.name}`)
})
```

<br><a name="EventCallback"></a>

## EventCallback ⇒ <code>void</code>

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>\*</code> | <p>The arguments that the callback will take</p> |


&copy; 2023 Regression Games, Inc.