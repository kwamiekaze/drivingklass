// The EXIT sign's behaviour as a state machine: when it is offered, and what the car does for each press (park.ts requestExit / tickExit), against the real intro clock.
// run: npx tsx scripts/check-exit-request.mjs
import { park, canRequestExit, requestExit, tickExit, requestEnter, tickEnter, startPark, finishPark, parkMode, parkTotal, parkCarAt, canStartPark } from '../src/components/nuhome2/world/park.ts';
import { intro, T_GO, T_DRIVE, parkCarNow, introMarks } from '../src/components/nuhome2/world/intro.ts';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const reset = () => { park.phase = 'idle'; park.loc = 'front'; park.enterPending = false; park.exitPending = false; park.kind = 'parallel'; park.t = 0; intro.done = false; intro.t = 0; intro.t3 = T_GO; };
// 1. nothing asked yet: no EXIT sign; the PARKING sign (enter) is the one on offer
reset(); ok(!canRequestExit(), 'at the start of the page: no EXIT sign'); ok(canStartPark('enter'), 'at the start of the page: the PARKING sign is on offer');
// 2. PARKING pressed during the opening drive: EXIT is offered at once
intro.t = 5; requestEnter(); ok(park.enterPending && canRequestExit(), 'PARKING pressed mid-drive: the EXIT sign is offered at once');
// 3. EXIT pressed before the driveway: it waits, then diverts live when the car is on the driveway
intro.t = T_GO + 1; requestExit(); ok(park.exitPending && !park.enterPending && park.phase !== 'run', 'EXIT pressed on the avenue: queued, the car carries on');
const M = introMarks(); let started = null;
for (let t = T_GO + 1; t < T_GO + T_DRIVE; t += .05) { intro.t = t; tickExit(); if (park.phase === 'run') { started = t; break; } }
ok(started !== null && parkMode() === 'exitLive', `diverted live on the driveway (mode ${parkMode()}, intro t ${started?.toFixed(1)})`);
// 4. EXIT pressed after the car has begun its turn into the aisle: it parks first, then drives out from its stall
reset(); intro.t = T_GO + T_DRIVE - 3; requestEnter(); requestExit(); tickExit(); ok(park.exitPending && park.phase !== 'run', 'EXIT pressed after the turn into the aisle: waits for the car to park');
intro.t = T_GO + T_DRIVE + .5; tickExit(); ok(park.phase === 'run' && parkMode() === 'exitFront', 'parked: it drives out of its stall and round (exitFront)');
// 5. parked, EXIT pressed with nothing asked before: not offered
reset(); parkCarNow(); ok(!canRequestExit(), 'parked in its stall, nothing asked: no EXIT sign');
// 6. a "!" pressed: EXIT offered during the drive; pressed mid-manoeuvre it waits, then goes from where the car is
for (const [first, loc, mode] of [['parallel', 'box', 'exitBox'], ['bay', 'bay', 'exitBay']]) {
  reset(); parkCarNow(); startPark(first); ok(canRequestExit(), `${first} drive running: the EXIT sign is offered`);
  park.t = 3; requestExit(); tickExit(); ok(park.phase === 'run' && park.kind === first && park.exitPending, `${first}: EXIT pressed mid-manoeuvre: the car finishes it first`);
  ok(!canStartPark('turn') && !canStartPark('parallel'), `${first}: the "!" markers are off while EXIT is queued`);
  finishPark(); tickExit(); ok(park.phase === 'run' && park.kind === 'exit' && parkMode() === mode && park.loc === loc, `${first}: finished, then the way out from the ${loc} (${parkMode()})`);
}
// 7. the straight-line cases
for (const [loc, mode] of [['entry', 'exitEntry'], ['line', 'exitLine'], ['rear', 'exit']]) { reset(); parkCarNow(); park.loc = loc; ok(canRequestExit(), `at ${loc}: the EXIT sign is offered`); requestExit(); ok(park.phase === 'run' && parkMode() === mode, `at ${loc}: it goes at once (${parkMode()})`); }
// 8. after the exit: gone, no more sign
finishPark(); ok(park.loc === 'gone' && !canRequestExit(), 'after the way out: the car is gone, no EXIT sign');
// 9. no double press
reset(); parkCarNow(); park.loc = 'entry'; requestExit(); ok(!canRequestExit() && !requestExit(), 'while the way out runs: the sign is off and a second press does nothing');
process.exit(fail ? 1 : 0);
