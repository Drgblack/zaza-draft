export const revalidate = false
export const dynamic = "force-dynamic"

import HomeClient from "./(home)/HomeClient"

export default function Home() {
  return <HomeClient />
}
