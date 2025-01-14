const path = require('path');
const pathExists = require('../../util/path-exists');
const { execAsyncSpawn } = require('../../util/exec-async-command');
const shouldUseYarn = require('@scandipwa/scandipwa-dev-utils/should-use-yarn');

/**
 * @type {(theme: import('../../../typings/theme').Theme) => import('listr2').ListrTask<import('../../../typings/context').ListrContext>}
 */
const buildTheme = ({ themePath }) => ({
    title: `Building theme in ${themePath}`,
    task: async (ctx, task) => {
        const { verbose = false } = ctx;

        if (!await pathExists(path.join(themePath, 'node_modules'))) {
            task.output = 'Installing theme dependencies';
            await execAsyncSpawn(shouldUseYarn() ? 'yarn' : 'npm i', {
                cwd: path.join(process.cwd(), themePath),
                callback: !verbose ? undefined : (t) => {
                    task.output = t;
                }
            });
        }

        if (await pathExists(path.join(themePath, 'magento', 'Magento_Theme'))) {
            task.skip();
            return;
        }

        task.output = 'Building theme...';
        await execAsyncSpawn('BUILD_MODE=magento npm run build', {
            cwd: path.join(process.cwd(), themePath),
            callback: !verbose ? undefined : (t) => {
                task.output = t;
            }
        });
    },
    options: {
        bottomBar: 10
    }
});

module.exports = buildTheme;
