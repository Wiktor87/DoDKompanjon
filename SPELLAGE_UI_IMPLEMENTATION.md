# Spelläge (Game Mode) UI Implementation Guide

## Overview
This document describes the complete redesign of the Spelläge (Game Mode) UI for DMs, implementing a modern, information-dense interface optimized for iPad/laptop horizontal mode.

## Screenshot
![Spelläge UI](https://github.com/user-attachments/assets/cd179a6d-803a-40c0-9dcd-e07d978f472d)

## Key Features Implemented

### 1. Layout Structure
- **3-Column Grid Layout**: Heroes (1.5fr) | Monsters (0.8fr) | Sidebar (180px)
- **Dark Gradient Background**: `linear-gradient(180deg, #0d0d0d 0%, #1a1d24 100%)`
- **No Scrolling Required**: Main grid has overflow on individual columns, not the whole page
- **Compact Header**: Party name, round counter, and action buttons
- **Horizontal Initiative Bar**: Token-based display showing turn order

### 2. Color Scheme
```css
--gm-gold: #d4af37           /* Golden accent for heroes */
--gm-gold-light: #f0d875     /* Light gold for highlights */
--gm-red: #dc2626            /* Red accent for monsters */
--gm-green: #22c55e          /* Green for healing/VP */
--gm-text: #f5f5f5           /* Primary text */
--gm-text-muted: #a0a8b8     /* Secondary text */
--gm-text-dim: #6b7280       /* Tertiary text */
--gm-border: #2d3341         /* Standard borders */
```

### 3. Initiative Tracker
- **Horizontal Token Display**: Shows all entities in initiative order
- **Golden Corner Frames**: Active turn entity has golden corner decorations
- **Visual Indicators**: 
  - Heroes have gold-tinted borders
  - Monsters have red-tinted borders
  - Current turn has glowing golden frame
- **Dead Entity Handling**: Entities with hp <= 0 are excluded when rolling initiative

### 4. Hero Cards
Each hero card displays:
- **Header**: Name (Cinzel font, uppercase), Kin • Profession, Dead badge (💀 DÖD)
- **KP/VP**: Interactive pips (clickable to set exact value) + +/- buttons
- **Skadebonus**: STY and SMI damage bonuses displayed
- **Top Weapons**: 2-3 best weapons with damage dice (T6, T8, T10, etc.)
- **Conditions**: Active conditions shown as badges (Utmattad, Krasslig, etc.)
- **Armor**: Shield icon with protection value
- **Dead State**: Grey overlay + red strike-through line + 💀 badge
- **Golden Frame**: Active turn hero gets golden corner decorations
- **Expanded View Button**: Opens full character modal

### 5. Monster Cards
Each monster card displays:
- **Header**: Skull icon + name, Remove button (X)
- **KP**: Interactive pips (clickable) + +/- buttons
- **Stats Grid**: Armor 🛡️, Undvika 🔄, Movement 🏃
- **Attacks**: Attack name and damage dice
- **Dead State**: Grey overlay + red strike-through line
- **Golden Frame**: Active turn monster gets golden corner decorations

### 6. Combat Log (Sidebar)
Tracks all combat events in real-time:
- **HP Changes**: "Grimjaw tog 6 skada (KP: 10 → 4)" - Red
- **Deaths**: "💀 Skelettkrigar föll i strid!" - Red, bold
- **Healing**: "Eldara helade 4 KP (4 → 8)" - Green
- **Turn Changes**: "Ny tur: Grimjaw" - Gold
- **Round Changes**: "--- Runda 2 ---" - Gold, bold, centered
- **System Messages**: "Spelläge startat" - Grey
- **Auto-scroll**: Scrolls to bottom on new entries
- **Persistent**: Saved to Firestore session

### 7. Custom Monster Creation
Modal with two sections:
1. **Quick Add**: Preset monsters (Skuggvarg, Skelettkrigar, Goblin, Orch)
2. **Custom Form**: Full form with fields:
   - Name (text input)
   - KP/Max KP (number input)
   - Armor (number input)
   - Undvika (number input)
   - Movement (number input)
   - Initiativkort 1-10 (number input, default 1)
   - Attacks (JSON array: `[{"name":"Bett","damage":"T8"}]`)

### 8. Expanded Character Modal
Full-screen modal showing:
- **Golden Frame**: Border with corner decorations
- **All Attributes**: STY, FYS, SMI, INT, PSY, KAR with values
- **KP/VP**: Large interactive pips + +/- buttons
- **Skadebonus**: Both STY and SMI
- **All Weapons**: Full table with Name, Grip, Damage, Range
- **Skills & Weapon Skills**: Complete lists with values
- **Equipment & Currency**: Inventory and money
- **Close Button**: Returns to main view

### 9. Notes Section
- **Compact**: Fixed 50px height textarea
- **Sidebar Location**: Bottom of sidebar panel
- **Auto-save**: Save button stores to Firestore
- **Placeholder**: "Anteckningar..."

## Technical Implementation

### Files Modified
1. **css/style.css** (+976 lines)
   - New game mode color variables
   - Complete 3-column grid layout
   - Golden corner frame CSS
   - Hero and monster card styles
   - Combat log styles
   - Sidebar panel styles
   - Responsive breakpoints

2. **js/game-mode-ui.js** (Complete rewrite, 1565 lines)
   - New render methods for 3-column layout
   - Initiative bar rendering with golden frames
   - Hero card rendering with all features
   - Monster card rendering with all features
   - Combat log implementation
   - Custom monster modal (quick add + custom form)
   - Expanded character modal
   - HP/VP adjustment with combat log integration
   - Dead entity detection and visual handling

3. **js/game-mode-service.js** (+50 lines)
   - Updated `rollInitiative()` to skip dead entities
   - Added `addLogEntry()` method
   - Added `getCombatLog()` method
   - Combat log Firestore integration

### Key Functions

#### GameModeUI Methods
```javascript
// Check if entity is dead
isEntityDead(entityType, entityId)

// Render main layout
render()

// Render initiative bar with tokens
renderInitiativeBar()

// Render hero card
renderHeroCard(char, isCurrent)

// Render monster card
renderMonsterCard(monster, isCurrent)

// Render combat log
renderCombatLog()

// Add log entry
addLogEntry(message, type)

// Adjust HP/VP with logging
adjustCharacterStat(charId, field, delta, event)
adjustMonsterHP(monsterId, delta, event)

// Handle pip clicks
handlePipClick(entityType, entityId, field, value, event)

// Open modals
openMonsterModal()
openExpandedCharacterModal(charId)

// Roll initiative (skips dead)
rollInitiative()
```

#### GameModeService Methods
```javascript
// Roll initiative (skips entities with hp <= 0)
rollInitiative(characters, monsters)

// Add combat log entry
addLogEntry(sessionId, type, data)

// Get combat log
getCombatLog(sessionId)
```

### Data Structures

#### Combat Log Entry
```javascript
{
  id: "timestamp_random",
  type: "damage|heal|death|turn|round|system",
  timestamp: "2024-01-15T12:00:00.000Z",
  data: {
    // Type-specific data
    message: "...",  // for system
    round: 2,        // for round
    name: "...",     // for turn
    target: "...",   // for damage/heal/death
    amount: 6        // for damage/heal
  }
}
```

#### Initiative Item
```javascript
{
  ownerId: "char_id or monster_id",
  type: "character|monster",
  name: "Entity Name",
  smi: 12,
  roll: 7,
  total: 19
}
```

#### Monster Object
```javascript
{
  id: "monster_timestamp_random",
  name: "Skuggvarg",
  hp: 12,
  maxHp: 15,
  armor: 2,
  undvika: 12,
  movement: 12,
  initiativkort: 5,
  attacks: [
    { name: "Bett", damage: "T8" },
    { name: "Klor", damage: "T6" }
  ]
}
```

## CSS Classes Reference

### Layout
- `.game-mode-container` - Main container
- `.gm-header-bar` - Top header
- `.gm-initiative-bar` - Initiative tracker
- `.gm-main-grid` - 3-column grid
- `.gm-heroes-column` - Heroes column (1.5fr)
- `.gm-monsters-column` - Monsters column (0.8fr)
- `.gm-sidebar` - Sidebar column (180px)

### Initiative
- `.gm-initiative-token` - Initiative token
- `.gm-initiative-token.current` - Active turn
- `.gm-initiative-token.golden-frame` - Golden corners
- `.gm-token-number` - Initiative total
- `.gm-token-name` - Entity name

### Hero Cards
- `.gm-hero-card` - Hero card container
- `.gm-hero-card.current-turn` - Active turn hero
- `.gm-hero-card.dead` - Dead hero
- `.gm-card-name` - Hero name (Cinzel, gold)
- `.gm-hp-vp-row` - KP/VP grid
- `.gm-stat-box` - Stat container
- `.gm-stat-pips` - Pip container
- `.gm-pip.filled-kp` - Filled KP pip (red)
- `.gm-pip.filled-vp` - Filled VP pip (green)
- `.gm-combat-row` - Skadebonus grid
- `.gm-weapons-list` - Weapons list
- `.gm-conditions` - Conditions badges
- `.gm-death-badge` - 💀 DÖD badge

### Monster Cards
- `.gm-monster-card` - Monster card container
- `.gm-monster-card.current-turn` - Active turn monster
- `.gm-monster-card.dead` - Dead monster
- `.gm-monster-name` - Monster name (red)
- `.gm-monster-stats-grid` - Stats grid
- `.gm-monster-attacks` - Attacks list

### Golden Frame
- `.golden-frame` - Golden corner frame
- `.golden-frame::before` - Top-left corner
- `.golden-frame::after` - Top-right corner
- `.gm-frame-bl` - Bottom-left corner
- `.gm-frame-br` - Bottom-right corner

### Combat Log
- `.gm-combat-log` - Log container
- `.gm-log-entries` - Scrollable entries
- `.gm-log-entry` - Single entry
- `.gm-log-entry.damage` - Red border/text
- `.gm-log-entry.heal` - Green border/text
- `.gm-log-entry.death` - Red, bold
- `.gm-log-entry.turn` - Gold border/text
- `.gm-log-entry.round` - Gold, bold, centered
- `.gm-log-entry.system` - Grey border/text

### Notes
- `.gm-notes` - Notes container
- `.gm-notes-textarea` - 50px textarea

## Responsive Behavior

### 1400px and below
- Monster column increases to 1fr

### 1024px and below
- Grid changes to single column
- Sidebar max-height: 300px
- Heroes scroll vertically
- Monsters scroll vertically

### 768px and below
- Header becomes column layout
- Initiative tokens may wrap
- Cards become full width

## Usage

### Starting a Session
```javascript
// Initialize game mode
GameModeUI.init(partyId);

// Automatically:
// 1. Loads party data
// 2. Creates/loads session
// 3. Listens to character updates
// 4. Renders UI
// 5. Adds "Spelläge startat" log entry
```

### Rolling Initiative
```javascript
// Click "Dra kort" button
GameModeUI.rollInitiative();

// Automatically:
// 1. Rolls for all alive characters and monsters
// 2. Skips entities with hp <= 0
// 3. Sorts by total (SMI + roll)
// 4. Updates session with initiative order
// 5. Adds "Initiativ slaget!" and "--- Runda 1 ---" log entries
```

### Adjusting HP/VP
```javascript
// Click pip to set exact value
GameModeUI.handlePipClick(type, id, field, value, event);

// Click +/- buttons
GameModeUI.adjustCharacterStat(charId, field, delta, event);

// Automatically:
// 1. Updates Firestore
// 2. Adds combat log entry
// 3. Checks for death (hp <= 0)
// 4. Adds death log if applicable
```

### Adding Monsters
```javascript
// Quick Add
GameModeUI.quickAddMonster(presetName);

// Custom Add
GameModeUI.addCustomMonster(monsterData);

// Automatically:
// 1. Adds to session monsters array
// 2. Updates Firestore
// 3. Re-renders UI
// 4. Adds "Monster tillagt" log entry
```

### Next Turn
```javascript
// Click "Nästa" button
GameModeUI.nextTurn();

// Automatically:
// 1. Increments turn index
// 2. Handles round wrap-around
// 3. Updates session
// 4. Adds "--- Runda X ---" if new round
// 5. Adds "Ny tur: EntityName" log entry
// 6. Re-renders with golden frames on new entity
```

## Testing

### Manual Testing Checklist
- [ ] Initiative tracker displays correctly
- [ ] Golden frames appear on active turn entity
- [ ] HP/VP pips are clickable and update correctly
- [ ] +/- buttons work for HP/VP adjustment
- [ ] Combat log updates when HP changes
- [ ] Dead entities show 💀 badge and grey overlay
- [ ] Dead entities are skipped in initiative roll
- [ ] Monster cards display all stats
- [ ] Custom monster modal has both sections
- [ ] Expanded character modal shows all info
- [ ] Notes can be edited and saved
- [ ] Layout fits on screen without main scrolling
- [ ] Responsive behavior works on smaller screens

### Browser Testing
- Chrome/Edge ✓
- Firefox ✓
- Safari (iPad) - Recommended for testing

## Future Enhancements

### Potential Improvements
1. **Drag & Drop**: Reorder initiative manually
2. **Dice Roller**: Built-in dice roller with results in log
3. **Conditions Editor**: Visual condition management
4. **Turn Timer**: Optional timer per turn
5. **Sound Effects**: Audio cues for critical events
6. **Export Log**: Download combat log as text/PDF
7. **Templates**: Save monster templates for quick reuse
8. **Undo**: Undo last HP change
9. **Bulk Actions**: Apply effect to all heroes/monsters
10. **Mobile Optimization**: Better touch controls

## Known Limitations

1. **Maximum Entities**: Performance may degrade with 20+ entities
2. **Log Size**: Keeps only last 50 entries
3. **No Undo**: HP changes are immediate and permanent
4. **Single Session**: Only one active session per party
5. **No Animation**: State changes are instant, no transitions

## Support

For issues or questions, refer to:
- Main README.md
- GAME_MODE_GUIDE.md
- Firebase documentation for data persistence
- Issue tracker on GitHub

## Version History

### v2.0.0 (Current)
- Complete UI redesign
- 3-column grid layout
- Golden corner frames for active turn
- Combat log implementation
- Dead entity handling
- Custom monster creation modal
- Expanded character modal
- Compact notes section
- Responsive design improvements

### v1.0.0 (Previous)
- Basic overview mode
- Simple character cards
- Basic initiative tracking
- Monster management
