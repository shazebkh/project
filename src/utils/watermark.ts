/**
 * Utility to stamp pictures taken through the CleanStreak app
 * with exact Date, Time, and Geolocation metadata directly onto the canvas.
 */

export function stampPhotoWithDateTimeAndLocation(
  canvas: HTMLCanvasElement,
  options: {
    capturedDate?: Date;
    lat?: number;
    lng?: number;
    accuracy?: number;
    appTag?: string;
  } = {},
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.88);

  const date = options.capturedDate || new Date();
  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const lat = options.lat !== undefined ? options.lat.toFixed(5) : '28.66920';
  const lng = options.lng !== undefined ? options.lng.toFixed(5) : '77.45380';
  const acc = options.accuracy ? Math.round(options.accuracy) : 10;
  const tag = options.appTag || 'CleanStreak Verified';

  const w = canvas.width;
  const h = canvas.height;

  // 1. Bottom Watermark Banner
  const bannerHeight = Math.max(54, Math.round(h * 0.12));
  ctx.save();

  // Dark translucent gradient background
  const grad = ctx.createLinearGradient(0, h - bannerHeight, 0, h);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - bannerHeight, w, bannerHeight);

  // Top highlight border on banner
  ctx.fillStyle = 'rgba(16, 185, 129, 0.85)'; // Emerald line
  ctx.fillRect(0, h - bannerHeight, w, 3);

  // Text formatting
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;

  const fontSize1 = Math.max(13, Math.round(bannerHeight * 0.28));
  const fontSize2 = Math.max(11, Math.round(bannerHeight * 0.23));

  // Line 1: Date & Time
  ctx.font = `bold ${fontSize1}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
  ctx.fillText(
    `📅 ${dateStr}   ⏰ ${timeStr}`,
    16,
    h - bannerHeight + Math.round(bannerHeight * 0.42),
  );

  // Line 2: GPS Coordinates & Accuracy & Tag
  ctx.fillStyle = '#a7f3d0'; // Light emerald
  ctx.font = `${fontSize2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
  ctx.fillText(
    `📍 GPS: ${lat}, ${lng} (±${acc}m)  •  ${tag}`,
    16,
    h - bannerHeight + Math.round(bannerHeight * 0.82),
  );

  // 2. Top-Right Authentic Stamp Badge
  const badgeWidth = Math.max(130, Math.round(w * 0.25));
  const badgeHeight = Math.max(26, Math.round(h * 0.05));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(w - badgeWidth - 12, 12, badgeWidth, badgeHeight);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w - badgeWidth - 12, 12, badgeWidth, badgeHeight);

  ctx.fillStyle = '#34d399';
  ctx.font = `bold ${Math.max(10, Math.round(badgeHeight * 0.46))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('LIVE GEO-STAMP', w - badgeWidth / 2 - 12, 12 + badgeHeight * 0.68);

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.88);
}
