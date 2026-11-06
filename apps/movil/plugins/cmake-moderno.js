const { withAppBuildGradle } = require('expo/config-plugins');

const VERSION = '3.31.6';

// El ninja de CMake 3.22 no admite rutas largas en Windows y los módulos nativos las superan.
// Requiere LongPathsEnabled en Windows. Ver docs/decisiones.md.
module.exports = function cmakeModerno(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(VERSION)) {
      c.modResults.contents = c.modResults.contents.replace(
        /\nandroid \{/,
        `\nandroid {\n    externalNativeBuild { cmake { version "${VERSION}" } }`,
      );
    }
    return c;
  });
};
