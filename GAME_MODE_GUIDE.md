# Spelläge (Game Mode) - DM Guide

## Overview

Spelläge (Game Mode) is a dedicated interface for Dungeon Masters to track and manage all party members' characters during live play sessions. It provides real-time updates, initiative tracking, and quick actions to streamline gameplay.

## Features

### 🎮 Two View Modes

#### 1. Översikt (Overview Mode)
Shows all party members simultaneously in compact cards:
- Character name, kin (race), and profession
- KP (hit points) and VP (willpower) as clickable pips
- Current armor and damage bonus
- Active conditions with visual indicators
- Quick access to detailed view

#### 2. Fokus (Focus Mode)
Expands one character with full details while keeping others in sidebar:
- Complete attribute display (STY, SMI, INT, KAR, FYS, PSY, STO)
- Condition toggles for all 6 conditions
- Sidebar showing other party members' critical stats
- Easy navigation between characters

### ⚔️ Initiative Tracker

- **Auto-roll Initiative**: Automatically rolls 1d20 + SMI for all characters
- **Turn Management**: Highlights current turn with visual indicator
- **Round Counter**: Tracks combat rounds automatically
- **Manual Override**: Can manually adjust initiative order if needed

### 🎲 DM Toolbar

Quick actions to speed up gameplay:

1. **💥 Skada alla (Damage All)**: Apply damage to multiple characters at once (perfect for area effects)
2. **😴 Vila alla (Rest All)**: 
   - Short rest: Restores half KP
   - Long rest: Restores all KP and VP
3. **➕ Lägg till monster**: Add temporary monsters to initiative tracker

### 📝 Session Notes

- Quick notes that sync in real-time
- Visible to all party members with read access
- Persists across sessions

### 🔴 Smart Alerts

Visual warnings help you track party health:
- **Critical HP** (≤25%): Red border and pulsing animation
- **Low VP** (≤25%): Yellow indicator
- **Death Saves**: Special handling when KP = 0

### 🔄 Real-time Synchronization

- All changes sync instantly to Firestore
- Multiple DMs can view same session (though only owner can modify)
- Character updates reflect immediately across all views
- Auto-save on every change

## How to Use

### Starting a Game Session

1. Navigate to your party in the **Grupp** (Parties) section
2. Click the **🎮 Starta Spelläge** button (only visible to party owner)
3. The game mode interface will open in full-screen overlay
4. An active session is created automatically in Firestore

### Managing Characters

#### Updating KP/VP
- Click on any pip (●) to set the current value
- Filled pips (●) represent current value
- Empty pips (○) represent lost points
- Changes save automatically

#### Toggling Conditions
In Focus mode:
- Click condition buttons to toggle them on/off
- Active conditions show in gold
- Conditions are:
  - **Utmattad** (STY) - Exhausted
  - **Krasslig** (FYS) - Wounded
  - **Omtöcknad** (SMI) - Dazed
  - **Arg** (INT) - Angry
  - **Rädd** (PSY) - Scared
  - **Uppgiven** (KAR) - Demoralized

### Running Combat

1. **Roll Initiative**:
   - Click "🎲 Slå initiativ" in the initiative tracker
   - System auto-rolls for all characters
   - Order is sorted highest to lowest

2. **Manage Turns**:
   - Current turn is highlighted in gold
   - Click "Nästa tur" to advance to next character
   - Automatically cycles to next round when needed

3. **Apply Effects**:
   - Use "💥 Skada alla" for area-of-effect damage
   - Update individual KP by clicking pips
   - Toggle conditions as needed

### Adding Monsters

1. Click "➕ Lägg till monster"
2. Enter monster details:
   - Name
   - HP (max and current)
   - Armor value
3. Monster appears in initiative tracker
4. Can be managed like player characters

### Exiting Game Mode

1. Click "✕ Avsluta" in the top-right corner
2. Confirm you want to exit
3. Session is marked as ended in Firestore
4. Returns to party view

## Technical Details

### Firestore Structure

#### gameSessions Collection
```javascript
{
  id: string,
  partyId: string,
  ownerId: string,
  startedAt: timestamp,
  endedAt: timestamp | null,
  active: boolean,
  
  // Initiative
  initiative: [
    { 
      oderId: string,
      type: 'character' | 'monster',
      name: string,
      smi: number,
      roll: number,
      total: number
    }
  ],
  currentTurnIndex: number,
  round: number,
  
  // Session data
  notes: string,
  monsters: [
    { 
      id: string,
      name: string,
      hp: number,
      maxHp: number,
      armor: number,
      notes: string
    }
  ]
}
```

### Character Schema Integration

Game Mode uses existing character fields:
- `currentKP` / `currentVP` - Current hit points and willpower
- `attributes.FYS` - Maximum KP
- `attributes.PSY` - Maximum VP
- `armorProtection` - Armor value
- `damageBonusSTY` - Damage bonus
- `conditions` - Object with attribute keys (STY, FYS, SMI, INT, PSY, KAR)

### Real-time Updates

- Uses Firestore snapshot listeners for live data
- Handles up to 10 characters in single query
- Falls back to individual listeners for larger parties
- Automatically cleans up listeners on exit

### Permissions

Security rules ensure:
- Only party owner can start/end sessions
- Owner and all party members can read session data
- Only owner can update session data
- Character updates respect existing permissions

## Keyboard Shortcuts

Currently none - all interactions are click-based for maximum compatibility.

## Browser Compatibility

- Modern browsers with ES5+ support
- Requires JavaScript enabled
- Works on desktop and mobile devices
- Responsive design adapts to screen size

## Performance Notes

- Optimized for parties up to 10 characters
- Real-time updates use minimal bandwidth
- All character data cached locally during session
- Session state persists in Firestore

## Troubleshooting

### "Inga karaktärer i gruppen"
- Party must have at least one character to start game mode
- Add characters to party first

### Changes not syncing
- Check internet connection
- Verify Firestore is accessible
- Ensure you have proper permissions

### Button not visible
- Only party owner can see "🎮 Starta Spelläge" button
- Party must have at least one character

### Initiative not rolling
- Verify characters have SMI attribute set
- Check browser console for errors

## Future Enhancements

Potential improvements for future versions:
- [ ] Monster stat blocks library
- [ ] Dice roller integration
- [ ] Combat log/history
- [ ] Status effect timers
- [ ] Custom conditions
- [ ] Export session summary
- [ ] Multiple active sessions per party
- [ ] Spectator mode for players
