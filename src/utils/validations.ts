import * as yup from 'yup';
import type { ConfigOptions, PluginOptions, ShortcodeDef } from './types';
import type { RouteOptions } from '../routes/types';
import type { HookOptions } from '../hookInterface/types';
import hookInterface from '../hookInterface/hookInterface';

const shortcodeSchema = yup.object({
  shortcode: yup.string().required().label(`The 'name' of the shortcode. {{name /}}`),
  run: yup
    .mixed()
    .required()
    .test(
      'isFunction',
      'run() should be a function or async function',
      (value) => typeof value === 'function' || (typeof value === 'object' && value.then === 'function'),
    )
    .label(`A sync/async function that returns the html, css, js, and head to be added to the html.`),
});

const configSchema = yup.object({
  origin: yup.string().notRequired().default('').label(`The domain your site is hosted on. https://yourdomain.com.`),
  rootDir: yup.string().notRequired().default('process.cwd()').label('Here your package.json lives.'),
  distDir: yup
    .string()
    .notRequired()
    .default('public')
    .label('Where should files be written? This represents the "root" of your site and where your html will be built.'),
  srcDir: yup
    .string()
    .notRequired()
    .default('src')
    .label(
      "Where Elder.js should find it's expected file structure. If you are using a build step such as typescript on your project, you may need to edit this. ",
    ),
  debug: yup
    .object()
    .shape({
      stacks: yup.boolean().notRequired().default(false).label('Outputs details of stack processing in the console.'),
      hooks: yup.boolean().notRequired().default(false).label('Output details of hook execution in the console.'),
      shortcodes: yup
        .boolean()
        .notRequired()
        .default(false)
        .label('Output details of shortcode execution in the console.'),
      performance: yup
        .boolean()
        .notRequired()
        .default(false)
        .label('Outputs a detailed speed report on each pageload.'),
      build: yup.boolean().notRequired().default(false).label('Displays detailed build information for each worker.'),
      automagic: yup
        .boolean()
        .notRequired()
        .default(false)
        .label('Displays settings or actions that are automagically done to help with debugging.'),
    })
    .label('Offers various levels of debug logging.'),
  hooks: yup.object({
    disable: yup
      .array()
      .of(yup.string())
      .notRequired()
      .default([])
      .label(
        'This is an array of hooks to be excluded from execution. To be clear, this isn\'t the "hook" name found in the "hookInterface.ts" file but instead the name of the system, user, plugin, or route hook that is defined.  For instance if you wanted to by name to prevent the system hook that writes html to the public folder during builds from being run, you would add "internalWriteFile" to this array.',
      ),
  }),
  server: yup.object({
    prefix: yup.string().notRequired().default('').label(`If Elder.js should serve all pages with a prefix.`),
  }),
  build: yup.object({
    numberOfWorkers: yup
      .number()
      .notRequired()
      .default(-1)
      .label(
        `This controls the number of worker processes spun up during build. It accepts negative numbers to represent the number of cpus minus the given number. Or the total number of processes to spin up. `,
      ),
    shuffleRequests: yup
      .boolean()
      .notRequired()
      .default(false)
      .label(
        `If you have some pages that take longer to generate than others, you may want to shuffle your requests so they are spread out more evenly across processes when building.`,
      ),
  }),
  shortcodes: yup.object({
    openPattern: yup.string().default('{{').label('Opening pattern for identifying shortcodes in html output.'),
    closePattern: yup.string().default('}}').label('closing pattern for identifying shortcodes in html output.'),
  }),
  plugins: yup.object().default({}).label('Used to define Elder.js plugins.'),
});

const routeSchema = yup.object({
  template: yup.string().required().label('Svelte file for your route. Defaults to RouteName.svelte if not defined.'),
  all: yup
    .mixed()
    .required()
    .test(
      'isFunction',
      'all() should be a function or async function or an array',
      (value) =>
        typeof value === 'function' || Array.isArray(value) || (typeof value === 'object' && value.then === 'function'),
    )
    .label(`A sync/async function that returns an array of all of the 'request objects' for this route.`),
  permalink: yup
    .mixed()
    .required()
    .test(
      'isFunction',
      'Permalink should be a function or async function',
      (value) => typeof value === 'function' || (typeof value === 'object' && value.then === 'function'),
    )
    .label(
      'Sync function that turns request objects from the all() function into permalinks which are relative to the site root',
    ),
  data: yup
    .mixed()
    .notRequired()
    .default({})
    .label(`Async/sync function that returns a JS object. Can also be a plain JS object.`),
});

