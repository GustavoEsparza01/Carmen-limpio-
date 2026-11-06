// npm los instala como dependencias de expo-router, pero la app no los usa.
// Sus rutas de compilación superan el límite de Windows; ver docs/decisiones.md.
module.exports = {
  dependencies: {
    'react-native-gesture-handler': { platforms: { android: null } },
    'react-native-reanimated': { platforms: { android: null } },
    'react-native-worklets': { platforms: { android: null } },
  },
};
