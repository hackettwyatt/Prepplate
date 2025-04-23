import { registerRootComponent } from 'expo';

import App from './App';  // Correct path if App.js is in the root directory


// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
