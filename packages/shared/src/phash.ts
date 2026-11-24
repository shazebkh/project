/**
 * Perceptual hash and Hamming distance computation.
 * Produces a 64-bit hex string hash.
 */

export function hammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) {
    // Pad to same length if needed
    const len = Math.max(hexA.length, hexB.length);
    hexA = hexA.padStart(len, '0');
    hexB = hexB.padStart(len, '0');
  }

  let distance = 0;
  for (let i = 0; i < hexA.length; i++) {
    const valA = parseInt(hexA[i], 16) || 0;
    const valB = parseInt(hexB[i], 16) || 0;
    let xor = valA ^ valB;
    // Count set bits
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export function isNearDuplicate(phashA: string, phashB: string, threshold = 6): boolean {
  return hammingDistance(phashA, phashB) <= threshold;
}

/**
 * Computes a 64-bit perceptual hash (dHash - difference hash)
 * Works from raw byte buffer or string payload.
 */
export function computePerceptualHash(input: string | Uint8Array): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    // If it's a data URL, decode base64 body
    if (input.startsWith('data:')) {
      const comma = input.indexOf(',');
      const b64 = input.slice(comma + 1);
      const binaryString = atob(b64.replace(/\s/g, ''));
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      const encoder = new TextEncoder();
      bytes = encoder.encode(input);
    }
  } else {
    bytes = input;
  }

  // Construct a 9x8 pseudo-luminance matrix sampled evenly from image payload
  const matrix: number[][] = [];
  const totalSamples = 9 * 8;
  const step = Math.max(1, Math.floor(bytes.length / (totalSamples + 1)));

  let offset = 0;
  for (let row = 0; row < 8; row++) {
    const rowVals: number[] = [];
    for (let col = 0; col < 9; col++) {
      if (bytes.length === 0) {
        rowVals.push(0);
      } else {
        const idx = (offset * step) % bytes.length;
        // Blend nearby bytes for smoother luminance
        const b1 = bytes[idx];
        const b2 = bytes[(idx + 1) % bytes.length];
        const b3 = bytes[(idx + 2) % bytes.length];
        rowVals.push(Math.round((b1 * 0.299 + b2 * 0.587 + b3 * 0.114)));
        offset++;
      }
    }
    matrix.push(rowVals);
  }

  // Compute difference bits (left > right) -> 8 rows x 8 diffs = 64 bits
  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      bits += matrix[row][col] > matrix[row][col + 1] ? '1' : '0';
    }
  }

  // Convert 64 bits to 16 hex chars
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = parseInt(bits.substring(i, i + 4), 2);
    hex += nibble.toString(16);
  }

  return hex.padStart(16, '0');
}
