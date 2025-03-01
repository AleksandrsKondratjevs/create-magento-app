const path = require('path');
const getJsonfileData = require('../../util/get-jsonfile-data');
const pathExists = require('../../util/path-exists');
const symlinkTheme = require('./symlink-theme');
const installTheme = require('./install-theme');
const setupPersistedQuery = require('./setup-persisted-query');
const upgradeMagento = require('../magento/setup-magento/upgrade-magento');
const disablePageCache = require('../magento/setup-magento/disable-page-cache');
const buildTheme = require('./build-theme');

/**
 * @type {() => import('listr2').ListrTask<import('../../../typings/context').ListrContext>}
 */
const setupThemes = () => ({
    task: async (ctx, task) => {
        const { config: { baseConfig } } = ctx;
        const composerData = await getJsonfileData(path.join(baseConfig.magentoDir, 'composer.json'));
        const composerLocalPaths = Array.isArray(composerData.repositories)
            ? composerData.repositories.filter((repo) => repo.type === 'path')
            : Object.values(composerData.repositories).filter((repo) => repo.type === 'path');

        /**
         * @type {string[]}
         */
        const composerLocalPackagesPaths = [];
        for (const localPath of composerLocalPaths) {
            if (
                await pathExists(localPath.url)
                && await pathExists(path.join(process.cwd(), localPath.url, 'composer.json'))
                && await pathExists(path.join(process.cwd(), localPath.url, 'package.json'))
            ) {
                const localPathComposerData = await getJsonfileData(path.join(process.cwd(), localPath.url, 'composer.json'));
                if (composerData.require[localPathComposerData.name]) {
                    composerLocalPackagesPaths.push(localPath.url);
                }
            }
        }

        if (composerLocalPackagesPaths.length === 0) {
            task.skip();
            return;
        }

        const themes = await Promise.all(composerLocalPackagesPaths.map(async (themePath) => {
            let absoluteThemePath = path.join(process.cwd(), themePath);

            // check if path not relative
            if (!(await pathExists(path.join(absoluteThemePath, 'composer.json')))) {
                // if composer.json is not found, then it's not correct path
                // and we need to test if it's absolute one
                if (await pathExists(path.join(themePath, 'composer.json'))) {
                    // if so, use it as absolute path
                    absoluteThemePath = themePath;
                }
            } else {
                // path is relative, so we use it
                absoluteThemePath = themePath;
            }

            const composerData = await getJsonfileData(path.join(absoluteThemePath, 'composer.json'));

            if (!composerData) {
                throw new Error(`composer.json file not found in "${themePath}"`);
            }

            return {
                themePath,
                composerData,
                absoluteThemePath
            };
        }));

        return task.newListr(
            themes.map((theme) => ({
                title: `Theme from "${theme.themePath}"`,
                task: (subCtx, subTask) => subTask.newListr([
                    symlinkTheme(theme),
                    installTheme(theme),
                    buildTheme(theme)
                ])
            })).concat([
                upgradeMagento(),
                disablePageCache(),
                setupPersistedQuery()
            ])
        );
    }
});

module.exports = setupThemes;
