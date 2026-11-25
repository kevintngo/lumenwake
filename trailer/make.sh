#!/bin/sh
# Makes the square gameplay trailer for a timeline (X): films the game with its own sound, then joins the two.
#   ./trailer/make.sh            film and encode  -> trailer/lumenwake-trailer-square.mp4 (1080 x 1080, 60 fps) and trailer/lumenwake-cover.jpg
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
"$OUT/encode" "$OUT/frames" 60 "$OUT/sound.wav" trailer/lumenwake-trailer-square.mp4 16000000
cp "$OUT/frames/f00000.jpg" trailer/lumenwake-cover.jpg        # the cover is the first frame: the poster, the strongest shot, at full brightness
echo "wrote trailer/lumenwake-trailer-square.mp4 and trailer/lumenwake-cover.jpg"
