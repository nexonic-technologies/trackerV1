const registry = {
  models: {},
  services: {},
  policies: {},
  providers: {},
  cronJobs: {}
};

/**
 * Register a component to the application registry.
 * @param {string} type - 'models', 'services', 'policies', 'providers', 'cronJobs'
 * @param {string} name - Component key name
 * @param {any} instance - The exported instance or class reference
 */
export function registerComponent(type, name, instance) {
  if (!registry[type]) {
    throw new Error(`[AppRegistry] Invalid component type: ${type}`);
  }
  registry[type][name] = instance;
}

/**
 * Get a registered component from the application registry.
 * @param {string} type - 'models', 'services', 'policies', 'providers', 'cronJobs'
 * @param {string} name - Component key name
 * @returns {any}
 */
export function getComponent(type, name) {
  const component = registry[type]?.[name];
  if (!component) {
    throw new Error(`[AppRegistry] Component "${name}" of type "${type}" not registered.`);
  }
  return component;
}

/**
 * Helper to retrieve a model synchronously.
 * @param {string} name
 * @returns {any}
 */
export function getModel(name) {
  return getComponent('models', name);
}

/**
 * Helper to retrieve a service hook synchronously.
 * @param {string} name
 * @returns {any}
 */
export function getService(name) {
  return getComponent('services', name);
}

/**
 * Helper to retrieve a provider reference synchronously.
 * @param {string} name
 * @returns {any}
 */
export function getProvider(name) {
  return getComponent('providers', name);
}
