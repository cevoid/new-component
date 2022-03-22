#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const program = require('commander');

const {
  getConfig,
  buildPrettifier,
  logIntro,
  logItemCompletion,
  logConclusion,
  logError,
} = require('./helpers');
const {
  requireOptional,
  mkDirPromise,
  readFilePromiseRelative,
  writeFilePromise,
} = require('./utils');

// Load our package.json, so that we can pass the version onto `commander`.
const { version } = require('../package.json');

// Get the default config for this component (looks for local/global overrides,
// falls back to sensible defaults).
const config = getConfig();

// Convenience wrapper around Prettier, so that config doesn't have to be
// passed every time.
const prettify = buildPrettifier(config.prettierConfig);

program
  .version(version)
  .arguments('<componentName>')
  .option(
    '-t, --type <componentType>',
    'Type of React component to generate (default: "functional")',
    /^(class|pure-class|functional)$/i,
    config.type
  )
  .option(
    '-d, --dir <pathToDirectory>',
    'Path to the "components" directory (default: "src/components")',
    config.dir
  )
  .option(
    '-x, --extension <fileExtension>',
    'Which file extension to use for the component (default: "ts")',
    config.extension
  )
  .parse(process.argv);

const [componentName] = program.args;

// Find the path to the selected template file.
const templatePath = `./templates/${program.type}.js`;
const testTemplatePath = `./templates/test.js`;

// Get all of our file paths worked out, for the user's project.
const componentDir = `${program.dir}/${componentName}`;
const testDir = `${program.dir}/${componentName}/__test__`;
const filePath = `${componentDir}/${componentName}.${program.extension}x`;
const indexPath = `${componentDir}/index.${program.extension}`;
const helpersPath = `${componentDir}/${componentName}.helpers.${program.extension}`;
const testPath = `${componentDir}/__test__/${componentName}.test.${program.extension}`;

// Our index template is super straightforward, so we'll just inline it for now.
const indexTemplate = prettify(`\
export * from './${componentName}'
export { default } from './${componentName}'
`);

logIntro({ name: componentName, dir: componentDir, type: program.type });

// Check if componentName is provided
if (!componentName) {
  logError(
    `Sorry, you need to specify a name for your component like this: new-component <name>`
  );
  process.exit(0);
}

// Check to see if a directory at the given path exists
const fullPathToParentDir = path.resolve(program.dir);
if (!fs.existsSync(fullPathToParentDir)) {
  logError(
    `Sorry, you need to create a parent "components" directory.\n(new-component is looking for a directory at ${program.dir}).`
  );
  process.exit(0);
}

// Check to see if this component has already been created
const fullPathToComponentDir = path.resolve(componentDir);
if (fs.existsSync(fullPathToComponentDir)) {
  logError(
    `Looks like this component already exists! There's already a component at ${componentDir}.\nPlease delete this directory and try again.`
  );
  process.exit(0);
}

const run = async () => {
  try {
    await mkDirPromise(componentDir)
    logItemCompletion('Directory created.');

    // Component file
    const template = await readFilePromiseRelative(templatePath).then(template => template.replace(/COMPONENT_NAME/g, componentName))
    await writeFilePromise(filePath, prettify(template))
    logItemCompletion('Component built and saved to disk.');

    // Helpers file
    await writeFilePromise(helpersPath, prettify('export {}'))
    logItemCompletion('Helpers file built and saved to disk.');

    await writeFilePromise(indexPath, prettify(indexTemplate))
    logItemCompletion('Index file built and saved to disk.');

    // Test file
    await mkDirPromise(testDir)
    const testTemplate = await readFilePromiseRelative(testTemplatePath).then(template => template.replace(/COMPONENT_NAME/g, componentName))
    await writeFilePromise(testPath, prettify(testTemplate))
    logItemCompletion('Test file built and saved to disk.');

    logConclusion();
  } catch (error) {
    console.error(error);
  }
}

run()