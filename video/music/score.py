"""Original score for the Aparcat film (second version), synthesised with numpy.

A sunny "kalimba pop" cue at 100 BPM: one beat is 18 video frames, which is
15 story frames played SPEED = 1.2 times slower (see src/timing.ts). Every
hit is written in story frames and converted with t_of(), so it lands on the
same cut it did before the film was slowed down.

Dramatic reading: going round in circles -> stamps -> half a second of
silence -> a whistled hook as the light comes in -> a city that flows ->
warm kalimba at sunset -> a clear, held ending.

    story frames    0-90   the hook       B minor drone, turn-signal ticks
    story frames   90-210  the montage    half-time beat, a stamp per tile
    story frames  195-225  the turn       riser, then silence until 240
    story frame   240      the drop       bloom; D A Bm G with the whistle
    story frames  240-1020 the product    kalimba arpeggios, shaker, claps
    story frames 1020-1200 the mission    breakdown: kalimba, pad, soft whistle
    story frames 1200-1350 the end card   last hit, held D chord, fade

Usage: python music/score.py music/raw.wav  (music/master.sh does this)
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
FPS = 30
SPEED = 1.2
BPM = 100
BEAT = 60 / BPM
TOTAL = 1350  # story frames
LENGTH = TOTAL * SPEED / FPS + 2.5

# Shared with src/timing.ts (story frames).
STAMPS = [105, 135, 165, 195]
WHIPS = [90, 120, 150, 180]
SILENCE = 225
DROP = 240
TAPS = [340, 675, 795, 870]
RESULTS = 366
SHEET_DOWN = 400
BREAKOUT = 420
ORA = 540
CAMERAS = 660
PIN_LANDS = 900
PARKS = 975
SUNSET = 1004
MISSION = 1020
END = 1200

CHORDS = {
    'Bm': [59, 62, 66],
    'G': [55, 59, 62],
    'F#': [54, 58, 61],
    'D': [50, 54, 57],
    'A': [57, 61, 64],
    'Dadd9': [50, 54, 57, 64],
    'Gmaj7': [55, 59, 62, 66],
}

# One chord per bar (a bar is 60 story frames).
PROGRESSION = (
    ['Bm', 'Bm', 'G', 'F#']
    + ['D', 'A', 'Bm', 'G'] * 3
    + ['D']
    + ['G', 'D', 'A']
    + ['Dadd9', 'Gmaj7', 'Dadd9']
)

# The whistled hook over D A Bm G: (bar in phrase, beat, midi, beats).
HOOK = [
    (0, 0, 69, 1), (0, 1, 74, 0.5), (0, 1.5, 78, 1), (0, 2.5, 76, 0.5),
    (0, 3, 74, 1),
    (1, 0, 73, 1), (1, 1, 76, 1), (1, 2, 81, 1.5),
    (2, 0, 71, 0.5), (2, 0.5, 74, 0.5), (2, 1, 78, 1), (2, 2, 76, 1),
    (2, 3, 74, 1),
    (3, 0, 74, 1), (3, 1, 71, 1), (3, 2, 69, 2),
]

# Long whistled notes over the sunset (G D A): (bar, beat, midi, beats).
SUNSET_LINE = [
    (17, 0, 71, 2), (17, 2, 74, 2), (18, 0, 78, 4), (19, 0, 76, 2), (19, 2, 73, 2),
]

rng = np.random.default_rng(7)


def t_of(frame):
    """Seconds on screen for a story frame."""
    return frame * SPEED / FPS


def at(seconds):
    return int(round(seconds * SR))


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def add(mix, start, sound, gain=1.0, pan=0.0):
    """Adds a mono or stereo sound at `start` seconds, constant-power pan."""
    i = at(start)
    if i >= len(mix):
        return
    if sound.ndim == 1:
        left = np.cos((pan + 1) * np.pi / 4)
        right = np.sin((pan + 1) * np.pi / 4)
        sound = np.stack([sound * left, sound * right], axis=1) * np.sqrt(2)
    end = min(len(mix), i + len(sound))
    mix[i:end] += gain * sound[:end - i]


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype='low', fs=SR, output='sos'),
                   x, axis=0)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype='high', fs=SR, output='sos'),
                   x, axis=0)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR,
                          output='sos'), x, axis=0)


# --- Drums and effects -------------------------------------------------------

def kick(gain=1.0):
    t = np.arange(at(0.4)) / SR
    freq = 50 + 95 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 9)
    click = highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 320)
    return gain * (body + 0.1 * click)


def snare(gain=1.0):
    """A dry pop snare: a tuned body under a bright snap and a clap."""
    t = np.arange(at(0.32)) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
    snap = bandpass(rng.standard_normal(len(t)), 1800, 7000) * np.exp(-t * 26)
    clap_env = sum((t >= o) * np.exp(-(t - o) * 55) for o in (0.0, 0.008, 0.017))
    clap = bandpass(rng.standard_normal(len(t)), 900, 3200) * clap_env
    return gain * (0.5 * body + 0.45 * snap + 0.35 * clap)


def shaker(gain=1.0, accent=False):
    t = np.arange(at(0.09)) / SR
    noise = bandpass(rng.standard_normal(len(t)), 5000, 11000, order=3)
    env = np.minimum(1, t / 0.012) * np.exp(-t * (38 if accent else 55))
    return gain * 0.3 * noise * env


def tick(high=True, gain=1.0):
    """A car's turn signal: a short relay click."""
    t = np.arange(at(0.05)) / SR
    noise = bandpass(rng.standard_normal(len(t)),
                     2200 if high else 1100, 5200 if high else 2600)
    tone = np.sin(2 * np.pi * (1900 if high else 1150) * t)
    return gain * (0.5 * noise + 0.5 * tone) * np.exp(-t * 160)


