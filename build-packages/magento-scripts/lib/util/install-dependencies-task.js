const os = require('os');
const logger = require('@scandipwa/scandipwa-dev-utils/logger');
const sleep = require('./sleep');
const { execCommandTask } = require('./exec-async-command');
const dependenciesForPlatforms = require('../config/dependencies-for-platforms');

/**
 * Install dependencies
 * @param {object} options
 * @param {keyof dependenciesForPlatforms} options.platform Platform
 * @param {string[]} options.dependenciesToInstall List of dependencies to install
 * @returns {import('listr2').ListrTask<import('../../typings/context').ListrContext>}
 */
const installDependenciesTask = (options) => ({
    title: 'Installing missing dependencies',
    task: async (ctx, task) => {
        const { dependenciesToInstall, platform } = options;
        const cmd = dependenciesForPlatforms[platform].installCommand(dependenciesToInstall.join(' '));
        const installCommand = logger.style.code(cmd);
        const dependenciesWordFormatter = `dependenc${dependenciesToInstall.length > 1 ? 'ies' : 'y'}`;
        task.title = `Installing missing dependencies: ${ logger.style.code(dependenciesToInstall.join(', ')) }`;
        task.output = `Missing ${ dependenciesWordFormatter } ${ logger.style.code(dependenciesToInstall.join(' ')) } detected!`;

        let promptSkipper = false;
        const timer = async () => {
            for (let i = 5 * 60; i !== 0; i--) {
                await sleep(1000);
                if (promptSkipper) {
                    return null;
                }
                task.title = `Checking ${platform} dependencies (${i} sec left...)`;
            }
            task.cancelPrompt();
            return 'timeout';
        };

        const installAnswer = await Promise.race([
            task.prompt({
                type: 'Select',
                message: `Do you want to install missing ${ dependenciesWordFormatter } now?`,
                name: 'installAnswer',
                choices: [
                    {
                        name: 'install',
                        message: `Install ${ dependenciesWordFormatter } now!`
                    },
                    {
                        name: 'not-install',
                        message: `Install ${ dependenciesWordFormatter } later, when I feel it.`
                    }
                ]
            }),
            timer()
        ]);

        promptSkipper = true;

        if (installAnswer === 'timeout') {
            throw new Error(`Timeout!

To install missing ${ dependenciesWordFormatter } manually, run the following command: ${ installCommand }`);
        }

        if (installAnswer === 'not-install') {
            throw new Error(`Okay, skipping ${ dependenciesWordFormatter } installation for now.

To install missing ${ dependenciesWordFormatter } manually, run the following command: ${ installCommand }`);
        }

        if (installAnswer === 'install') {
            // on macos we don't need sudo permissions to install dependencies, so every other platform required to do that
            if (platform !== 'darwin') {
                task.output = `Enter your sudo password! It's needed for ${ dependenciesWordFormatter } installation.`;
                task.output = logger.style.command(`>[sudo] password for ${ os.userInfo().username }:`);
            }

            return task.newListr(
                execCommandTask(cmd, {
                    callback: (t) => {
                        task.output = t;
                    },
                    pipeInput: true
                })
            );
        }
    },
    options: {
        bottomBar: 10
    }
});

module.exports = installDependenciesTask;
