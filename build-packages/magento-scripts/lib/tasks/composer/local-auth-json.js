const path = require('path');
const fs = require('fs');
const pathExists = require('../../util/path-exists');
const logger = require('@scandipwa/scandipwa-dev-utils/logger');

/**
 * @type {() => import('listr2').ListrTask<import('../../../typings/context').ListrContext>}
 */
const localAuthJson = () => ({
    task: async (ctx, task) => {
        if (await pathExists(path.join(process.cwd(), 'auth.json'))) {
            task.title = 'Using local auth.json';
            const localAuthJson = await fs.promises.readFile(path.join(process.cwd(), 'auth.json'));

            let localAuthJsonContent;
            try {
                localAuthJsonContent = JSON.parse(localAuthJson);
            } catch (e) {
                throw new Error(`Could not parse ./auth.json file as JSON!\n\n${e}`);
            }

            if (!localAuthJsonContent || !localAuthJsonContent['http-basic'] || !localAuthJsonContent['http-basic']['repo.magento.com']) {
                throw new Error(`Your ./auth.json file does not contain the ${ logger.style.misc("{ 'http-basic': { 'repo.magento.com': <> } }") } field.`);
            }

            process.env.COMPOSER_AUTH = localAuthJson;
        }
    },
    options: {
        showTimer: false
    }
});

module.exports = localAuthJson;