def stamp_hit(gain=1.0):
    """The COMPLET stamp: a low thud, a slap and a short room."""
    t = np.arange(at(0.7)) / SR
    thud = np.sin(2 * np.pi * np.cumsum(72 + 60 * np.exp(-t * 40)) / SR)
    thud *= np.exp(-t * 9)
    slap = bandpass(rng.standard_normal(len(t)), 300, 2600) * np.exp(-t * 30)
    return gain * (0.9 * thud + 0.55 * slap)


def whoosh(length=0.32, up=False, gain=1.0):
    n = at(length)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    steps = 8
    for k in range(steps):
        f = (k + 0.5) / steps
        centre = 600 + 4200 * (f if up else 1 - f)
        seg = bandpass(noise, centre * 0.7, centre * 1.3)
        out += seg * np.exp(-((t / length - f) ** 2) / 0.02)
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.5
    return gain * 0.6 * out * env


def riser(length, gain=1.0):
    n = at(length)
    t = np.arange(n) / SR
    ramp = (t / length) ** 2.5
    noise = bandpass(rng.standard_normal(n), 400, 7000)
    sweep = np.sin(2 * np.pi * np.cumsum(220 + 1500 * ramp) / SR)
    return gain * (0.6 * noise + 0.25 * sweep) * ramp


def bloom(gain=1.0, root=38):
    """The low, wide impact when the green P appears."""
    t = np.arange(at(3.5)) / SR
    tone = (np.sin(2 * np.pi * hz(root) * t)
            + 0.5 * np.sin(2 * np.pi * hz(root + 12) * t)
            + 0.2 * np.sin(2 * np.pi * hz(root + 19) * t))
    burst = lowpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 14)
    return gain * (tone * np.exp(-t * 1.3) * np.minimum(1, t / 0.006)
                   + 0.4 * burst)


def blip(freq=1300, length=0.05, gain=1.0):
    t = np.arange(at(length)) / SR
    return gain * np.sin(2 * np.pi * freq * t) * np.exp(-t * 90)


