const Y = require('yjs');
const { LeveldbPersistence } = require('y-leveldb');
const path = require('path');

// Create a Y.Doc
const ydoc = new Y.Doc();

// Shared data structures
const plans = ydoc.getArray('plans'); // Y.Array of Y.Map
const tasks = ydoc.getMap('tasks'); // Y.Map of Y.Map, keyed by task.id

let persistence;

function initialize(userDataPath) {
  const leveldbPath = path.join(userDataPath, 'p2p-storage');
  persistence = new LeveldbPersistence(leveldbPath, ydoc);
  return persistence;
}

// Export the shared data so other parts of the app can use it
module.exports = {
  ydoc,
  plans,
  tasks,
  initialize,
  getPersistence: () => persistence,
}; 