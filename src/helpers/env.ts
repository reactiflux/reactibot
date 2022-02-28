const enum ENVIONMENTS {
  production = "production",
}

export const isProd = () => process.env.ENVIRONMENT === ENVIONMENTS.production;

console.log("Running as", isProd() ? "PRODUCTION" : "TEST", "environment");