def bell(midis, gain=1.0, spacing=0.09):
    out = np.zeros(at(1.6 + spacing * len(midis)))
    for k, m in enumerate(midis):
        t = np.arange(at(1.6)) / SR
        f = hz(m)
        tone = (np.sin(2 * np.pi * f * t)
                + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 6))
        env = np.exp(-t * 3.2) * np.minimum(1, t / 0.003)
        i = at(k * spacing)
        out[i:i + len(t)] += tone * env
    return gain * 0.4 * out


# --- Tonal instruments ---------------------------------------------------------

def kalimba(midi, gain=1.0, decay=1.0):
    """A thumb piano: a sine tine, a soft octave and a metallic overtone."""
    t = np.arange(at(1.4 * decay)) / SR
    f = hz(midi)
    tone = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2 / decay)
            + 0.22 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 7 / decay)
            + 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 26))
    click = bandpass(rng.standard_normal(len(t)), 2000, 6000) * np.exp(-t * 400)
    return gain * 0.38 * (tone + 0.05 * click) * np.minimum(1, t / 0.002)


def whistle(midi, length, gain=1.0):
    """A whistled note: sine with a late vibrato and a little breath."""
    t = np.arange(at(length + 0.15)) / SR
    f = hz(midi)
    vib = 1 + 0.009 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    phase = 2 * np.pi * np.cumsum(f * vib) / SR
    tone = np.sin(phase) + 0.08 * np.sin(2 * phase)
    breath = bandpass(rng.standard_normal(len(t)), f * 0.9, min(f * 3, 12000))
    env = np.minimum(1, t / 0.03) * np.clip(1 - (t - length) / 0.15, 0, 1)
    return gain * 0.3 * (tone + 0.04 * breath) * env


def saw(freq, t, harmonics=10):
    out = np.zeros_like(t)
    for n in range(1, harmonics + 1):
        if n * freq > 12000:
            break
        out += np.sin(2 * np.pi * n * freq * t) / n
    return out


def pad(midis, length, gain=1.0, detune=0.004):
    dur = length + 1.2
    t = np.arange(at(dur)) / SR
    out = np.zeros((len(t), 2))
    for m in midis:
        for side, sign in ((0, -1), (1, 1)):
            for d in (-1, 0, 1):
                f = hz(m) * (1 + sign * d * detune)
                out[:, side] += saw(f, t + 0.13 * (d + side), harmonics=7)
    out = lowpass(out, 2200)
    swell = np.minimum(1, t / 0.4) ** 2
    release = np.clip(1 - (t - length) / 1.2, 0, 1)
    rms = np.sqrt(np.mean(out ** 2)) + 1e-9
    return gain * 0.08 * out * (swell * release)[:, None] / rms


def bass(midi, length, gain=1.0):
    t = np.arange(at(length + 0.06)) / SR
    f = hz(midi)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * lowpass(saw(f, t, 8), 700)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 1.6)
    env *= np.clip(1 - (t - length) / 0.06, 0, 1)
    return gain * 0.5 * tone * env


def reverb(dry, seconds=2.2, wet=0.25):
    n = at(seconds)
    t = np.arange(n) / SR
    ir = np.random.default_rng(11).standard_normal((n, 2))
    ir *= np.exp(-t / 0.5)[:, None]
    ir = lowpass(ir, 6500, order=1)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    send = highpass(dry, 240)
    out = np.zeros_like(dry)
    for ch in range(2):
        out[:, ch] = fftconvolve(send[:, ch], ir[:, ch])[:len(dry)]
    return dry + wet * out * 1.5


# --- Arrangement --------------------------------------------------------------

def bar_start(bar):
    return t_of(bar * 60)


