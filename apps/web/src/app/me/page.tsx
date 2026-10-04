import type { Metadata } from "next";

import { SignIn } from "../../components/sign-in";
import type { MyBookingItem } from "../../lib/my-bookings";
import { createClient } from "../../lib/supabase/server";
import { MyBookings } from "./my-bookings";

export const metadata: Metadata = { title: "My bookings · Bookflow", robots: { index: false } };

export default async function MyBookingsPage(props: PageProps<"/me">) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[560px] pb-10">
        <SignIn
          title="See your bookings"
          lead="Sign in with the Google account or email you booked with."
          signInFailed={params.signin === "failed"}
        />
      </main>
    );
  }

  const { data, error } = await supabase.rpc("get_my_bookings");
  if (error) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-5 pt-[52px]">
        <h1 className="text-[32px] leading-10 font-bold">My bookings</h1>
        <p role="alert" className="mt-4 text-[15px] text-danger">
          Couldn&apos;t load your bookings. Check your connection and refresh.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[560px] pb-6">
      <MyBookings email={user.email ?? ""} bookings={(data ?? []) as unknown as MyBookingItem[]} />
    </main>
  );
}