const pluginSchema = yup.object({
  name: yup.string().default('').label('The name of the plugin.'),
  description: yup.string().default('').label('A description of the plugin.'),
  init: yup
    .mixed()
    .notRequired()
    .label(
      `A sync function that handles the plugin init. Receives plugin definition. plugin.settings contains Elder.js config. plugin.config contains plugin config`,
    )
    .test(
      'isFunction',
      'Init should be a function or async function',
      (value) => typeof value === 'function' || (typeof value === 'object' && value.then === 'function'),
    ),
  routes: yup.object().notRequired().default({}).label('(optional) Any routes the plugin is adding.'),
  hooks: yup.array().required().default([]).label('An array of hooks.'),
  config: yup
    .object({})
    .default({})
    .notRequired()
    .label('(optional) An object of default configs. These will be used when none are set in their elder.config.js.'),
  shortcodes: yup.array().notRequired().default([]).label('Array of shortcodes'),
});

const hookSchema = yup
  .object({
    hook: yup
      .string()
      .required()
      .test('valid-hook', 'This is not a supported hook.', (value) =>
        hookInterface.find((supportedHook) => supportedHook.hook === value),
      )
      .label('The hook the defined "run" function should be executed on.'),
    name: yup.string().required().label('A user friendly name of the function to be run.'),
    description: yup.string().required().label('A description of what the function does.'),
    priority: yup
      .number()
      .positive()
      .integer()
      .max(100)
      .optional()
      .default(50)
      .label('The priority level a hook should run at. The highest priority is 100 and 1 is the lowest priority.'),
    run: yup
      .mixed()
      .defined()
      .label('The function to be run on the hook.')
      .test(
        'isFunction',
        'Run should be a function or async function',
        (value) => typeof value === 'function' || (typeof value === 'object' && value.then === 'function'),
      ),
    $$meta: yup.object({
      type: yup.string().required().label('What type of hook this is. Defined by Elder.js for debugging.'),
      addedBy: yup.string().required().label('Where the hook was added from. Defined by Elder.js for debugging.'),
    }),
  })
  .noUnknown(true);

function getDefaultConfig(): ConfigOptions {
  const validated = configSchema.cast();

  return validated;
}

// function validateConfig(config = {}) {
//   try {
//     configSchema.validateSync(config);
//     const validated: ConfigOptions = configSchema.cast(config);
//     return validated;
//   } catch (err) {
//     return false;
//   }
// }

function validateRoute(route, routeName: string): RouteOptions | false {
  try {
    routeSchema.validateSync(route);
    const validated = routeSchema.cast(route);
    return validated;
  } catch (err) {
    console.error(
      `Route "${routeName}" does not have the required fields and is disabled. Please let the author know`,
      err.errors,
      err.value,
    );
    return false;
  }
}

function validatePlugin(plugin): PluginOptions | false {
  try {
    pluginSchema.validateSync(plugin);
    const validated: PluginOptions = pluginSchema.cast(plugin);
    return validated;
  } catch (err) {
    console.error(
      `Plugin ${
        (plugin && plugin.$$meta && plugin.$$meta.addedBy) || ''
      } does not have the required fields. Please let the author know`,
      err.errors,
      err.value,
    );
    return false;
  }
}

function validateHook(hook): HookOptions | false {
  try {
    hookSchema.validateSync(hook);
    const validated = hookSchema.cast(hook);
    return validated;
  } catch (err) {
    if (hook && hook.$$meta && hook.$$meta.type === 'plugin') {
      console.error(
        `Plugin ${hook.$$meta.addedBy} uses a hook, but it is ignored due to error(s). Please create a ticket with that plugin so the author can investigate it.`,
        err.errors,
        err.value,
      );
    } else {
      console.error(`Hook ignored due to error(s).`, err.errors, err.value);
    }
    return false;
  }
}

function validateShortcode(shortcode): ShortcodeDef | false {
  try {
    shortcodeSchema.validateSync(shortcode);
    const validated = shortcodeSchema.cast(shortcode);
    return validated;
  } catch (err) {
    if (shortcode && shortcode.$$meta && shortcode.$$meta.type === 'plugin') {
      console.error(
        `Plugin ${shortcode.$$meta.addedBy} uses a shortcode, but it is ignored due to error(s). Please create a ticket with that plugin so the author can investigate it.`,
        err.errors,
        err.value,
      );
    } else {
      console.error(`Hook ignored due to error(s).`, err.errors, err.value);
    }
    return false;
  }
}

export {
  validateRoute,
  validatePlugin,
  validateHook,
  validateShortcode,
  // validateConfig,
  getDefaultConfig,
  configSchema,
  hookSchema,
  routeSchema,
  pluginSchema,
  shortcodeSchema,
};