def render():
    n = at(LENGTH)
    mix = np.zeros((n, 2))
    music = np.zeros((n, 2))  # tonal parts, ducked a little by the kick
    drums = np.zeros((n, 2))

    # The hook: a low B drone and the turn signal ticking on the beat.
    t = np.arange(at(t_of(DROP))) / SR
    drone = np.sin(2 * np.pi * hz(35) * t) + 0.35 * np.sin(2 * np.pi * hz(47) * t)
    drone *= np.minimum(1, t / 0.4) * np.clip((t_of(SILENCE) - t) / 0.08, 0, 1)
    add(mix, 0, drone, gain=0.1)
    for beat in range(0, 15):
        frame = beat * 15
        if frame >= SILENCE:
            break
        add(drums, t_of(frame), tick(True), gain=0.42 if frame < 90 else 0.2, pan=0.3)
        add(drums, t_of(frame + 7.5), tick(False), gain=0.25 if frame < 90 else 0.1,
            pan=0.3)

    for bar, name in enumerate(PROGRESSION):
        frame = bar * 60
        if SILENCE <= frame < DROP or frame >= TOTAL:
            continue
        notes = CHORDS[name]
        root = min(notes) - 24
        start = bar_start(bar)
        length = 4 * BEAT
        if frame == 180:
            length = t_of(SILENCE) - start
        mission = MISSION <= frame < END

        pad_gain = 0.4 if frame < DROP else 0.45 if not mission else 0.9
        add(music, start, pad(notes, length, gain=pad_gain))

        # Bass: a held root in the hook, a syncopated pattern from the montage.
        if frame < 90:
            add(music, start, bass(root + 12, length * 0.95, gain=0.45))
        elif not mission and frame < END + 120:
            for beat, dur in ((0, 1.2), (1.5, 0.4), (2, 1.2), (3.5, 0.4)):
                add(music, start + beat * BEAT, bass(root + 12, dur * BEAT,
                    gain=0.75 if frame >= DROP else 0.5))

        # Kalimba: a quiet motif in the hook, arpeggios from the drop on.
        shape = [0, 1, 2, 1, 2, 0, 1, 2]
        if frame < DROP:
            for k in (0, 3, 6):
                add(music, start + k * BEAT / 2,
                    kalimba(notes[shape[k] % len(notes)] + 12, gain=0.45), pan=-0.2)
        else:
            up = 12 if frame >= ORA and not mission else 0
            for k in range(8):
                midi = notes[shape[k] % len(notes)] + 12 + (up if k % 4 == 3 else 0)
                vel = (0.8 if k % 2 == 0 else 0.55) * (1.1 if mission else 1)
                add(music, start + k * BEAT / 2, kalimba(midi, gain=vel,
                    decay=1.6 if mission else 1.0), pan=-0.3 + 0.6 * (k % 2))

        # The whistled hook enters with the green P; a slower line at sunset.
        phrase_bar = (bar - 4) % 4
        if DROP <= frame < MISSION or END <= frame < END + 60:
            for pb, beat, midi, beats in HOOK:
                if pb == phrase_bar:
                    add(music, start + beat * BEAT,
                        whistle(midi, beats * BEAT * 0.92, gain=0.75), pan=0.1)
        for b, beat, midi, beats in SUNSET_LINE:
            if b == bar:
                add(music, start + beat * BEAT,
                    whistle(midi, beats * BEAT * 0.95, gain=0.55), pan=0.1)

    # Drums: half-time pop beat in the montage, full groove for the product.
    for beat in range(int(TOTAL / 15) + 1):
        frame = beat * 15
        start = t_of(frame)
        in_bar = beat % 4
        montage = 90 <= frame < SILENCE - 15
        groove = (DROP <= frame < MISSION) or (END <= frame < END + 120)
        if montage and in_bar in (0, 2):
            # The stamps land on 2 and 4: they are the backbeat here.
            add(drums, start, kick(gain=0.6))
        if groove:
            if in_bar in (0, 2) or (in_bar == 1 and frame >= 300):
                add(drums, start + (BEAT * 0.5 if in_bar == 1 else 0),
                    kick(gain=0.65))
            if in_bar in (1, 3) and frame >= 300:
                add(drums, start, snare(gain=0.6), pan=0.05)
            if frame >= 300:
                for k in range(4):
                    add(drums, start + k * BEAT / 4,
                        shaker(gain=0.9 if k == 2 else 0.55, accent=k == 2),
                        pan=0.35)
        if MISSION <= frame < END:
            add(drums, start + BEAT / 2, shaker(gain=0.45), pan=0.35)

    # The story's hits.
    for frame in STAMPS:
        add(drums, t_of(frame + 1), stamp_hit(gain=0.95))
    for frame in WHIPS:
        add(drums, t_of(frame - 5), whoosh(0.34, gain=0.55), pan=-0.2)
    add(mix, t_of(195), riser(t_of(SILENCE) - t_of(195), gain=0.4))
    add(drums, t_of(DROP), bloom(gain=0.75))
    add(mix, t_of(DROP), pad(CHORDS['Dadd9'], 3.0, gain=0.5))
    for frame in TAPS:
        add(drums, t_of(frame), blip(1250, gain=0.35))
    add(drums, t_of(RESULTS + 3), bell([81, 86], gain=0.55))
    add(drums, t_of(SHEET_DOWN + 2), whoosh(0.4, up=False, gain=0.4), pan=0.2)
    add(drums, t_of(BREAKOUT - 4), whoosh(0.5, up=True, gain=0.55))
    add(drums, t_of(ORA + 8), whoosh(0.7, up=True, gain=0.28), pan=0.3)
    add(drums, t_of(CAMERAS + 18), whoosh(0.9, gain=0.28), pan=-0.3)
    add(drums, t_of(PIN_LANDS), bell([78, 85], gain=0.7))
    add(drums, t_of(PARKS + 2), bell([74, 81, 86], gain=0.55, spacing=0.07))
    add(mix, t_of(SUNSET - 14), riser(t_of(16), gain=0.18))
    add(mix, t_of(SUNSET), bloom(gain=0.3, root=43))
    add(mix, t_of(END - 45), riser(t_of(45), gain=0.3))
    add(drums, t_of(END), bloom(gain=0.7))
    add(mix, t_of(END + 120), pad(CHORDS['Dadd9'], 2.5, gain=0.6))

    # A gentle pump on the music under each groove kick.
    duck = np.ones(n)
    for beat in range(int(TOTAL / 15) + 1):
        frame = beat * 15
        if not ((DROP <= frame < MISSION) or (END <= frame < END + 120)):
            continue
        if beat % 2:
            continue
        i = at(t_of(frame))
        k = np.arange(at(0.3)) / at(0.3)
        seg = 1 - 0.35 * (1 - k) ** 2
        end = min(n, i + len(seg))
        duck[i:end] = np.minimum(duck[i:end], seg[:end - i])
    music *= duck[:, None]

    mix += music
    mix = reverb(mix)
    mix += reverb(drums, seconds=1.0, wet=0.1)

    # Half a second of silence before the drop.
    gap = np.ones(n)
    i0, i1 = at(t_of(SILENCE)), at(t_of(DROP))
    gap[i0:i1] = 0.0
    fade_in = np.linspace(0, 1, at(0.01))
    gap[i1:i1 + len(fade_in)] = fade_in
    mix *= gap[:, None]

    # Phones cannot play deep bass: thin the lows so the mids carry.
    mix = highpass(mix, 32)
    mix = mix - 0.3 * lowpass(mix, 110)

    mix = mix[:at(t_of(TOTAL))]
    fade = np.clip((len(mix) - np.arange(len(mix))) / at(1.8), 0, 1)
    mix *= fade[:, None]
    mix /= np.max(np.abs(mix)) * 1.12
    return mix


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'music_raw.wav'
    mix = render()
    wavfile.write(out, SR, mix.astype(np.float32))
    print(f'wrote {out}: {len(mix) / SR:.2f} s')


if __name__ == '__main__':
    main()
