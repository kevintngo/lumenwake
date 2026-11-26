export type RgbTuple = readonly [number, number, number];

export type ClassId = 'vanguard' | 'ranger' | 'adept';

export type WeaponFamilyId = 'blade' | 'rifle' | 'wand';

export type PeopleId = 'unit' | 'human' | 'veiled' | 'karn' | 'lynd';

export type BiomeId =
  | 'town'
  | 'glasswood'
  | 'ember'
  | 'hush'
  | 'rime'
  | 'vault'
  | 'shatter'
  | 'bloomfall'
  | 'saltglass'
  | 'amberwood';

export type MissionBiomeId = Exclude<BiomeId, 'town'>;

export type AttrKey = 'might' | 'grace' | 'vigor' | 'mind';

export type StatKey =
  | AttrKey
  | 'attack'
  | 'attackSpeed'
  | 'crit'
  | 'critDamage'
  | 'power'
  | 'maxHp'
  | 'maxFocus'
  | 'defense'
  | 'hpRegen'
  | 'focusRegen'
  | 'speed'
  | 'dodge'
  | 'find'
  | 'lifeOnKill';

export type ModifierOp = 'flat' | 'inc' | 'more';

export interface StatModifier {
  readonly stat: StatKey;
  readonly op: ModifierOp;
  readonly value: number;
  readonly grow?: number;
}

export type SlotKind =
  | 'weapon'
  | 'offhand'
  | 'unit'
  | 'mod'
  | 'visor'
  | 'frame'
  | 'grips'
  | 'greaves'
  | 'boots';

export type EquipSlot =
  | 'weapon'
  | 'offhand'
  | 'unit'
  | 'mod1'
  | 'mod2'
  | 'visor'
  | 'frame'
  | 'grips'
  | 'greaves'
  | 'boots';

export type GearBaseId =
  | 'saber'
  | 'glaive'
  | 'rifle'
  | 'carbine'
  | 'rod'
  | 'prism'
  | 'scout'
  | 'bulwark'
  | 'core'
  | 'drive'
  | 'ward'
  | 'cell'
  | 'lens'
  | 'visor'
  | 'crest'
  | 'grip'
  | 'gauntlet'
  | 'greave'
  | 'trail'
  | 'mag'
  | 'chip'
  | 'coil';

export type AffixId =
  | 'might'
  | 'grace'
  | 'vigor'
  | 'mind'
  | 'attack'
  | 'haste'
  | 'crit'
  | 'critdmg'
  | 'power'
  | 'health'
  | 'armor'
  | 'focus'
  | 'regen'
  | 'flow'
  | 'speed'
  | 'dodge'
  | 'find'
  | 'leech';

export type AbilityId = 'cleave' | 'slam' | 'bolt' | 'volley' | 'nova' | 'mend' | 'step';

export type AbilityEffectId = 'arc' | 'ring' | 'bolt' | 'volley' | 'heal' | 'dash';

export type TalentId =
  | 'wide'
  | 'rend'
  | 'twin'
  | 'tinder'
  | 'stride'
  | 'gust'
  | 'roots'
  | 'hide'
  | 'keen'
  | 'feet'
  | 'thrift'
  | 'forage'
  | 'second';

export type RelicId =
  | 'quake'
  | 'thorn'
  | 'rot'
  | 'spore'
  | 'chill'
  | 'tide'
  | 'vigil'
  | 'wick'
  | 'meteor'
  | 'rush';

export type CreatureId =
  | 'sproutling'
  | 'puffcap'
  | 'bristlehog'
  | 'wisp'
  | 'cragling'
  | 'shellsnap'
  | 'hound'
  | 'watcher'
  | 'delver'
  | 'strider'
  | 'mite'
  | 'warden'
  | 'matron'
  | 'sentinel'
  | 'keeper'
  | 'drifter'
  | 'thornmother'
  | 'saltcolossus'
  | 'ambersentinel';

export type BossId = 'warden' | 'matron' | 'sentinel' | 'keeper' | 'drifter';

