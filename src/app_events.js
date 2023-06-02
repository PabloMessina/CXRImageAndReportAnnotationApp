// Define enum of events
const APP_EVENTS = {
    LABEL_MOUSE_ENTER: 'label_mouse_enter',
    LABEL_MOUSE_LEAVE: 'label_mouse_leave',
    ANNOTATE_IMAGE: 'annotate_image',
    ANNOTATE_IMAGE_CUSTOM_LABEL: 'annotate_image_custom_label',
    POLYGONS_UPDATED: 'polygons_updated',
    CUSTOM_LABEL_NAME_CHANGED: 'custom_label_name_changed',
    HIGHLIGHT_UNUSED_REPORT_TEXT: 'highlight_unused_report_text',
    UNHIGHLIGHT_UNUSED_REPORT_TEXT: 'unhighlight_unused_report_text',
};

// console.log('App events: ', APP_EVENTS);

// Create object to store callbacks
const callbacks = {};
// iterate over string values of APP_EVENTS and create a set for each
Object.values(APP_EVENTS).forEach(event => callbacks[event] = new Set());
// console.log('Callbacks: ', callbacks);

// Define functions to subscribe and unsubscribe from events
function subscribe_to_event(event, callback) {
    // console.log(`Subscribing to event: ${event}`);
    callbacks[event].add(callback);
}
function unsubscribe_from_event(event, callback) {
    // console.log(`Unsubscribing from event: ${event}`);
    const size_before = callbacks[event].size;
    callbacks[event].delete(callback);
    const size_after = callbacks[event].size;
    if (size_before === size_after) {
        throw new Error(`Callback not found for event: ${event}, callback: ${callback}`);
    }
}

// Define function to emit events
function emit_event(event, ...args) {
    // console.log(`Emitting event ${event} for ${callbacks[event].size} callbacks`);
    callbacks[event].forEach(callback => callback(...args));
}

export { APP_EVENTS, subscribe_to_event, unsubscribe_from_event, emit_event };