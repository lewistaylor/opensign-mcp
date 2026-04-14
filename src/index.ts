import { getApiToken } from "./opensign.js";
import { createApp } from "./transport.js";

getApiToken();

const app = createApp();
const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
  console.log(`OpenSign MCP server listening on port ${PORT}`);
});
