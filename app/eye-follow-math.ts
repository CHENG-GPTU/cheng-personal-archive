/** Tracking geometry from the supplied Framer FollowEyes component.
 * https://framerusercontent.com/modules/5dCWb80pMX3rkZ6mTvF6/rPe7prLpTtzjXMR9Lynw/FollowEyes.js
 */
export function eyeTarget(x: number, y: number, eyeOffset: number, eyeSize: number, pupilSize: number, range = 90) {
  const dx = x - eyeOffset;
  const distance = Math.hypot(dx, y);
  if (distance === 0) return { x: 0, y: 0 };
  const maxDistance = (eyeSize - Math.min(pupilSize, eyeSize * .8)) / 2 * (range / 100);
  const radius = Math.min(distance, maxDistance);
  const angle = Math.atan2(y, dx);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
