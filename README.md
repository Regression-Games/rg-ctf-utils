# rg-ctf-utils

[![NPM](https://img.shields.io/npm/v/rg-ctf-utils.svg)](https://www.npmjs.com/package/rg-ctf-utils)

A collection of utilities for use in the Regression Games Capture the Flag game mode.

## Classes

<dl>
<dt><a href="#CTFEvent">CTFEvent</a></dt>
<dd><p>A set of event names that are emitted by the RGCTFUtils class, which
can be registered on an RGBot.</p></dd>
<dt><a href="#RGCTFUtils">RGCTFUtils</a></dt>
<dd></dd>
</dl>

## Members

<dl>
<dt><a href="#CTFEvent">CTFEvent</a></dt>
<dd><p>A collection of utilities for the Capture the Flag game mode.
Includes location of points of interest, simplified functions
for gathering and scoring the flag, and utilities for finding
both teammates and enemies.</p>
<p>When using this class, it will register a set of listeners on RGBot,
which helps with reacting to CTF game mode events. See the examples
within the <code>CTFEvent</code> documentation for more information.</p></dd>
</dl>


<br><a name="CTFEvent"></a>

## CTFEvent
> <p>A set of event names that are emitted by the RGCTFUtils class, which
> can be registered on an RGBot.</p>


<br><a name="RGCTFUtils"></a>

## RGCTFUtils

* [RGCTFUtils](#RGCTFUtils)
    * [new RGCTFUtils(bot)](#new_RGCTFUtils_new)
    * [.setDebug(debug)](#RGCTFUtils+setDebug)
    * [.getFlagLocation()](#RGCTFUtils+getFlagLocation) ⇒ <code>Vec3</code> \| <code>null</code>
    * [.approachFlag()](#RGCTFUtils+approachFlag) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.scoreFlag()](#RGCTFUtils+scoreFlag) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.hasFlag()](#RGCTFUtils+hasFlag) ⇒ <code>boolean</code>


<br><a name="new_RGCTFUtils_new"></a>

### new RGCTFUtils(bot)
> <p>Creates a new instance of the CTF utilities, attached to an RGBot</p>


| Param | Type | Description |
| --- | --- | --- |
| bot | <code>RGBot</code> | <p>The bot to use when calling these utilities</p> |

**Example**  
```js
const rgctfUtils = new RGCTFUtils(bot);
```

<br><a name="RGCTFUtils+setDebug"></a>

### rgctfUtils.setDebug(debug)
> <p>Sets the debug state of this plugin - true if you want to see debug statements, false otherwise</p>


| Param | Type | Description |
| --- | --- | --- |
| debug | <code>boolean</code> | <p>Whether or not to print debug statements</p> |


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
> <p>Commands the bot to move toward the current flag location, if the flag exists. This will not follow
> the flag, but will simply move the bot to the location of the flag when this command is called.</p>

**Returns**: <code>Promise.&lt;boolean&gt;</code> - <p>true if the bot reached the location, false otherwise</p>  
**See{getflaglocation}**:   
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
if (rgctfUtils.hasFlag()) {
    await rgctfUtils.scoreFlag();
}
```

<br><a name="RGCTFUtils+hasFlag"></a>

### rgctfUtils.hasFlag() ⇒ <code>boolean</code>
> <p>Returns true if this bot has the flag, and false otherwise.</p>

**Returns**: <code>boolean</code> - <p>true if the bot has the flag, false otherwise</p>  
**Example**  
```js
if (rgctfUtils.hasFlag()) {
    await rgctfUtils.scoreFlag();
}
```

<br><a name="CTFEvent"></a>

## CTFEvent
> <p>A collection of utilities for the Capture the Flag game mode.
> Includes location of points of interest, simplified functions
> for gathering and scoring the flag, and utilities for finding
> both teammates and enemies.</p>
> <p>When using this class, it will register a set of listeners on RGBot,
> which helps with reacting to CTF game mode events. See the examples
> within the <code>CTFEvent</code> documentation for more information.</p>


&copy; 2023 Regression Games, Inc.