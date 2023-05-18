class Store {
    constructor() {
        this.data = {};
    }
    set(key, value) {
        this.data[key] = value;
    }
    get(key) {
        return this.data[key];
    }
    has(key) {
        return this.data.hasOwnProperty(key);
    }
    getAll() {
        return this.data;
    }
    remove(key) {
        delete this.data[key];
    }
    clear() {
        this.data = {};
    }
}

const store = new Store();
export default store;