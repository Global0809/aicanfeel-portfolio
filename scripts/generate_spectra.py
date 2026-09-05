"""Generate real, time-indexed audio spectrum data; never modify input media."""
from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

import numpy as np

FILM_IDS = [
    "beyond-the-real", "through-the-signal", "in-full-bloom",
    "no-way-out", "chrome-reverie",
]
FPS = 20
BANDS = 32
SAMPLE_RATE = 24000
FFT_SIZE = 2048
NOISE_FLOOR_DB = -72.0


def command_output(arguments: list[str]) -> bytes:
    return subprocess.run(arguments, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE).stdout


def generate(film_id: str, media_root: Path, output_dir: Path,
             ffmpeg: str, ffprobe: str) -> dict:
    playlist = media_root / film_id / "index.m3u8"
    probe = json.loads(command_output([
        ffprobe, "-v", "error", "-show_entries", "format=duration,start_time",
        "-of", "json", str(playlist),
    ]))
    duration = float(probe["format"]["duration"])
    raw = command_output([
        ffmpeg, "-v", "error", "-i", str(playlist), "-map", "0:a:0",
        "-vn", "-ac", "2", "-ar", str(SAMPLE_RATE),
        "-c:a", "pcm_f32le", "-f", "f32le", "pipe:1",
    ])
    # Channel powers are averaged after the FFT, avoiding stereo phase cancellation.
    pcm = np.frombuffer(raw, dtype="<f4").reshape(-1, 2)
    if not np.isfinite(pcm).all():
        raise ValueError(f"Non-finite decoded sample in {film_id}")
    count = math.ceil(duration * FPS)
    window = np.hanning(FFT_SIZE)
    normalizer = FFT_SIZE * np.sum(window ** 2)
    frequencies = np.fft.rfftfreq(FFT_SIZE, 1 / SAMPLE_RATE)
    edges = np.geomspace(60.0, 12000.0, BANDS + 1)
    masks = [(frequencies >= edges[i]) &
             ((frequencies < edges[i + 1]) if i < BANDS - 1
              else (frequencies <= edges[i + 1]))
             for i in range(BANDS)]
    if any(not mask.any() for mask in masks):
        raise ValueError("A frequency band has no FFT bins")
    powers = np.zeros((count, BANDS), dtype=np.float64)
    rms = np.zeros(count, dtype=np.float64)
    for frame_index in range(count):
        # Samples are centered exactly on frame_index / FPS, with zero-padding
        # beyond the actual recording. Consumers can interpolate adjacent frames.
        center = round(frame_index * SAMPLE_RATE / FPS)
        start = center - FFT_SIZE // 2
        stop = start + FFT_SIZE
        chunk = np.zeros((FFT_SIZE, 2), dtype=np.float64)
        read_start = max(0, start)
        read_stop = min(len(pcm), stop)
        if read_stop > read_start:
            chunk[read_start - start:read_stop - start] = pcm[read_start:read_stop]
        rms[frame_index] = np.sqrt(np.mean(chunk ** 2))
        transform = np.fft.rfft(chunk * window[:, None], axis=0)
        spectrum_power = (np.abs(transform) ** 2).mean(axis=1) / normalizer
        spectrum_power[1:-1] *= 2.0
        for band_index, mask in enumerate(masks):
            powers[frame_index, band_index] = spectrum_power[mask].sum()

    # 10*log10(power) equals 20*log10(band RMS). One fixed calibration per
    # film keeps genuine changes over time; there is no per-frame normalization.
    db = 10.0 * np.log10(np.maximum(powers, 1e-16))
    ceiling_db = min(0.0, max(-30.0, float(np.percentile(db, 99.5))))
    normalized = np.clip((db - NOISE_FLOOR_DB) /
                         (ceiling_db - NOISE_FLOOR_DB), 0.0, 1.0)
    values = np.rint(normalized * 255).astype(np.uint8)
    payload = {"fps": FPS, "bands": BANDS, "duration": duration,
               "frames": values.tolist()}
    output_path = output_dir / f"{film_id}.json"
    output_path.write_text(json.dumps(payload, separators=(",", ":")),
                           encoding="utf-8")

    # Validate the actual serialized deliverable, not just intermediate arrays.
    decoded = json.loads(output_path.read_text(encoding="utf-8"))
    assert decoded["fps"] == 20 and decoded["bands"] == 32
    assert len(decoded["frames"]) == count
    assert all(len(row) == BANDS for row in decoded["frames"])
    assert all(type(value) is int and 0 <= value <= 255
               for row in decoded["frames"] for value in row)
    distinct_frames = int(np.unique(values, axis=0).shape[0])
    mean_changes = np.mean(np.abs(np.diff(values.astype(float), axis=0)), axis=1)
    assert distinct_frames > count * 0.80, f"Insufficient real variation: {film_id}"
    assert float(np.std(rms)) > 0.0001, f"Unexpectedly static audio: {film_id}"
    assert output_path.stat().st_size < 120_000, f"Sidecar too large: {film_id}"
    return {
        "film": film_id,
        "source": str(playlist),
        "output": str(output_path),
        "bytes": output_path.stat().st_size,
        "duration": duration,
        "decoded_audio_duration": len(pcm) / SAMPLE_RATE,
        "frames": count,
        "distinct_frames": distinct_frames,
        "changed_adjacent_frame_fraction": float(np.mean(mean_changes > 0)),
        "mean_absolute_adjacent_band_change": float(np.mean(mean_changes)),
        "rms_min": float(np.min(rms)),
        "rms_max": float(np.max(rms)),
        "rms_standard_deviation": float(np.std(rms)),
        "ceiling_dbfs": ceiling_db,
        "noise_floor_dbfs": NOISE_FLOOR_DB,
        "zero_value_fraction": float(np.mean(values == 0)),
        "clipped_value_fraction": float(np.mean(values == 255)),
        "first_middle_last_mean_band_values": [float(values[index].mean())
              for index in [0, count // 2, count - 1]],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    project_root = Path(__file__).resolve().parent.parent
    parser.add_argument("--media-root", type=Path, default=project_root / "public" / "media")
    parser.add_argument("--output", type=Path, default=project_root / "public" / "spectra")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    report = {
        "method": "Decoded actual HLS audio to 24 kHz stereo float PCM; 2048-sample Hann FFT centered every 50 ms; average stereo channel powers; sum into 32 logarithmic 60 Hz to 12 kHz bands; map band RMS dB to uint8 using fixed -72 dBFS floor and film-wide 99.5th percentile ceiling (clamped between -30 and 0 dBFS). No synthetic signal and no per-frame normalization.",
        "window_ms": FFT_SIZE / SAMPLE_RATE * 1000,
        "band_edges_hz": np.geomspace(60, 12000, BANDS + 1).tolist(),
        "films": [],
    }
    for film_id in FILM_IDS:
        result = generate(film_id, args.media_root, args.output,
                          args.ffmpeg, args.ffprobe)
        report["films"].append(result)
        print(json.dumps(result), flush=True)
    (args.output / "method-and-validation.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
