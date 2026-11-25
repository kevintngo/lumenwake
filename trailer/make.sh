#!/bin/sh
# Makes the square gameplay trailer for a timeline (X): films the game, renders its score and effects alongside, and joins them.
#   ./trailer/make.sh            film and encode  -> trailer/lumenwake-trailer-square.mp4 (1080 x 1080, 60 fps, about 80 MB) and trailer/lumenwake-cover.jpg
#   ./trailer/make.sh encode     encode again from the frames already filmed (trailer/out/frames, trailer/out/sound.wav)
# Needs Node 22+, Chrome and Xcode's swiftc (the encoder uses the system's AVFoundation; no ffmpeg).
# The frames are kept as JPEGs (about 1 GB in trailer/out, which git ignores) so the cut can be encoded again.
set -e
cd "$(dirname "$0")/.."
OUT=trailer/out
mkdir -p "$OUT"
if [ "$1" != "encode" ]; then
  rm -rf "$OUT/frames"
  node trailer/record.mjs frames "$OUT/frames"
fi
swiftc -O trailer/encode.swift -o "$OUT/encode"
"$OUT/encode" "$OUT/frames" 60 "$OUT/sound.wav" trailer/lumenwake-trailer-square.mp4 12000000
find trailer -maxdepth 1 -name "*.mp4.sb-*" -delete          # (a sandboxed write can leave a copy of the file beside it)
cp "$OUT/frames/f$(printf %05d "${COVER:-2240}").jpg" trailer/lumenwake-cover.jpg      # the cover: the evening on the rim of the square, the ringed world over the spire (COVER=frame to choose another)
echo "wrote trailer/lumenwake-trailer-square.mp4 and trailer/lumenwake-cover.jpg"
