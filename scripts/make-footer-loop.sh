#!/bin/sh
# usage: make_loop.sh raw.mp4 out-basename   -> out.mp4 (seamless loop, 1280 wide, small) and out.jpg (poster)
set -e
IN="$1"; OUT="$2"; F=0.8
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
ffmpeg -loglevel error -y -i "$IN" -filter_complex \
"[0:v]scale=1280:-2,fps=24,split=3[a][b][c];\
[a]trim=start=0:end=$F,setpts=PTS-STARTPTS[head];\
[b]trim=start=$F:end=$(echo "$D - $F" | bc -l),setpts=PTS-STARTPTS[mid];\
[c]trim=start=$(echo "$D - $F" | bc -l):end=$D,setpts=PTS-STARTPTS[tail];\
[tail][head]xfade=transition=fade:duration=$F:offset=0[x];\
[x][mid]concat=n=2:v=1:a=0[v]" -map "[v]" -an -c:v libx264 -preset slow -crf 29 -pix_fmt yuv420p -movflags +faststart "$OUT.mp4"
ffmpeg -loglevel error -y -i "$OUT.mp4" -frames:v 1 -q:v 3 "$OUT.jpg"
