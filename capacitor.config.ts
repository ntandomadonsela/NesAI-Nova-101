const config = {
  appId: "za.co.nesai.student",
  appName: "NesAI Student",
  webDir: "mobile-dist/client",
  server: {
    androidScheme: "https",
  },
  plugins: {
    NativePurchases: {
      // Let the server validate each purchase before StoreKit/Play acknowledges it.
      autoFinishTransactions: false,
    },
  },
};

export default config;
