/** Cross-check the Stat Editor vanilla baseline against the sluggers.fyi character reference. */
const enumField = key => (baseline, schema, id) => schema.statFields.find(f => f.key === key).enum[baseline.roster[id].stats[key]];
const statField = key => (baseline, schema, id) => baseline.roster[id].stats[key];
const comparisons = [
  ['character_class', 'Class', enumField('class')],
  ['captain', 'Captain', enumField('captain')],
  ['throwing_arm', 'Throws', enumField('pitchingArm')],
  ['batting_stance', 'Bats', enumField('battingArm')],
  ['weight', 'Weight', statField('weight')],
  ['unknown', 'Unknown byte', statField('unknown3')],
  ['hitting_trajectory_sweet_spot', 'Trajectory', enumField('trajectory')],
  ['has_trajectory_curve', 'Hit curve', (b, s, id) => b.roster[id].stats.hitCurve === 1],
  ['slap_hit_contact_size', 'Slap contact', statField('slapContact')],
  ['charge_hit_contact_size', 'Charge contact', statField('chargeContact')],
  ['slap_hit_power', 'Slap power', statField('slapPower')],
  ['charge_hit_power', 'Charge power', statField('chargePower')],
  ['bunting', 'Bunting', statField('bunting')],
  ['speed', 'Speed', statField('speed')],
  ['throwing_speed', 'Outfield throwing', statField('throwing')],
  ['fielding', 'Fielding', statField('fielding')],
  ['curveball_speed', 'Curveball speed', statField('curveballSpeed')],
  ['fastball_speed', 'Charge pitch speed', statField('chargePitchSpeed')],
  ['curve', 'Curve', statField('curve')],
  ['unknown_goomba100', 'Unknown (not stamina)', statField('unknown25')],
  ['stamina', 'Stamina', statField('stamina')],
  ['captain_star_pitch', 'Star pitch', (b, s, id) => b.roster[id].stats.captain ? enumField('starPitch')(b, s, id) : null],
  ['captain_star_swing', 'Star swing', (b, s, id) => b.roster[id].stats.captain ? enumField('starSwing')(b, s, id) : null],
  ['star_pitch', 'Star pitch type', (b, s, id) => b.roster[id].stats.captain ? null : enumField('starPitchType')(b, s, id)],
  ['hitbox_width', 'Hitbox width', (b, s, id) => b.roster[id].size[12]],
  ['hitbox_height', 'Hitbox height', (b, s, id) => b.roster[id].size[13]],
];
const chemistryLabel = ['Bad', 'Neutral', 'Good'];

export function compareVanilla(baseline, schema, reference) {
  const characters = reference.characters;
  const ids = new Set(characters.map(c => c.id));
  const statDifferences = [];
  const chemistryDifferences = [];
  for (const c of characters) {
    const player = baseline.roster[c.id];
    if (!player?.playable || player.kind === 'mii') throw new Error(`sluggers.fyi character ${c.id} (${c.character}) has no playable Stat Editor slot.`);
    for (const [key, label, editorValue] of comparisons) {
      const editor = editorValue(baseline, schema, c.id);
      if (editor !== c[key]) statDifferences.push({id: c.id, key, label, editor, reference: c[key]});
    }
    // sluggers.fyi covers links between its 71 characters, so Mii targets are not compared.
    for (const target of ids) {
      if (target === c.id) continue;
      const reference = c.good_chemistry.includes(target) ? 2 : c.bad_chemistry.includes(target) ? 0 : 1;
      const editor = player.chemistry[target];
      if (editor !== reference) chemistryDifferences.push({id: c.id, target, editor: chemistryLabel[editor] ?? editor, reference: chemistryLabel[reference]});
    }
  }
  return {characters: characters.length, fields: comparisons.length, statDifferences, chemistryDifferences};
}
