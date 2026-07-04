/**
 * Player-car sprite as a data URI. Part 2 of the upgrade prompt overwrites this
 * file with the real base64 PNG of the gold 5-star DrivingKlass trainer.
 * Until then this placeholder SVG keeps the game rendering.
 */
export const CAR_SPRITE_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="168" viewBox="0 0 96 168">' +
      '<rect x="8" y="8" width="80" height="152" rx="26" fill="#f2c14e" stroke="#8a6a10" stroke-width="3"/>' +
      '<rect x="14" y="62" width="68" height="46" rx="10" fill="#e2ae2e" stroke="#8a6a10" stroke-width="2"/>' +
      '<rect x="20" y="70" width="56" height="16" rx="6" fill="#101014"/>' +
      '<text x="48" y="82" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#f2c14e">DRIVINGKLASS</text>' +
      '<rect x="16" y="12" width="14" height="6" rx="3" fill="#fff8dc"/>' +
      '<rect x="66" y="12" width="14" height="6" rx="3" fill="#fff8dc"/>' +
      '<rect x="16" y="150" width="14" height="6" rx="3" fill="#b03a2e"/>' +
      '<rect x="66" y="150" width="14" height="6" rx="3" fill="#b03a2e"/>' +
      '</svg>'
  );
