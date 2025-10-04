const { createApp } = require("./app");

const PORT = process.env.PORT || 3000;

async function startServer(port = PORT) {
  const app = createApp();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server gestart op poort ${port}`);
      resolve({ app, server });
    });

    server.on("error", (error) => {
      reject(error);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Serverstart mislukt", error);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };
