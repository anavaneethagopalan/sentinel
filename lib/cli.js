const shell = require('shelljs');
const path = require('path');
const DockerCompose = require('./docker-compose');
const Integration = require('./integration');
const Npm = require('./npm');

class CLI {
    static init() {
        const root = path.join(__dirname, '..', 'integration');
        const npm = new Npm();
        npm.intializeRecursive(root);
    }

    static runCompose(composeCommand, composeArgs) {    
        const files = Integration.getFiles();
        const composeFiles = Integration.findCompose(files);
    
        if (composeCommand === undefined) {
            throw new Error('docker-compose command required. e.g. run-compose ps');
        }
        const dc = new DockerCompose(composeFiles, [], Integration.integrationDirectory());
        dc[composeCommand](...composeArgs);
    }

    static runCucumber(cucumberArgs) {
        const featureDir = process.env.FEATURE_DIR || './features/';    
        
        // 1. require support files for each module)
        let files = Integration.getFiles({ withRelativePaths: true });
        cucumberArgs.push(...Integration.findSupportJs(files)
                .reduce((a, f) => a.concat('--require', f), [])
                .concat('--require', featureDir)
                .concat('-t', '~@Template'));

        // 2. Bootstrap modules
        files = Integration.getFiles();
        Integration.findIntegration(files)
            .map((f) => {
                return require(f); // eslint-disable-line global-require
            })
            .filter(m => m.cucumberArgs)
            .forEach((m) => {
                cucumberArgs.push(...m.cucumberArgs());
            });
        
        const composeFiles = Integration.findCompose(files);
        const dc = new DockerCompose(composeFiles, [], Integration.integrationDirectory());
        dc.run('node', './node_modules/.bin/cucumber.js', ...cucumberArgs);
    }

    static startServices(userServices) {
        const additionalServices = Array.isArray(userServices) ? userServices : [];
        const files = Integration.getFiles();
        const composeFiles = Integration.findCompose(files)
            .concat(additionalServices);
        const dc = new DockerCompose(composeFiles, [], Integration.integrationDirectory());
        dc.up('--build', '-d');
    }

    static stopServices(userServices) {
        const additionalServices = Array.isArray(userServices) ? userServices : [];
        const files = Integration.getFiles();
        const composeFiles = Integration.findCompose(files)
            .concat(additionalServices);
        const dc = new DockerCompose(composeFiles, [], Integration.integrationDirectory());
        dc.down();
    }
}

module.exports = CLI;