import { redirect } from "next/navigation";

// De middleware bepaalt of dit /dashboard of /login wordt.
export default function Home() {
  redirect("/dashboard");
}
