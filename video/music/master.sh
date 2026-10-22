#!/bin/sh
# Render the score and master it to -14 LUFS, true peak -1.5 dBTP (two-pass).
set -e
cd "$(dirname "$0")/.."
${PYTHON:-python3} music/score.py music/raw.wav
ffmpeg -hide_banner -nostats -i music/raw.wav \
  -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2> music/measure.txt
get() { grep "\"$1\"" music/measure.txt | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -y -hide_banner -loglevel error -i music/raw.wav -af \
  "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  -ar 48000 -c:a pcm_s16le public/music.wav
rm music/raw.wav music/measure.txt
echo "wrote public/music.wav"
