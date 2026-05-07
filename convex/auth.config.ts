export default {
  providers: [
    {
      domain: `https://api.workos.com/user_management/${process.env.VITE_WORKOS_CLIENT_ID}`,
      applicationID: process.env.VITE_WORKOS_CLIENT_ID,
    },
  ],
};
