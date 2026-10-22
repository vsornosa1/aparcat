#!/bin/sh
# Renders key frames and tiles them into one sheet to look at.
#   sh scripts/stills.sh <name> <frame> [<frame> ...]
# Uses the installed Chrome (Remotion's chrome-for-testing mode).
set -e
cd "$(dirname "$0")/.."
name=$1
shift
B="${REMOTION_BROWSER:-C:/Program Files/Google/Chrome/Application/chrome.exe}"
mkdir -p checks
npx remotion bundle src/index.ts --out-dir=checks/bundle --log=error >/dev/null
inputs=""
n=0
for f in "$@"; do
  npx remotion still checks/bundle Main "checks/$name-$f.png" --frame="$f" \
    --props='{"music":false}' --browser-executable="$B" --chrome-mode=chrome-for-testing --log=error
  inputs="$inputs -i checks/$name-$f.png"
  n=$((n + 1))
done
cols=$(( n < 4 ? n : 4 ))
rows=$(( (n + cols - 1) / cols ))
layout=""
i=0
while [ $i -lt $n ]; do
  x=$(( (i % cols) * 540 ))
  y=$(( (i / cols) * 675 ))
  layout="$layout${layout:+|}${x}_${y}"
  i=$((i + 1))
done
filters=""
i=0
while [ $i -lt $n ]; do
  filters="$filters[$i:v]scale=540:675,drawtext=text='$(echo "$@" | cut -d' ' -f$((i + 1)))':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6[v$i];"
  i=$((i + 1))
done
streams=""
i=0
while [ $i -lt $n ]; do streams="$streams[v$i]"; i=$((i + 1)); done
if [ $n -gt 1 ]; then
  ffmpeg -y -loglevel error $inputs -filter_complex "${filters}${streams}xstack=inputs=$n:layout=$layout:fill=black" "checks/$name-sheet.png"
else
  cp "checks/$name-$1.png" "checks/$name-sheet.png"
fi
echo "checks/$name-sheet.png"
