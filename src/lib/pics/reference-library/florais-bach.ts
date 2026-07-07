/** Bach flower essences — 38 essences in 7 emotional groups (Dr. Bach, 1936). */

export interface BachEssenceEntry {
  value: string;
  labelKey: string;
  negKey: string;
  posKey: string;
}

export interface BachEssenceGroup {
  groupKey: string;
  essences: BachEssenceEntry[];
}

/** Seven emotional groups catalogued by Dr. Bach. */
export const BACH_EMOTIONAL_GROUPS: BachEssenceGroup[] = [
  {
    groupKey: "it.ref.bach.g.fear",
    essences: [
      { value: "bach_rock_rose", labelKey: "it.ref.bach.rockRose", negKey: "it.ref.bach.rockRose.neg", posKey: "it.ref.bach.rockRose.pos" },
      { value: "bach_mimulus", labelKey: "it.ref.bach.mimulus", negKey: "it.ref.bach.mimulus.neg", posKey: "it.ref.bach.mimulus.pos" },
      { value: "bach_cherry_plum", labelKey: "it.ref.bach.cherryPlum", negKey: "it.ref.bach.cherryPlum.neg", posKey: "it.ref.bach.cherryPlum.pos" },
      { value: "bach_aspen", labelKey: "it.ref.bach.aspen", negKey: "it.ref.bach.aspen.neg", posKey: "it.ref.bach.aspen.pos" },
      { value: "bach_red_chestnut", labelKey: "it.ref.bach.redChestnut", negKey: "it.ref.bach.redChestnut.neg", posKey: "it.ref.bach.redChestnut.pos" },
    ],
  },
  {
    groupKey: "it.ref.bach.g.uncertainty",
    essences: [
      { value: "bach_cerato", labelKey: "it.ref.bach.cerato", negKey: "it.ref.bach.cerato.neg", posKey: "it.ref.bach.cerato.pos" },
      { value: "bach_scleranthus", labelKey: "it.ref.bach.scleranthus", negKey: "it.ref.bach.scleranthus.neg", posKey: "it.ref.bach.scleranthus.pos" },
      { value: "bach_gentian", labelKey: "it.ref.bach.gentian", negKey: "it.ref.bach.gentian.neg", posKey: "it.ref.bach.gentian.pos" },
      { value: "bach_gorse", labelKey: "it.ref.bach.gorse", negKey: "it.ref.bach.gorse.neg", posKey: "it.ref.bach.gorse.pos" },
      { value: "bach_hornbeam", labelKey: "it.ref.bach.hornbeam", negKey: "it.ref.bach.hornbeam.neg", posKey: "it.ref.bach.hornbeam.pos" },
      { value: "bach_wild_oat", labelKey: "it.ref.bach.wildOat", negKey: "it.ref.bach.wildOat.neg", posKey: "it.ref.bach.wildOat.pos" },
    ],
  },
  {
    groupKey: "it.ref.bach.g.lackInterest",
    essences: [
      { value: "bach_clematis", labelKey: "it.ref.bach.clematis", negKey: "it.ref.bach.clematis.neg", posKey: "it.ref.bach.clematis.pos" },
      { value: "bach_honeysuckle", labelKey: "it.ref.bach.honeysuckle", negKey: "it.ref.bach.honeysuckle.neg", posKey: "it.ref.bach.honeysuckle.pos" },
      { value: "bach_wild_rose", labelKey: "it.ref.bach.wildRose", negKey: "it.ref.bach.wildRose.neg", posKey: "it.ref.bach.wildRose.pos" },
      { value: "bach_olive", labelKey: "it.ref.bach.olive", negKey: "it.ref.bach.olive.neg", posKey: "it.ref.bach.olive.pos" },
      { value: "bach_white_chestnut", labelKey: "it.ref.bach.whiteChestnut", negKey: "it.ref.bach.whiteChestnut.neg", posKey: "it.ref.bach.whiteChestnut.pos" },
      { value: "bach_mustard", labelKey: "it.ref.bach.mustard", negKey: "it.ref.bach.mustard.neg", posKey: "it.ref.bach.mustard.pos" },
      { value: "bach_chestnut_bud", labelKey: "it.ref.bach.chestnutBud", negKey: "it.ref.bach.chestnutBud.neg", posKey: "it.ref.bach.chestnutBud.pos" },
    ],
  },
  {
    groupKey: "it.ref.bach.g.loneliness",
    essences: [
      { value: "bach_water_violet", labelKey: "it.ref.bach.waterViolet", negKey: "it.ref.bach.waterViolet.neg", posKey: "it.ref.bach.waterViolet.pos" },
      { value: "bach_impatiens", labelKey: "it.ref.bach.impatiens", negKey: "it.ref.bach.impatiens.neg", posKey: "it.ref.bach.impatiens.pos" },
      { value: "bach_heather", labelKey: "it.ref.bach.heather", negKey: "it.ref.bach.heather.neg", posKey: "it.ref.bach.heather.pos" },
    ],
  },
  {
    groupKey: "it.ref.bach.g.susceptibility",
    essences: [
      { value: "bach_agrimony", labelKey: "it.ref.bach.agrimony", negKey: "it.ref.bach.agrimony.neg", posKey: "it.ref.bach.agrimony.pos" },
      { value: "bach_centaury", labelKey: "it.ref.bach.centaury", negKey: "it.ref.bach.centaury.neg", posKey: "it.ref.bach.centaury.pos" },
      { value: "bach_walnut", labelKey: "it.ref.bach.walnut", negKey: "it.ref.bach.walnut.neg", posKey: "it.ref.bach.walnut.pos" },
      { value: "bach_holly", labelKey: "it.ref.bach.holly", negKey: "it.ref.bach.holly.neg", posKey: "it.ref.bach.holly.pos" },
    ],
  },
  {
    groupKey: "it.ref.bach.g.despondency",
    essences: [
      { value: "bach_larch", labelKey: "it.ref.bach.larch", negKey: "it.ref.bach.larch.neg", posKey: "it.ref.bach.larch.pos" },
      { value: "bach_pine", labelKey: "it.ref.bach.pine", negKey: "it.ref.bach.pine.neg", posKey: "it.ref.bach.pine.pos" },
      { value: "bach_elm", labelKey: "it.ref.bach.elm", negKey: "it.ref.bach.elm.neg", posKey: "it.ref.bach.elm.pos" },
      { value: "bach_sweet_chestnut", labelKey: "it.ref.bach.sweetChestnut", negKey: "it.ref.bach.sweetChestnut.neg", posKey: "it.ref.bach.sweetChestnut.pos" },
      { value: "bach_star_of_bethlehem", labelKey: "it.ref.bach.starOfBethlehem", negKey: "it.ref.bach.starOfBethlehem.neg", posKey: "it.ref.bach.starOfBethlehem.pos" },
      { value: "bach_willow", labelKey: "it.ref.bach.willow", negKey: "it.ref.bach.willow.neg", posKey: "it.ref.bach.willow.pos" },
      { value: "bach_oak", labelKey: "it.ref.bach.oak", negKey: "it.ref.bach.oak.neg", posKey: "it.ref.bach.oak.pos" },
      { value: "bach_crab_apple", labelKey: "it.ref.bach.wildApple", negKey: "it.ref.bach.wildApple.neg", posKey: "it.ref.bach.wildApple.pos" },
    ],
  },
  {
    groupKey: "it.ref.bach.g.overCare",
    essences: [
      { value: "bach_chicory", labelKey: "it.ref.bach.chicory", negKey: "it.ref.bach.chicory.neg", posKey: "it.ref.bach.chicory.pos" },
      { value: "bach_vervain", labelKey: "it.ref.bach.vervain", negKey: "it.ref.bach.vervain.neg", posKey: "it.ref.bach.vervain.pos" },
      { value: "bach_vine", labelKey: "it.ref.bach.vine", negKey: "it.ref.bach.vine.neg", posKey: "it.ref.bach.vine.pos" },
      { value: "bach_beech", labelKey: "it.ref.bach.beech", negKey: "it.ref.bach.beech.neg", posKey: "it.ref.bach.beech.pos" },
      { value: "bach_rock_water", labelKey: "it.ref.bach.rockWater", negKey: "it.ref.bach.rockWater.neg", posKey: "it.ref.bach.rockWater.pos" },
    ],
  },
];

export const BACH_RESCUE_ENTRIES = [
  { value: "bach_rescue", labelKey: "it.ref.bach.rescue", indicationKey: "it.ref.bach.rescueInd" },
  { value: "bach_rescue_night", labelKey: "it.ref.bach.rescueNight", indicationKey: "it.ref.bach.rescueNightInd" },
] as const;

/** Flat list of all 38 Bach essences for selects and prescriptions. */
export const ALL_BACH_ESSENCES = BACH_EMOTIONAL_GROUPS.flatMap((g) => g.essences);

export function bachEssenceByValue(value: string) {
  return ALL_BACH_ESSENCES.find((e) => e.value === value);
}

/** @deprecated Use BACH_EMOTIONAL_GROUPS */
export const BACH_ESSENCE_GROUPS = BACH_EMOTIONAL_GROUPS.map((g) => ({
  groupKey: g.groupKey,
  essenceKeys: g.essences.map((e) => e.labelKey),
}));

/** @deprecated Use BACH_RESCUE_ENTRIES */
export const BACH_RESCUE_KEYS = BACH_RESCUE_ENTRIES.map((e) => e.labelKey);
