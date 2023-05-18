// Define enum of events
const APP_EVENTS = {
    LABEL_MOUSE_ENTER: 'label_mouse_enter',
    LABEL_MOUSE_LEAVE: 'label_mouse_leave',
    ANNOTATE_IMAGE: 'annotate_image',
};

console.log('App events: ', APP_EVENTS);

// Create object to store callbacks
const callbacks = {};
// iterate over string values of APP_EVENTS and create a set for each
Object.values(APP_EVENTS).forEach(event => callbacks[event] = new Set());
console.log('Callbacks: ', callbacks);

// Define functions to subscribe and unsubscribe from events
function subscribe_to_event(event, callback) {
    console.log(`Subscribing to event: ${event}`);
    callbacks[event].add(callback);
}
function unsubscribe_from_event(event, callback) {
    console.log(`Unsubscribing from event: ${event}`);
    callbacks[event].delete(callback);
}

// Define function to emit events
function emit_event(event, ...args) {
    console.log(`Emitting event: ${event}`);
    callbacks[event].forEach(callback => callback(...args));
}

export { APP_EVENTS, subscribe_to_event, unsubscribe_from_event, emit_event };