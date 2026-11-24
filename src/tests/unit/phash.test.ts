import { describe, it, expect } from 'vitest';
import {
  computePerceptualHash,
  hammingDistance,
  isNearDuplicate,
} from '../../../packages/shared/src/phash';

describe('Perceptual Hash and Duplicate Detection (Section 4 & Section 13)', () => {
  it('computes consistent 64-bit hex hash for identical input', () => {
    const data = 'data:image/jpeg;base64,' + btoa('sample-image-pixel-stream-dustbin-12345');
    const hash1 = computePerceptualHash(data);
    const hash2 = computePerceptualHash(data);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(16); // 16 hex chars = 64 bits
    expect(hammingDistance(hash1, hash2)).toBe(0);
  });

  it('detects near-identical hashes with Hamming distance <= 6', () => {
    // Exactly 3 bits different
    const hashA = '0000000000000000';
    const hashB = '0000000000000007'; // 7 in binary is 0111 (3 bits)
    expect(hammingDistance(hashA, hashB)).toBe(3);
    expect(isNearDuplicate(hashA, hashB, 6)).toBe(true);

    // Exactly 6 bits different -> passes threshold 6
    const hashC = '000000000000003f'; // 3f is 0011 1111 (6 bits)
    expect(hammingDistance(hashA, hashC)).toBe(6);
    expect(isNearDuplicate(hashA, hashC, 6)).toBe(true);

    // 7 bits different -> rejected as duplicate (isNearDuplicate is false)
    const hashD = '000000000000007f'; // 7f is 0111 1111 (7 bits)
    expect(hammingDistance(hashA, hashD)).toBe(7);
    expect(isNearDuplicate(hashA, hashD, 6)).toBe(false);
  });

  it('different images produce large hamming distance', () => {
    const imgA = 'data:image/jpeg;base64,' + btoa('image-a-light-clean-dustbin');
    const imgB = 'data:image/jpeg;base64,' + btoa('totally-different-dark-landscape-999');
    const hashA = computePerceptualHash(imgA);
    const hashB = computePerceptualHash(imgB);
    const dist = hammingDistance(hashA, hashB);
    expect(dist).toBeGreaterThan(6);
  });
});
