const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** Google redirects back to the app through the reversed iOS client ID. */
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
  : null;

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }]] : []),
  ],
});
