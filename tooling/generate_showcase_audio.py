"""Generate an original soundtrack for Chakravarti gameplay captures."""

from __future__ import annotations

import argparse
import math
import pathlib
import random
import wave
from array import array


def envelope(time: float, start: float, duration: float) -> float:
    offset = time - start
    if offset < 0 or offset >= duration:
        return 0.0
    return math.sin(math.pi * offset / duration)


def build_sample(time: float, random_value: float) -> tuple[float, float]:
    drone = (
        math.sin(2 * math.pi * 73.42 * time) * 0.09
        + math.sin(2 * math.pi * 110.0 * time) * 0.04
    )

    scale = (0, 3, 5, 7, 10, 7, 5, 3)
    step_duration = 0.56
    step = int(time / step_duration)
    note_start = step * step_duration
    note_frequency = 196.0 * 2 ** (scale[step % len(scale)] / 12)
    note_env = envelope(time, note_start, 0.48)
    melody = math.sin(2 * math.pi * note_frequency * time) * 0.10 * note_env

    drum_start = math.floor(time / 1.12) * 1.12
    drum_offset = time - drum_start
    drum = 0.0
    if drum_offset < 0.25:
        frequency = 92.0 * (0.5 ** (drum_offset / 0.25))
        drum = (
            math.sin(2 * math.pi * frequency * drum_offset)
            * math.exp(-15 * drum_offset)
            * 0.30
        )

    combat_times = (1.73, 2.40, 5.27, 6.00, 9.43, 10.10, 12.93, 13.60)
    sword = 0.0
    impact = 0.0
    for event_time in combat_times:
        sword_env = envelope(time, event_time, 0.18)
        if sword_env:
            sweep = 980.0 - 640.0 * ((time - event_time) / 0.18)
            sword += (
                math.sin(2 * math.pi * sweep * (time - event_time))
                + random_value * 0.8
            ) * sword_env * 0.13
        hit_env = envelope(time, event_time + 0.13, 0.16)
        if hit_env:
            impact += (
                math.sin(2 * math.pi * 88.0 * (time - event_time))
                * hit_env
                * 0.25
            )

    chime = 0.0
    for event_time in (8.2, 16.8):
        for index, frequency in enumerate((440.0, 660.0, 880.0)):
            start = event_time + index * 0.1
            env = envelope(time, start, 0.5)
            chime += math.sin(2 * math.pi * frequency * time) * env * 0.055

    ambience = random_value * 0.012 + math.sin(2 * math.pi * 0.12 * time) * 0.008
    value = drone + melody + drum + sword + impact + chime + ambience
    pan = math.sin(time * 0.37) * 0.08
    return value * (1 - pan), value * (1 + pan)


def generate(output: pathlib.Path, duration: float) -> None:
    sample_rate = 48_000
    total_samples = int(sample_rate * duration)
    rng = random.Random(321)
    samples = array("h")

    for index in range(total_samples):
        time = index / sample_rate
        left, right = build_sample(time, rng.uniform(-1.0, 1.0))
        fade_in = min(1.0, time / 0.8)
        fade_out = min(1.0, max(0.0, duration - time) / 1.2)
        gain = fade_in * fade_out
        samples.append(int(max(-1.0, min(1.0, left * gain)) * 25_000))
        samples.append(int(max(-1.0, min(1.0, right * gain)) * 25_000))

    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(samples.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=pathlib.Path)
    parser.add_argument("--duration", type=float, default=20.0)
    arguments = parser.parse_args()
    generate(arguments.output, arguments.duration)
    print(f"Showcase soundtrack ready: {arguments.output}")


if __name__ == "__main__":
    main()
