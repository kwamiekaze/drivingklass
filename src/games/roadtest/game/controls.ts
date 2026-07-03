/**
 * One shared control-state object.
 * - The Phaser scene reads it every frame (alongside the keyboard).
 * - The React <TouchControls> buttons write to it on press/release.
 * This keeps mobile input dead simple with no event plumbing.
 */
export interface ControlState {
  left: boolean;
  right: boolean;
  gas: boolean;
  brake: boolean;
}

export const touchControls: ControlState = {
  left: false,
  right: false,
  gas: false,
  brake: false
};

export function resetTouchControls() {
  touchControls.left = false;
  touchControls.right = false;
  touchControls.gas = false;
  touchControls.brake = false;
}
