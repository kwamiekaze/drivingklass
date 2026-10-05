/** Shared state between the camera rig and the buttons: the reel (cuts through the angles) and the beat the music keeps. */
export const cinema = {
  reel: false,            // the visitor pressed the reel button
  auto: false,            // the scene has been left alone long enough that it cuts by itself
  beatCuts: 0,            // bumped by the music engine on every fourth beat; the rig turns each one into a cut
  playing: false,         // music is audible: cuts follow it instead of the clock
};
export const startReel = () => { cinema.reel = true; };
export const stopReel = () => { cinema.reel = false; cinema.auto = false; };
