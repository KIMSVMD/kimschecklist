import ClientApp from "./client-app";

// Every non-API URL renders the existing single-page app; its own router (wouter) picks the screen.
export default function Page() {
  return <ClientApp />;
}
