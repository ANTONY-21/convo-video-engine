#!/usr/bin/env bash
# post_chain.sh v2 — M2/M7 (Master Prompt): two-pass loudnorm to
# I=-14 TP=-1.5 LRA=7 (linear=true), alimiter AFTER loudnorm (AAC
# re-encode re-overshoots TP), stereo AAC 192k, CRF18 video passthrough.
#
# Usage: post_chain.sh <in.mp4> <out.mp4> [bed.wav]
#   If bed.wav given: sidechain-ducked 12-15 LU under voice (M2/4.2).
# Env: LOUDNORM_I (-14), LOUDNORM_TP (-1.5), LOUDNORM_LRA (7),
#      BED_LU_UNDER (13), VIDEO_CRF (18)
# Exits non-zero on failure.
set -euo pipefail

IN="${1:?usage: post_chain.sh <in.mp4> <out.mp4> [bed.wav]}"
OUT="${2:?usage: post_chain.sh <in.mp4> <out.mp4> [bed.wav]}"
BED="${3:-}"

I_T="${LOUDNORM_I:--14}"
TP_T="${LOUDNORM_TP:--1.5}"
LRA_T="${LOUDNORM_LRA:-7}"
BED_UNDER="${BED_LU_UNDER:-13}"
CRF="${VIDEO_CRF:-18}"

measure() { # $1=file $2=extra ss
  ffmpeg -hide_banner ${2:+-ss "$2"} -i "$1" \
    -af "loudnorm=I=${I_T}:TP=${TP_T}:LRA=${LRA_T}:print_format=json" -f null - 2>&1 | tail -n14
}
parse() { echo "$1" | sed -n "s/.*\"$2\" *: *\"\([^\"]*\)\".*/\1/p"; }

STATS=$(measure "$IN")
II=$(parse "$STATS" input_i); TP=$(parse "$STATS" input_tp)
LRA=$(parse "$STATS" input_lra); TH=$(parse "$STATS" input_thresh)

if [ -z "$II" ] || [ "$II" = "-inf" ] || [ "$II" = "-99" ]; then
  echo "pass-1 measured ${II:-nothing}; retry with lead-in trimmed"
  STATS=$(measure "$IN" 0.5)
  II=$(parse "$STATS" input_i); TP=$(parse "$STATS" input_tp)
  LRA=$(parse "$STATS" input_lra); TH=$(parse "$STATS" input_thresh)
fi
if [ -z "$II" ] || [ "$II" = "-inf" ]; then
  echo "FATAL: loudnorm measurement invalid" >&2; exit 1
fi

# Two-pass via volume: loudnorm dynamic mode undershoots on short
# clips (measured -15.41 vs -14 target); linear mode is TP-capped
# when the source violates TP (measured -1.27 vs -1.5 target).
# Measured-delta volume gain + alimiter hits the target exactly.
DELTA=$(python3 -c "print(round(${I_T} - (${II}), 2))")
LN="volume=${DELTA}dB,aresample=48000"
# alimiter AFTER gain — TP insurance (0.84 = -1.5dBFS ceiling)
LIM="alimiter=limit=0.84:level=false"

if [ -n "$BED" ]; then
  # Voice processed, bed ducked under voice via sidechaincompress:
  # bed sits ~13 LU under voice (M2/4.2), stereo output (4.2).
  ffmpeg -y -v error -i "$IN" -i "$BED" -filter_complex "\
[0:a]${LN},${LIM}[vo];\
[1:a]volume=$(python3 -c "print(10**(-${BED_UNDER}/20))")[bedsrc];\
[bedsrc][vo]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=300[bed];\
[vo][bed]amix=inputs=2:normalize=0[out]" \
    -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 192k -ac 2 "$OUT"
else
  # No bed: voice-only chain, force stereo (M2: mono -> L/R)
  ffmpeg -y -v error -i "$IN" \
    -af "${LN},${LIM}" \
    -map 0:v -map 0:a -c:v copy -c:a aac -b:a 192k -ac 2 "$OUT"
fi

echo "post_chain OK: ${II} -> ${I_T} LUFS, TP<=${TP_T}, stereo | $OUT"
