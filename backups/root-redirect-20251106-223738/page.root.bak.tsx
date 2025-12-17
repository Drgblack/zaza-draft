export const revalidate = false;

import HomeClient from "./(home)/HomeClient";

export default function Home() {
  return <HomeClient />;
}export const dynamic = "force-dynamic";
