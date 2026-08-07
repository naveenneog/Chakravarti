import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  CLEAVE_CLIP,
  CROSS_CUT_CLIP,
  SOURCE_CLIP,
  buildCleave,
  buildCrossCut,
  withComboClips,
} from './swordAnimations'

/** A stand-in for the rig's SwordSlash: a torso and a swing-arm track. */
const quat = (axis: THREE.Vector3, angle: number) =>
  new THREE.Quaternion().setFromAxisAngle(axis, angle)

const keys = (...quaternions: THREE.Quaternion[]) =>
  quaternions.flatMap((q) => [q.x, q.y, q.z, q.w])

const Y = new THREE.Vector3(0, 1, 0)
const X = new THREE.Vector3(1, 0, 0)

const makeSourceClip = () =>
  new THREE.AnimationClip(SOURCE_CLIP, 1, [
    new THREE.QuaternionKeyframeTrack(
      'Torso.quaternion',
      [0, 0.5, 1],
      keys(quat(Y, 0), quat(Y, 0.4), quat(Y, 0.8)),
    ),
    new THREE.QuaternionKeyframeTrack(
      'UpperArm.R.quaternion',
      [0, 0.5, 1],
      keys(quat(X, 0), quat(X, 0.6), quat(X, 1.2)),
    ),
    new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [0, 1, 0, 0, 1.1, 0]),
  ])

describe('withComboClips', () => {
  it('adds exactly the two derived cuts', () => {
    const clips = withComboClips([makeSourceClip()])
    const names = clips.map((clip) => clip.name)
    expect(names).toContain(SOURCE_CLIP)
    expect(names).toContain(CROSS_CUT_CLIP)
    expect(names).toContain(CLEAVE_CLIP)
    expect(clips).toHaveLength(3)
  })

  it('leaves the rig alone when there is no sword clip to derive from', () => {
    const idle = new THREE.AnimationClip('Idle', 1, [])
    expect(withComboClips([idle]).map((clip) => clip.name)).toEqual(['Idle'])
  })

  it('never replaces clips the rig already provides', () => {
    const clips = withComboClips([
      makeSourceClip(),
      new THREE.AnimationClip(CROSS_CUT_CLIP, 1, []),
    ])
    expect(clips.filter((clip) => clip.name === CROSS_CUT_CLIP)).toHaveLength(1)
  })

  it('does not mutate the source clip', () => {
    const source = makeSourceClip()
    const before = Array.from(source.tracks[0].values)
    withComboClips([source])
    expect(Array.from(source.tracks[0].values)).toEqual(before)
  })
})

describe('buildCrossCut', () => {
  it('keeps every track and keeps key times ascending', () => {
    const clip = buildCrossCut(makeSourceClip())
    expect(clip.tracks).toHaveLength(3)
    for (const track of clip.tracks) {
      const times = Array.from(track.times)
      expect(times).toEqual([...times].sort((a, b) => a - b))
    }
  })

  it('reverses the swing so the blade travels the other way', () => {
    const source = makeSourceClip()
    const clip = buildCrossCut(source)
    const arm = clip.tracks.find((track) => track.name.startsWith('UpperArm.R'))
    const sourceArm = source.tracks.find((track) =>
      track.name.startsWith('UpperArm.R'),
    )
    // The first key of the reversed clip is the last key of the source.
    expect(arm?.values[0]).toBeCloseTo(sourceArm!.values[8], 5)
    expect(arm?.values[3]).toBeCloseTo(sourceArm!.values[11], 5)
  })

  it('keeps all quaternions normalized', () => {
    const clip = buildCrossCut(makeSourceClip())
    for (const track of clip.tracks) {
      if (!(track instanceof THREE.QuaternionKeyframeTrack)) continue
      for (let index = 0; index < track.values.length; index += 4) {
        const length = Math.hypot(
          track.values[index],
          track.values[index + 1],
          track.values[index + 2],
          track.values[index + 3],
        )
        expect(length).toBeCloseTo(1, 4)
      }
    }
  })
})

describe('buildCleave', () => {
  it('holds the wind-up so the strike snaps late', () => {
    const source = makeSourceClip()
    const clip = buildCleave(source)
    const midpoint = clip.tracks[0].times[1]
    // Re-timing must push the middle key later than the even 0.5 it started at.
    expect(midpoint).toBeLessThan(0.5)
    expect(source.tracks[0].times[1]).toBe(0.5)
  })

  it('keeps the clip duration intact', () => {
    const clip = buildCleave(makeSourceClip())
    expect(clip.duration).toBeCloseTo(1, 5)
  })

  it('biases the swing arm away from the source pose', () => {
    const source = makeSourceClip()
    const clip = buildCleave(source)
    const read = (track: THREE.KeyframeTrack | undefined) =>
      new THREE.Quaternion(
        track!.values[0],
        track!.values[1],
        track!.values[2],
        track!.values[3],
      )
    const derived = read(
      clip.tracks.find((track) => track.name.startsWith('UpperArm.R')),
    )
    const original = read(
      source.tracks.find((track) => track.name.startsWith('UpperArm.R')),
    )
    // The overhead bias has to be a real rotation, not a rounding difference.
    expect(derived.angleTo(original)).toBeGreaterThan(0.3)
  })

  it('keeps all quaternions normalized', () => {
    const clip = buildCleave(makeSourceClip())
    for (const track of clip.tracks) {
      if (!(track instanceof THREE.QuaternionKeyframeTrack)) continue
      for (let index = 0; index < track.values.length; index += 4) {
        const length = Math.hypot(
          track.values[index],
          track.values[index + 1],
          track.values[index + 2],
          track.values[index + 3],
        )
        expect(length).toBeCloseTo(1, 4)
      }
    }
  })
})
