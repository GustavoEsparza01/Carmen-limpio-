const { withAppBuildGradle } = require('expo/config-plugins');

const MARCA = 'CARMEN_UPLOAD_STORE_FILE';

// La APK de release se firma con la clave propia del proyecto, nunca con la de depuración.
// La ubicación y las contraseñas se leen de ~/.gradle/gradle.properties (fuera del repositorio):
//   CARMEN_UPLOAD_STORE_FILE, CARMEN_UPLOAD_STORE_PASSWORD, CARMEN_UPLOAD_KEY_ALIAS, CARMEN_UPLOAD_KEY_PASSWORD
// Sin ellas, el release falla en lugar de firmarse con otra clave. El development build no cambia.
module.exports = function firmaPropia(config) {
  return withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (gradle.includes(MARCA)) return c;

    const release = `
        release {
            if (findProperty('${MARCA}')) {
                storeFile file(findProperty('${MARCA}'))
                storePassword findProperty('CARMEN_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('CARMEN_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('CARMEN_UPLOAD_KEY_PASSWORD')
            }
        }`;
    const conFirma = gradle.replace(/(signingConfigs \{\s*debug \{[^}]*\})/, `$1${release}`);
    const conRelease = conFirma.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );
    if (conFirma === gradle || conRelease === conFirma) {
      throw new Error('firma-propia: build.gradle cambió de forma; revisa el plugin');
    }
    // Sin la clave, Gradle produciría una APK sin firmar: mejor detenerse con un mensaje claro.
    const revision = `
gradle.taskGraph.whenReady { grafo ->
    def esRelease = grafo.allTasks.any { it.project == project && it.name ==~ /(assemble|bundle|package)Release/ }
    if (esRelease && !findProperty('${MARCA}')) {
        throw new GradleException("Falta la clave de firma: define ${MARCA} y las otras tres en ~/.gradle/gradle.properties (ver docs/decisiones.md)")
    }
}
`;
    c.modResults.contents = conRelease + revision;
    return c;
  });
};
