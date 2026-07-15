import { Redirect } from "expo-router";

/** Client signup is handled on the sign-in page (toggle), matching the web /signIn flow. */
export default function SignUp() {
  return <Redirect href="/(auth)/signin?mode=signup" />;
}
