/** Words on the scroll road. Edit freely: plain language, short lines. No prices here, packages come from `@/data/packages`. */
export type StopId = 'lot' | 'subdivision' | 'city' | 'interstate';
export type Stop = { id: StopId; number: string; name: string; promise: string; blurb: string; bullets: string[]; comesTo: string; place: string };

export const STOPS: Stop[] = [
  { id: 'lot', number: '01', name: 'Parking Lot', promise: 'Start calm, start smooth.', blurb: 'An empty lot is the perfect first classroom. Get comfortable with the wheel, the pedals and the mirrors before the traffic ever shows up.', bullets: ['Seat, mirror and wheel setup', 'Smooth starts and gentle stops', 'Turning and backing into a space'], comesTo: 'We pick you up at home, work or school.', place: 'Your first klass' },
  { id: 'subdivision', number: '02', name: 'Subdivision', promise: 'Quiet streets, real habits.', blurb: 'Neighborhood streets teach the habits that matter: full stops, steady speed, and always scanning for kids, pets and parked cars.', bullets: ['Stop signs and right of way', 'Speed control and spacing', 'Scanning for people and pets'], comesTo: 'One on one coaching in a spotless ride.', place: 'Neighborhood' },
  { id: 'city', number: '03', name: 'City', promise: 'Signals, lanes and confidence.', blurb: 'Busy intersections, lane changes and tight parking. We build the calm decision making that busy roads ask for.', bullets: ['Intersections and left turns', 'Lane changes and merging', 'Street parking'], comesTo: 'Built around your schedule.', place: 'Downtown' },
  { id: 'interstate', number: '04', name: 'Interstate', promise: 'Highway ready.', blurb: 'Ramps, speed and space. Learn to merge, hold your lane and exit with confidence at highway speed.', bullets: ['On ramps and merging', 'Safe following distance', 'Passing and exits'], comesTo: 'Drive away a five star driver.', place: 'The open road' },
];

export const STEPS = [
  { n: '1', title: 'Pick your package', text: 'Choose the hours that fit you, from a single hour to a full program.' },
  { n: '2', title: 'Choose your time', text: 'Tell us when and where. We pick you up and drop you off.' },
  { n: '3', title: 'Drive like a five star', text: 'Practice real skills with a patient coach until the road feels like home.' },
];

export const PLACES = ['Pick up at home', 'Pick up at work', 'Pick up at school', 'Parking lots', 'Neighborhood streets', 'City traffic', 'The interstate', 'Road test practice', 'Permit to license'];