export type ItemId =
  | 'glint'
  | 'tonic'
  | 'draught'
  | 'sprout_leaf'
  | 'puff_spore'
  | 'hog_bristle'
  | 'wisp_ember'
  | 'crag_shard'
  | 'snap_claw'
  | 'core';

export type FoodId =
  | 'wisp_ember'
  | 'hog_bristle'
  | 'snap_claw'
  | 'crag_shard'
  | 'sprout_leaf'
  | 'puff_spore'
  | 'tonic'
  | 'draught';

export type TemperId = 'ember' | 'shell' | 'tide';

export type LumenId =
  | 'mote'
  | 'kindle'
  | 'carapace'
  | 'ripple'
  | 'pyre'
  | 'bastion'
  | 'current'
  | 'prism';

export type SiteId = 'mark' | 'beacon' | 'crystal' | 'cargo';

export type BoonId = 'kindled' | 'fleet' | 'hale' | 'keen';

export type GoalId = 'sweep' | 'recover' | 'hunt';

export type ConditionId =
  | 'swift'
  | 'thick'
  | 'packs'
  | 'leaders'
  | 'volatile'
  | 'strays'
  | 'dark'
  | 'angry';

export type PropId =
  | 'tree'
  | 'pine'
  | 'bush'
  | 'mushroom'
  | 'rock'
  | 'crystal'
  | 'stone'
  | 'lamp'
  | 'willow'
  | 'deadtree'
  | 'reeds'
  | 'bigcap'
  | 'stump'
  | 'cairn'
  | 'pad'
  | 'gate'
  | 'pod'
  | 'console'
  | 'crate'
  | 'shuttle'
  | 'hall'
  | 'hab'
  | 'kiosk'
  | 'spire'
  | 'bench'
  | 'planter'
  | 'banner'
  | 'column'
  | 'brazier'
  | 'urn'
  | 'shard'
  | 'floater'
  | 'wreck'
  | 'dish'
  | 'flowers'
  | 'fern'
  | 'tallgrass'
  | 'pebbles'
  | 'ruin';

export type ArchetypeId =
  | 'humanoid'
  | 'gear'
  | 'shuttle'
  | 'lumen'
  | 'sproutling'
  | 'puffcap'
  | 'bristlehog'
  | 'wisp'
  | 'cragling'
  | 'shellsnap'
  | 'drop'
  | 'hound'
  | 'watcher'
  | 'delver'
  | 'strider'
  | 'mite'
  | 'warden'
  | 'matron'
  | 'sentinel'
  | 'keeper'
  | 'drifter';

export type FxTypeId =
  | 'mote'
  | 'leaf'
  | 'spark'
  | 'burst'
  | 'slash'
  | 'ring'
  | 'halo'
  | 'orb'
  | 'puff'
  | 'heal'
  | 'mark'
  | 'click'
  | 'beam'
  | 'ripple'
  | 'zone'
  | 'lane'
  | 'cloud';

export type QualitySetting = 'auto' | 'high' | 'low';

export type RenderQuality = 'high' | 'low';

export type NpcRole = 'bounty' | 'shop' | 'crew';

export type TutorialChapterId = 'town' | 'way' | 'elder' | 'home';

export type CinematicId = 'arrival' | 'descent' | 'elder' | 'elderAgain' | 'felled' | 'enraged';

export type ClipName = 'emerge' | 'roar' | 'fall' | 'strike';

export type MenuTabId = 'character' | 'gear' | 'lumen' | 'contract' | 'guide';

export type WindowKind = 'menu' | 'shop' | 'bounty';

interface PropLight {
  readonly color: RgbTuple;
  readonly radius: number;
  readonly y: number;
  readonly always?: boolean;
  readonly forward?: number;
}

export interface PropDef {
  readonly id: PropId;
  readonly type: number;
  readonly seeThrough?: boolean;
  readonly reach: number;
  readonly height: number;
  readonly collide: number;
  readonly scale?: readonly [number, number];
  readonly light?: PropLight;
}

export interface AudioLevels {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  mute?: boolean;
}
