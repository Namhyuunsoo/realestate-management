const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

module.exports = {
  mode: 'production',
  entry: {
    main: './app/static/js/main-new.js',
    auth: './app/static/js/modules/auth/auth.js',
    map: './app/static/js/modules/map/map-core.js'
  },
  output: {
    path: path.resolve(__dirname, 'app/static/js/dist'),
    filename: '[name].min.js',
    clean: true
  },
  plugins: [
    new (class {
      apply(compiler) {
        compiler.hooks.emit.tapAsync('ObfuscatorPlugin', (compilation, callback) => {
          const assets = compilation.assets;
          
          Object.keys(assets).forEach(filename => {
            if (filename.endsWith('.js')) {
              const asset = assets[filename];
              const source = asset.source();
              
              const obfuscated = JavaScriptObfuscator.obfuscate(source, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.4,
                debugProtection: true,
                debugProtectionInterval: 2000,
                disableConsoleOutput: true,
                identifierNamesGenerator: 'hexadecimal',
                log: false,
                numbersToExpressions: true,
                renameGlobals: false,
                selfDefending: true,
                simplify: true,
                splitStrings: true,
                splitStringsChunkLength: 5,
                stringArray: true,
                stringArrayCallsTransform: true,
                stringArrayEncoding: ['base64'],
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayShuffle: true,
                stringArrayWrappersCount: 2,
                stringArrayWrappersChainedCalls: true,
                stringArrayWrappersParametersMaxCount: 4,
                stringArrayWrappersType: 'function',
                stringArrayThreshold: 0.75,
                transformObjectKeys: true,
                unicodeEscapeSequence: false
              });
              
              assets[filename] = {
                source: () => obfuscated.getObfuscatedCode(),
                size: () => obfuscated.getObfuscatedCode().length
              };
            }
          });
          
          callback();
        });
      }
    })()
  ]
};

