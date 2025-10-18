/**
 * Global mock for redux-devtools-expo-dev-plugin
 * Prevents Redux DevTools from running in tests
 */

const devToolsEnhancer = () => (next: any) => next;

export default devToolsEnhancer;
