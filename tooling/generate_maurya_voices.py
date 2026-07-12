"""Generate Chandragupta and Kautilya council introductions with Azure Speech."""

from generate_media import synthesize_audio

VOICES = [
    {
        "output": "public/media/maurya/intro-narration.mp3",
        "voice": "en-IN-NeerjaNeural",
        "language": "en-IN",
        "rate": "-3%",
        "pitch": "0%",
        "text": (
            "Before the empire of Ashoka, Chandragupta and the statecraft "
            "tradition associated with Kautilya shaped a new power in Magadha. "
            "Build stores, legitimacy, intelligence, and an army, while keeping "
            "history separate from reconstruction."
        ),
    },
    {
        "output": "public/media/maurya/chandragupta.mp3",
        "voice": "en-IN-PrabhatNeural",
        "language": "en-IN",
        "rate": "-5%",
        "pitch": "-3%",
        "text": (
            "A kingdom is not held by ambition alone. Show me the roads, "
            "the grain, the loyalty, and the army that can protect them."
        ),
    },
    {
        "output": "public/media/maurya/kautilya.mp3",
        "voice": "en-IN-ArjunNeural",
        "language": "en-IN",
        "rate": "-8%",
        "pitch": "-6%",
        "text": (
            "Strength begins before the battlefield: in counted stores, "
            "independent reports, disciplined officers, and costs understood "
            "before an order is given."
        ),
    },
]


if __name__ == "__main__":
    for voice in VOICES:
        synthesize_audio(voice)
