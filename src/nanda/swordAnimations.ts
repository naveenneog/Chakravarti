/**
 * Authored sword-combo clips.
 *
 * The CC0 Quaternius rig ships exactly one sword animation, so a three-cut
 * chain would otherwise be the same swing played three times. These helpers
 * derive two further clips from it.
 *
 * Deriving rather than hand-keying is deliberate: the source clip already
 * targets real bones with poses that read correctly on this skeleton, so a
 * transform of it cannot produce an impossible joint. What changes is the
 * thing the player actually perceives -- the direction the blade travels and
 * the tempo it travels at.
 *
 * - **CrossCut** runs the slash backwards with a torso counter-yaw, so the
 *   blade returns across the body from the opposite side.
 * - **Cleave** re-times the slash so the wind-up hangs and the strike snaps,
 *   then pitches the shoulder and torso over to bring it down overhead.
 *
 * Pure functions over clip data; no scene, no mixer, no React.
 */

import * as THREE from 'three'

export const SOURCE_CLIP = 'SwordSlash'
export const CROSS_CUT_CLIP = 'CrossCut'
export const CLEAVE_CLIP = 'Cleave'

/** Bones the derived clips bias, matched by the tail of the track name. */
const TORSO_BONES = ['Torso', 'Abdomen']
const SWING_ARM_BONES = ['Shoulder.R', 'UpperArm.R']

const boneOf = (trackName: string): string => trackName.split('.quaternion')[0]

/**
 * GLTFLoader runs node names through `PropertyBinding.sanitizeNodeName`, which
 * drops `.` entirely -- so `Shoulder.R` becomes `ShoulderR` in loaded clips.
 * Compare on the sanitized form so a rig loaded either way still matches.
 */
const normalizeBone = (name: string): string =>
  name.replace(/\s/g, '_').replace(/[.[\]:/]/g, '')

const targetsBone = (trackName: string, bones: readonly string[]): boolean => {
  const target = normalizeBone(boneOf(trackName))
  return bones.some((bone) => target.endsWith(normalizeBone(bone)))
}

/** Pre-multiply every key of a quaternion track by a fixed offset. */
const biasQuaternionTrack = (
  track: THREE.QuaternionKeyframeTrack,
  offset: THREE.Quaternion,
): void => {
  const key = new THREE.Quaternion()
  for (let index = 0; index < track.values.length; index += 4) {
    key.set(
      track.values[index],
      track.values[index + 1],
      track.values[index + 2],
      track.values[index + 3],
    )
    key.premultiply(offset).normalize()
    track.values[index] = key.x
    track.values[index + 1] = key.y
    track.values[index + 2] = key.z
    track.values[index + 3] = key.w
  }
}

/** Reverse a track in time, keeping keys ascending. */
const reverseTrack = (track: THREE.KeyframeTrack, duration: number): void => {
  const stride = track.getValueSize()
  const count = track.times.length
  const times = new Float32Array(count)
  const values = new Float32Array(track.values.length)
  for (let index = 0; index < count; index += 1) {
    const source = count - 1 - index
    times[index] = duration - track.times[source]
    for (let component = 0; component < stride; component += 1) {
      values[index * stride + component] = track.values[source * stride + component]
    }
  }
  track.times = times
  track.values = values
}

/**
 * Re-time a track through an easing curve. `shape` above 1 delays the middle of
 * the motion, which is what turns an even slash into a held wind-up and a snap.
 */
const retimeTrack = (
  track: THREE.KeyframeTrack,
  duration: number,
  shape: number,
): void => {
  const times = new Float32Array(track.times.length)
  for (let index = 0; index < track.times.length; index += 1) {
    const normalized = duration > 0 ? track.times[index] / duration : 0
    times[index] = Math.pow(normalized, shape) * duration
  }
  track.times = times
}

const cloneClip = (clip: THREE.AnimationClip, name: string): THREE.AnimationClip => {
  const copy = clip.clone()
  copy.name = name
  return copy
}

/**
 * Build the cross cut: the slash run backwards, with the torso counter-rotated
 * so the swing clearly originates from the other shoulder.
 */
export const buildCrossCut = (source: THREE.AnimationClip): THREE.AnimationClip => {
  const clip = cloneClip(source, CROSS_CUT_CLIP)
  const yaw = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    -0.34,
  )
  for (const track of clip.tracks) {
    reverseTrack(track, clip.duration)
    if (
      track instanceof THREE.QuaternionKeyframeTrack &&
      targetsBone(track.name, TORSO_BONES)
    ) {
      biasQuaternionTrack(track, yaw)
    }
  }
  clip.resetDuration()
  return clip
}

/**
 * Build the cleave: a held wind-up that snaps down, with the swing shoulder and
 * torso pitched over so the blade arrives from above rather than across.
 */
export const buildCleave = (source: THREE.AnimationClip): THREE.AnimationClip => {
  const clip = cloneClip(source, CLEAVE_CLIP)
  const shoulderPitch = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -0.62,
  )
  const torsoPitch = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    0.26,
  )
  for (const track of clip.tracks) {
    retimeTrack(track, clip.duration, 1.7)
    if (!(track instanceof THREE.QuaternionKeyframeTrack)) {
      continue
    }
    if (targetsBone(track.name, SWING_ARM_BONES)) {
      biasQuaternionTrack(track, shoulderPitch)
    } else if (targetsBone(track.name, TORSO_BONES)) {
      biasQuaternionTrack(track, torsoPitch)
    }
  }
  clip.resetDuration()
  return clip
}

/**
 * Return the source clips plus the two derived combo clips. Existing clips are
 * never replaced, so the rig keeps Idle, Walk, Run and the rest untouched.
 */
export const withComboClips = (
  clips: readonly THREE.AnimationClip[],
): THREE.AnimationClip[] => {
  const source = clips.find((clip) => clip.name === SOURCE_CLIP)
  if (!source) {
    return [...clips]
  }
  const existing = new Set(clips.map((clip) => clip.name))
  const derived = [buildCrossCut(source), buildCleave(source)].filter(
    (clip) => !existing.has(clip.name),
  )
  return [...clips, ...derived]
}
